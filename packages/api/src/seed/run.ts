/**
 * Seed the Nairobi health-facilities case end-to-end:
 * migrate → wipe → insert corpus → run the reconciliation engine → snapshot verdicts.
 *
 * Run from apps/server (shares the server's PGlite data dir):
 *   bun run seed
 */
import { eq } from "drizzle-orm";

import { createDb } from "@collective/db";
import { migrateDb } from "@collective/db/migrate";
import {
  cases,
  claimLinks,
  claims,
  documents,
  fieldReports,
  ingestEvents,
  institutions,
  nextSteps,
  parties,
  projects,
  sources,
  verdicts,
} from "@collective/db/schema";

import { inputsHash, reconcileProject } from "../lib/reconcile";
import { seedInstitutions, seedNextSteps } from "./data-actions";
import { seedClaimsMamaLucy, seedClaimLinks } from "./data-claims-mamalucy";
import { seedClaimsPumwani, seedClaimsGumba } from "./data-claims-pumwani";
import {
  seedCase,
  seedDocuments,
  seedParties,
  seedProjects,
  seedReports,
  seedSources,
} from "./data-core";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./local.db";
const db = createDb({ DATABASE_URL });

async function main() {
  console.log(`→ migrating (${DATABASE_URL})`);
  await migrateDb(db, DATABASE_URL);

  console.log("→ wiping existing data");
  for (const t of [
    verdicts, nextSteps, fieldReports, claimLinks, claims,
    projects, cases, parties, documents, sources, institutions, ingestEvents,
  ]) {
    await db.delete(t);
  }

  const id = new Map<string, string>();

  console.log("→ inserting sources/documents/case/projects/parties");
  for (const s of seedSources) {
    const [row] = await db.insert(sources).values(s).returning();
    id.set(`source:${s.key}`, row!.id);
  }
  for (const d of seedDocuments) {
    const { key, sourceKey, ...rest } = d;
    const [row] = await db
      .insert(documents)
      .values({ ...rest, sourceId: id.get(`source:${sourceKey}`)! })
      .returning();
    id.set(`doc:${key}`, row!.id);
  }
  {
    const { key, ...rest } = seedCase;
    const [row] = await db.insert(cases).values(rest).returning();
    id.set(`case:${key}`, row!.id);
  }
  for (const p of seedProjects) {
    const { key, ...rest } = p;
    const [row] = await db
      .insert(projects)
      .values({ ...rest, caseId: id.get("case:case")! })
      .returning();
    id.set(`project:${key}`, row!.id);
  }
  for (const p of seedParties) {
    const { key, ...rest } = p;
    const [row] = await db.insert(parties).values(rest).returning();
    id.set(`party:${key}`, row!.id);
  }
  for (const i of seedInstitutions) {
    const { key, ...rest } = i;
    const [row] = await db.insert(institutions).values(rest).returning();
    id.set(`inst:${key}`, row!.id);
  }

  console.log("→ inserting claims + links");
  const allClaims = [...seedClaimsPumwani, ...seedClaimsGumba, ...seedClaimsMamaLucy];
  for (const c of allClaims) {
    const { key, projectKey, docKey, partyKey, excerpt, ...rest } = c;
    const [row] = await db
      .insert(claims)
      .values({
        ...rest,
        projectId: id.get(`project:${projectKey}`)!,
        documentId: id.get(`doc:${docKey}`)!,
        partyId: partyKey ? id.get(`party:${partyKey}`)! : null,
        span: { page: null, excerpt },
        extractionMethod: "manual",
        reviewState: "approved",
        confidence: "1.00",
      })
      .returning();
    id.set(`claim:${key}`, row!.id);
  }
  for (const l of seedClaimLinks) {
    await db.insert(claimLinks).values({
      fromClaimId: id.get(`claim:${l.from}`)!,
      toClaimId: id.get(`claim:${l.to}`)!,
      relation: l.relation,
      rationale: l.rationale,
      createdBy: "human",
    });
  }

  console.log("→ inserting demo field reports + next steps");
  for (const r of seedReports) {
    await db.insert(fieldReports).values({
      projectId: id.get(`project:${r.projectKey}`)!,
      observedStatus: r.observedStatus,
      comment: r.comment,
      capturedAt: new Date(r.capturedAt),
      clientUuid: crypto.randomUUID(),
      channel: "pwa",
      isDemo: true,
    });
  }
  for (const n of seedNextSteps) {
    await db.insert(nextSteps).values({
      projectId: id.get(`project:${n.projectKey}`)!,
      institutionId: id.get(`inst:${n.institutionKey}`)!,
      kind: n.kind,
      title: n.title,
      bodyTemplate: n.bodyTemplate,
      priority: n.priority,
    });
  }

  console.log("→ reconciling (engine, deterministic)");
  const now = new Date();
  for (const p of seedProjects) {
    const projectId = id.get(`project:${p.key}`)!;
    const enriched = await db
      .select({
        claim: claims,
        sourceId: documents.sourceId,
        trustTier: sources.trustTier,
      })
      .from(claims)
      .innerJoin(documents, eq(claims.documentId, documents.id))
      .innerJoin(sources, eq(documents.sourceId, sources.id))
      .where(eq(claims.projectId, projectId));
    const rows = enriched.map((r) => ({ ...r.claim, sourceId: r.sourceId, trustTier: r.trustTier }));
    const reportRows = await db
      .select()
      .from(fieldReports)
      .where(eq(fieldReports.projectId, projectId));

    const { verdicts: drafts } = reconcileProject({ projectId, claims: rows, reports: reportRows, now });
    const hash = inputsHash(rows.map((c) => c.id), reportRows.map((r) => r.id));
    for (const v of drafts) {
      await db.insert(verdicts).values({ projectId, ...v, inputsHash: hash });
      console.log(`   ${p.key} · ${v.aspect} → ${v.verdict}`);
    }
  }

  await db.insert(ingestEvents).values({
    actor: "system",
    action: "seed",
    entityType: "case",
    entityId: id.get("case:case")!,
    detail: { claims: allClaims.length, links: seedClaimLinks.length },
  });

  console.log("✓ seed complete");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
