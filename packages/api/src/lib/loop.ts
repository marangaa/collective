import { and, eq, inArray, or } from "drizzle-orm";

import type { Database } from "@collective/db";
import {
  claimLinks,
  claims,
  documents,
  entities,
  evidenceRequests,
  fieldReports,
  ingestEvents,
  sources,
  verdicts,
} from "@collective/db/schema";

import { computeDimensions } from "./dimensions";
import { generateEvidenceRequests } from "./evidence-requests";
import { inputsHash, reconcileSubject, type EnrichedClaim } from "./reconcile";

/**
 * The closed loop. recomputeForSubject = the full analysis pass
 * (dimensions → verdicts → requests). onObservationSubmitted = the community
 * leg (observation → claim → recompute). Deterministic and idempotent.
 */

export async function enrichClaims(db: Database, subjectEntityId: string): Promise<EnrichedClaim[]> {
  const rows = await db
    .select({
      claim: claims,
      sourceId: documents.sourceId,
      trustTier: sources.trustTier,
      sourceType: sources.type,
    })
    .from(claims)
    .leftJoin(documents, eq(claims.documentId, documents.id))
    .leftJoin(sources, eq(documents.sourceId, sources.id))
    .where(and(eq(claims.subjectEntityId, subjectEntityId), eq(claims.reviewState, "approved")));

  return rows.map((r) => ({
    ...r.claim,
    sourceId: r.sourceId,
    trustTier: r.trustTier,
    sourceType: r.sourceType,
    strength: (r.claim.dimensions as { strength?: number } | null)?.strength ?? 0.6,
  }));
}

/** Recompute dimensions for every approved claim of a subject and persist them. */
export async function refreshDimensions(db: Database, subjectEntityId: string) {
  const enriched = await enrichClaims(db, subjectEntityId);
  const links = enriched.length
    ? await db
        .select()
        .from(claimLinks)
        .where(or(inArray(claimLinks.fromClaimId, enriched.map((c) => c.id)), inArray(claimLinks.toClaimId, enriched.map((c) => c.id))))
    : [];
  const reportRows = await db.select().from(fieldReports).where(eq(fieldReports.subjectEntityId, subjectEntityId));
  const reportsWithPhotos = new Set(
    reportRows.filter((report) => Array.isArray(report.photoKeys) && report.photoKeys.length > 0).map((report) => report.id),
  );

  const echoCounts = new Map<string, number>();
  for (const c of enriched) {
    const cluster = new Set<string>([c.id]);
    for (const l of links) {
      if (l.relation !== "same_finding") continue;
      if (l.fromClaimId === c.id) cluster.add(l.toClaimId);
      if (l.toClaimId === c.id) cluster.add(l.fromClaimId);
    }
    echoCounts.set(c.id, cluster.size);
  }

  for (const c of enriched) {
    const samePredicate = enriched.filter((o) => o.id !== c.id && o.predicate === c.predicate);
    const conflictCount = samePredicate.filter((o) => {
      if (c.valueNumeric != null && o.valueNumeric != null) return c.valueNumeric !== o.valueNumeric;
      if (c.valueStatus && o.valueStatus) return c.valueStatus !== o.valueStatus;
      return false;
    }).length;

    const dims = computeDimensions({
      predicate: c.predicate,
      stage: c.stage,
      span: c.span,
      extractionMethod: c.extractionMethod,
      reviewState: c.reviewState,
      observedAt: c.observedAt,
      publishedAt: c.publishedAt,
      sourceTrustTier: c.trustTier,
      sourceType: c.sourceType,
      fromFieldReport: c.fieldReportId != null,
      hasPhoto: c.fieldReportId ? reportsWithPhotos.has(c.fieldReportId) : false,
      echoCount: echoCounts.get(c.id) ?? 1,
      conflictCount,
    });

    await db.update(claims).set({ dimensions: dims }).where(eq(claims.id, c.id));
  }
  return enriched.length;
}

export async function recomputeForSubject(db: Database, subjectEntityId: string) {
  await refreshDimensions(db, subjectEntityId);

  const enriched = await enrichClaims(db, subjectEntityId);
  const links = enriched.length
    ? await db
        .select()
        .from(claimLinks)
        .where(or(inArray(claimLinks.fromClaimId, enriched.map((c) => c.id)), inArray(claimLinks.toClaimId, enriched.map((c) => c.id))))
    : [];
  const reports = await db.select().from(fieldReports).where(eq(fieldReports.subjectEntityId, subjectEntityId));

  const { verdicts: drafts } = reconcileSubject({
    subjectEntityId,
    claims: enriched,
    reports,
    links,
    now: new Date(),
  });

  const hash = inputsHash(enriched.map((c) => c.id), reports.map((r) => r.id));
  const existingSnapshot = await db
    .select({ id: verdicts.id })
    .from(verdicts)
    .where(and(eq(verdicts.subjectEntityId, subjectEntityId), eq(verdicts.inputsHash, hash)))
    .limit(1);
  if (existingSnapshot.length === 0) {
    for (const v of drafts) {
      await db.insert(verdicts).values({ subjectEntityId, ...v, inputsHash: hash });
    }
  }

  // regenerate open engine requests from the latest conflicts (keep fulfilled history)
  const [entity] = await db.select().from(entities).where(eq(entities.id, subjectEntityId));
  const requests = generateEvidenceRequests(drafts, entity?.canonicalName ?? "this subject");
  const open = await db
    .select()
    .from(evidenceRequests)
    .where(and(eq(evidenceRequests.subjectEntityId, subjectEntityId), eq(evidenceRequests.status, "open")));
  for (const r of open) {
    if (r.generatedBy === "engine") await db.delete(evidenceRequests).where(eq(evidenceRequests.id, r.id));
  }
  for (const d of requests) {
    await db.insert(evidenceRequests).values({ subjectEntityId, ...d, generatedBy: "engine" });
  }

  await db.insert(ingestEvents).values({
    actor: "system",
    action: "recompute",
    entityType: "entity",
    entityId: subjectEntityId,
    detail: { verdicts: drafts.length, requests: requests.length, inputsHash: hash },
  });

  return { verdicts: drafts, requests };
}

/**
 * The community leg of the loop: an observation becomes a claim, then the
 * subject's verdicts and evidence requests are recomputed. Idempotent on
 * field report id (existing claim for the report short-circuits creation).
 */
export async function onObservationSubmitted(db: Database, fieldReportId: string) {
  const [report] = await db.select().from(fieldReports).where(eq(fieldReports.id, fieldReportId));
  if (!report) throw new Error(`field report ${fieldReportId} not found`);

  const existing = await db.select().from(claims).where(eq(claims.fieldReportId, fieldReportId));
  if (existing.length === 0) {
    await db.insert(claims).values({
      subjectEntityId: report.subjectEntityId,
      predicate: "observed_status",
      valueStatus: report.observedStatus,
      assertion: report.comment?.trim()
        ? `Community observation: ${report.comment.trim()}`
        : `Community observation: status reported as ${report.observedStatus}.`,
      stage: "completion",
      fieldReportId: report.id,
      span: { excerpt: report.comment?.trim() || "structured observation (no free text)" },
      observedAt: (report.capturedAt ?? report.submittedAt).toISOString().slice(0, 10),
      extractionMethod: "manual",
      reviewState: "approved",
      reviewedBy: "observation-gate",
      reviewAction: "approved",
    });
  }

  // corroboration bookkeeping: ≥2 non-demo reports agreeing on status → corroborated
  const siblings = await db
    .select()
    .from(fieldReports)
    .where(and(eq(fieldReports.subjectEntityId, report.subjectEntityId), eq(fieldReports.isDemo, false)));
  const agreeing = siblings.filter((r) => r.observedStatus === report.observedStatus);
  if (agreeing.length >= 2) {
    await db
      .update(fieldReports)
      .set({ corroborationState: "corroborated" })
      .where(inArray(fieldReports.id, agreeing.map((r) => r.id)));
  }

  return recomputeForSubject(db, report.subjectEntityId);
}

