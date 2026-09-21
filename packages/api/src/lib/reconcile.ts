import { createHash } from "node:crypto";

import type { claims, fieldReports } from "@collective/db/schema";

/**
 * The reconciliation engine. Pure functions over approved claims + field reports.
 * No I/O, no LLM, no wall-clock unless injected. Deterministic:
 * same inputs → same verdicts → same inputsHash.
 *
 * Verdict semantics (per aspect):
 *  - corroborated:           ≥2 independent trust tiers agree
 *  - contradicted:           sources conflict, OR the record affirmatively establishes
 *                            non-delivery despite payments/claims against it
 *  - partially_corroborated: one strong source, or agreement without independence
 *  - unverifiable:           the public record cannot establish this aspect
 */

export type ClaimRow = typeof claims.$inferSelect;
export type ReportRow = typeof fieldReports.$inferSelect;

export type EnrichedClaim = ClaimRow & { sourceId: string; trustTier: string };

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
  kind: string;
  assertion: string;
  claimId: string;
};

const CURRENT_STATE_FRESHNESS_DAYS = 180;

function daysBetween(a: Date, b: Date) {
  return Math.abs(b.getTime() - a.getTime()) / 86_400_000;
}

function isStalledLike(status: string | null) {
  return (
    status === "stalled" ||
    status === "abandoned" ||
    status === "not_started" ||
    status === "unusable"
  );
}

const kes = (n: number) => `KSh ${n.toLocaleString("en-KE")}`;

export function reconcileProject(input: {
  projectId: string;
  claims: EnrichedClaim[];
  reports: ReportRow[];
  now: Date;
}): { verdicts: VerdictDraft[]; timeline: TimelineEvent[] } {
  const { claims, reports, now } = input;
  const verdicts: VerdictDraft[] = [];

  const byKind = (kind: ClaimRow["kind"]) => claims.filter((c) => c.kind === kind);
  const tiersOf = (cs: EnrichedClaim[]) => new Set(cs.map((c) => c.trustTier));

  // ── budget ────────────────────────────────────────────────────────────
  const budgetClaims = byKind("budget_allocated");
  if (budgetClaims.length === 0) {
    verdicts.push({
      aspect: "budget",
      verdict: "unverifiable",
      summary: "No budget allocation for this project appears in the ingested public record.",
      basisClaimIds: [],
      gaps: ["budget_line"],
    });
  }

  // ── award ─────────────────────────────────────────────────────────────
  const awardClaims = byKind("award_made");
  if (awardClaims.length > 0) {
    const independent = tiersOf(awardClaims).size >= 2;
    const amounts = new Set(
      awardClaims.filter((c) => c.amountKes != null).map((c) => c.amountKes),
    );
    const gaps: string[] = [];
    if (awardClaims.every((c) => !c.partyId || c.partyId === null)) gaps.push("contractor_identity");
    if (awardClaims.every((c) => !c.eventDate)) gaps.push("award_date");
    verdicts.push({
      aspect: "award",
      verdict:
        amounts.size > 1
          ? "contradicted"
          : independent
            ? "corroborated"
            : "partially_corroborated",
      summary: independent
        ? `Award of ${awardClaims[0]!.amountKes != null ? kes(awardClaims[0]!.amountKes) : "undisclosed value"} is reported by ${tiersOf(awardClaims).size} independent source tiers.`
        : "Award is documented by a single source tier only.",
      basisClaimIds: awardClaims.map((c) => c.id),
      gaps,
    });
  }

  // ── payments ──────────────────────────────────────────────────────────
  const paymentClaims = byKind("payment_made");
  const inspections = [...byKind("inspection_finding"), ...byKind("delivery_observed")];
  const stalledFindings = inspections.filter((c) => isStalledLike(c.observedStatus));
  const completionClaims = byKind("completion_claimed");
  const totalPaid = paymentClaims.reduce((s, c) => s + (c.amountKes ?? 0), 0);

  if (paymentClaims.length > 0) {
    verdicts.push({
      aspect: "payments",
      verdict: tiersOf(paymentClaims).size >= 2 ? "corroborated" : "partially_corroborated",
      summary: `Payments totaling ${kes(totalPaid)} are documented across ${new Set(paymentClaims.map((c) => c.documentId)).size} document(s).`,
      basisClaimIds: paymentClaims.map((c) => c.id),
      gaps: paymentClaims.every((c) => !c.eventDate) ? ["payment_schedule"] : [],
    });
  }
  // ── delivery ──────────────────────────────────────────────────────────
  const completionSaysDelivered = completionClaims.length > 0 && stalledFindings.length === 0;
  if (completionSaysDelivered && stalledFindings.length > 0) {
    verdicts.push({
      aspect: "delivery",
      verdict: "contradicted",
      summary: "A completion claim conflicts with inspection findings of non-delivery.",
      basisClaimIds: [...completionClaims, ...stalledFindings].map((c) => c.id),
      gaps: ["completion_certificate"],
    });
  } else if (stalledFindings.length > 0 && totalPaid > 0) {
    verdicts.push({
      aspect: "delivery",
      verdict: "contradicted",
      summary: `Payments of ${kes(totalPaid)} are recorded, but ${stalledFindings.length} inspection/observation finding(s) establish the project was not delivered.`,
      basisClaimIds: [...paymentClaims, ...stalledFindings].map((c) => c.id),
      gaps: ["completion_certificate", "current_status"],
    });
  } else if (stalledFindings.length > 0) {
    verdicts.push({
      aspect: "delivery",
      verdict: tiersOf(stalledFindings).size >= 2 ? "corroborated" : "partially_corroborated",
      summary: "The record consistently indicates the project was not delivered.",
      basisClaimIds: stalledFindings.map((c) => c.id),
      gaps: ["current_status"],
    });
  } else {
    verdicts.push({
      aspect: "delivery",
      verdict: "unverifiable",
      summary: "No inspection or observation in the record establishes delivery status.",
      basisClaimIds: [],
      gaps: ["inspection_evidence"],
    });
  }

  // ── current state (freshness-sensitive) ───────────────────────────────
  const recentEvidence = inspections.filter(
    (c) => c.eventDate && daysBetween(new Date(c.eventDate), now) <= CURRENT_STATE_FRESHNESS_DAYS,
  );
  const realReports = reports.filter((r) => !r.isDemo);
  if (recentEvidence.length === 0 && realReports.length === 0) {
    verdicts.push({
      aspect: "current_state",
      verdict: "unverifiable",
      summary: `Nothing in the record is newer than ${CURRENT_STATE_FRESHNESS_DAYS} days and no community reports exist. The current state on the ground is unknown.`,
      basisClaimIds: [],
      gaps: ["field_verification"],
    });
  } else {
    const reportStatuses = new Set(realReports.map((r) => r.observedStatus));
    verdicts.push({
      aspect: "current_state",
      verdict: realReports.length >= 2 && reportStatuses.size <= 1 ? "corroborated" : "partially_corroborated",
      summary: `Most recent evidence: ${recentEvidence[0]?.assertion ?? `${realReports.length} community report(s)`}`,
      basisClaimIds: recentEvidence.map((c) => c.id),
      gaps: realReports.length < 2 ? ["independent_field_reports"] : [],
    });
  }

  const timeline: TimelineEvent[] = claims
    .filter((c) => c.eventDate)
    .map((c) => ({
      date: c.eventDate as string,
      stage: c.stage,
      kind: c.kind,
      assertion: c.assertion,
      claimId: c.id,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { verdicts, timeline };
}

/** Stable hash of the inputs a verdict set was computed from — staleness detection. */
export function inputsHash(claimIds: string[], reportIds: string[]) {
  return createHash("sha256")
    .update([...claimIds].sort().join(","))
    .update("|")
    .update([...reportIds].sort().join(","))
    .digest("hex")
    .slice(0, 16);
}
