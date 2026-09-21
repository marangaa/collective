import { createHash } from "node:crypto";

import type { claims, fieldReports } from "@collective/db/schema";

/**
 * The reconciliation engine — entity-centric, deterministic, no I/O, no LLM.
 * Verdict semantics per aspect:
 *  - corroborated:           ≥2 independent same_finding clusters agree (one ≥0.7 strength)
 *  - contradicted:           sources conflict, or the record establishes non-delivery despite payments
 *  - partially_corroborated: one strong source, or agreement without independence
 *  - unverifiable:           the public record cannot establish this aspect
 */

export type ClaimRow = typeof claims.$inferSelect;
export type ReportRow = typeof fieldReports.$inferSelect;
export type EnrichedClaim = ClaimRow & {
  sourceId?: string | null;
  trustTier?: string | null;
  sourceType?: string | null;
  strength?: number | null;
};

export type VerdictDraft = {
  aspect: "budget" | "award" | "payments" | "delivery" | "current_state";
  verdict: "corroborated" | "contradicted" | "unverifiable" | "partially_corroborated";
  summary: string;
  basisClaimIds: string[];
  gaps: string[];
};

export type TimelineEvent = {
  date: string;
  stage: string;
  predicate: string;
  assertion: string;
  claimId: string;
};

const FRESH_DAYS = 180;
const kes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;
const days = (a: Date, b: Date) => Math.abs(b.getTime() - a.getTime()) / 86_400_000;

function isStalledLike(s: string | null) {
  return s === "stalled" || s === "abandoned" || s === "not_started" || s === "unusable";
}

/** same_finding clusters — an echo is not a source (union-find over links). */
function buildClusters(ids: string[], links: { fromClaimId: string; toClaimId: string; relation: string }[]) {
  const parent = new Map<string, string>(ids.map((i) => [i, i]));
  const find = (x: string): string => {
    let r = x;
    while (parent.get(r) !== r) r = parent.get(r)!;
    parent.set(x, r);
    return r;
  };
  for (const l of links) {
    if (l.relation !== "same_finding") continue;
    if (!parent.has(l.fromClaimId) || !parent.has(l.toClaimId)) continue;
    parent.set(find(l.fromClaimId), find(l.toClaimId));
  }
  return (id: string) => find(id);
}

export function reconcileSubject(input: {
  subjectEntityId: string;
  claims: EnrichedClaim[];
  reports: ReportRow[];
  links: { fromClaimId: string; toClaimId: string; relation: string }[];
  now: Date;
}): { verdicts: VerdictDraft[]; timeline: TimelineEvent[] } {
  const { claims: all, reports, links, now } = input;
  const verdicts: VerdictDraft[] = [];
  const clusterOf = buildClusters(all.map((c) => c.id), links);
  const sameFindingIds = new Set(
    links.filter((link) => link.relation === "same_finding").flatMap((link) => [link.fromClaimId, link.toClaimId]),
  );
  const pred = (p: string) => all.filter((c) => c.predicate === p);
  // Claims in the same explicit finding cluster are one finding. Unlinked claims
  // from the same source are also not treated as independent corroboration.
  const findingKey = (claim: EnrichedClaim) =>
    sameFindingIds.has(claim.id) ? `cluster:${clusterOf(claim.id)}` : `source:${claim.sourceId ?? claim.documentId ?? claim.id}`;
  const findingCount = (cs: EnrichedClaim[]) => new Set(cs.map(findingKey)).size;
  const anyStrong = (cs: EnrichedClaim[]) => cs.some((c) => (c.strength ?? 0.6) >= 0.7);

  // ── budget ────────────────────────────────────────────────────────────
  const budget = pred("budget_allocated");
  if (budget.length === 0) {
    verdicts.push({
      aspect: "budget", verdict: "unverifiable",
      summary: "No budget allocation for this subject appears in the ingested record.",
      basisClaimIds: [], gaps: ["budget_line"],
    });
  } else {
    const amounts = new Set(budget.filter((c) => c.valueNumeric != null).map((c) => c.valueNumeric));
    const corroborated = findingCount(budget) >= 2 && anyStrong(budget);
    verdicts.push({
      aspect: "budget",
      verdict: amounts.size > 1 ? "contradicted" : corroborated ? "corroborated" : "partially_corroborated",
      summary: `Budget evidence records ${amounts.size > 0 ? kes(Number([...amounts][0])) : "an allocation"}.`,
      basisClaimIds: budget.map((c) => c.id),
      gaps: corroborated ? [] : ["independent_budget_record"],
    });
  }

  // ── award ─────────────────────────────────────────────────────────────
  const award = pred("contract_awarded_to");
  const values = pred("contract_value");
  if (award.length > 0 || values.length > 0) {
    const cs = [...award, ...values];
    const independent = findingCount(cs) >= 2 && anyStrong(cs);
    const amounts = new Set(values.filter((c) => c.valueNumeric != null).map((c) => c.valueNumeric));
    const gaps: string[] = [];
    if (!independent) gaps.push("independent_award_record");
    if (award.every((c) => !c.objectEntityId)) gaps.push("contractor_identity");
    const amt = values[0]?.valueNumeric;
    verdicts.push({
      aspect: "award",
      verdict: amounts.size > 1 ? "contradicted" : independent ? "corroborated" : "partially_corroborated",
      summary: independent
        ? `Award${amt ? ` of ${kes(amt)}` : ""} established by ${findingCount(cs)} independent findings.`
        : "Award traces to a single underlying finding — the original tender/award record is not in the corpus.",
      basisClaimIds: cs.map((c) => c.id), gaps,
    });
  }

  // ── payments ──────────────────────────────────────────────────────────
  const payments = pred("payment_made");
  const paymentRepresentatives = new Map<string, EnrichedClaim>();
  for (const payment of payments) {
    if (!paymentRepresentatives.has(findingKey(payment))) paymentRepresentatives.set(findingKey(payment), payment);
  }
  const totalPaid = [...paymentRepresentatives.values()].reduce((s, c) => s + (c.valueNumeric ?? 0), 0);
  if (payments.length > 0) {
    verdicts.push({
      aspect: "payments",
      verdict: findingCount(payments) >= 2 && anyStrong(payments) ? "corroborated" : "partially_corroborated",
      summary: `Payments totaling ${kes(totalPaid)} documented across ${new Set(payments.map((c) => c.documentId ?? c.sourceId)).size} source(s).`,
      basisClaimIds: payments.map((c) => c.id),
      gaps: payments.every((c) => !c.observedAt) ? ["payment_schedule"] : [],
    });
  }
  // ── delivery ──────────────────────────────────────────────────────────
  const stallClaims = all.filter((c) => isStalledLike(c.valueStatus) || c.predicate === "demolished");
  const completion = [...pred("completion_claimed"), ...pred("commissioned")];
  if (completion.length > 0 && stallClaims.length > 0) {
    verdicts.push({
      aspect: "delivery", verdict: "contradicted",
      summary: "A completion claim conflicts with inspection/observation findings of non-delivery.",
      basisClaimIds: [...completion, ...stallClaims].map((c) => c.id),
      gaps: ["completion_certificate"],
    });
  } else if (stallClaims.length > 0 && totalPaid > 0) {
    verdicts.push({
      aspect: "delivery", verdict: "contradicted",
      summary: `Payments of ${kes(totalPaid)} recorded, but ${stallClaims.length} finding(s) establish the project was not delivered.`,
      basisClaimIds: [...payments, ...stallClaims].map((c) => c.id),
      gaps: ["completion_certificate", "current_status"],
    });
  } else if (stallClaims.length > 0) {
    verdicts.push({
      aspect: "delivery",
      verdict: findingCount(stallClaims) >= 2 && anyStrong(stallClaims) ? "corroborated" : "partially_corroborated",
      summary: "The record consistently indicates the project was not delivered.",
      basisClaimIds: stallClaims.map((c) => c.id),
      gaps: ["current_status"],
    });
  } else {
    verdicts.push({
      aspect: "delivery", verdict: "unverifiable",
      summary: "No inspection or observation in the record establishes delivery status.",
      basisClaimIds: [], gaps: ["inspection_evidence"],
    });
  }

  // ── current state (freshness-sensitive) ───────────────────────────────
  const recent = all.filter((c) => c.observedAt && days(new Date(c.observedAt), now) <= FRESH_DAYS);
  const realReports = reports.filter((r) => !r.isDemo);
  if (recent.length === 0 && realReports.length === 0) {
    verdicts.push({
      aspect: "current_state", verdict: "unverifiable",
      summary: `Nothing in the record is newer than ${FRESH_DAYS} days and no community reports exist. Current state on the ground is unknown.`,
      basisClaimIds: [], gaps: ["field_verification"],
    });
  } else {
    const statuses = new Set(realReports.map((r) => r.observedStatus));
    verdicts.push({
      aspect: "current_state",
      verdict: realReports.length >= 2 && statuses.size <= 1 ? "corroborated" : "partially_corroborated",
      summary: `Most recent evidence: ${recent[0]?.assertion ?? `${realReports.length} community report(s)`}`,
      basisClaimIds: recent.map((c) => c.id),
      gaps: realReports.length < 2 ? ["independent_field_reports"] : [],
    });
  }

  const timeline: TimelineEvent[] = all
    .filter((c) => c.observedAt ?? c.publishedAt)
    .map((c) => ({
      date: (c.observedAt ?? c.publishedAt) as string,
      stage: c.stage,
      predicate: c.predicate,
      assertion: c.assertion,
      claimId: c.id,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { verdicts, timeline };
}

export function inputsHash(claimIds: string[], reportIds: string[]) {
  return createHash("sha256")
    .update([...claimIds].sort().join(","))
    .update("|")
    .update([...reportIds].sort().join(","))
    .digest("hex")
    .slice(0, 16);
}

