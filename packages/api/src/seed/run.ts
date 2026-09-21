/**
 * Seed runner v3 — Nairobi Health Facilities Case
 * Migrate → Wipe → Insert Entities & Claims → Run Closed-Loop Recompute (Dimensions, Verdicts, Evidence Requests).
 */
import { createDb } from "@collective/db";
import { migrateDb } from "@collective/db/migrate";
import {
  actionItems,
  cases,
  claimCandidates,
  claimLinks,
  claims,
  documents,
  entities,
  entityAliases,
  entityRelations,
  evidenceRequests,
  fieldReports,
  ingestEvents,
  institutionDetails,
  organizationDetails,
  projectDetails,
  siteDetails,
  sources,
  verdicts,
} from "@collective/db/schema";

import { recomputeForSubject } from "../lib/loop";
import {
  seedActionItems,
  seedAliases,
  seedCase,
  seedClaimLinks,
  seedClaimsGumba,
  seedClaimsMamaLucy,
  seedClaimsPumwani,
  seedDocuments,
  seedEntities,
  seedRelations,
  seedReports,
  seedSources,
} from "./nairobi-v3";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL is required; seed the configured Neon database instead of a local database");
}
const db = createDb({ DATABASE_URL });

async function main() {
  console.log(`→ migrating (${DATABASE_URL})`);
  await migrateDb(db);

  console.log("→ wiping existing tables");
  for (const t of [
    ingestEvents,
    evidenceRequests,
    actionItems,
    verdicts,
    fieldReports,
    claimLinks,
    claims,
    claimCandidates,
    projectDetails,
    siteDetails,
    organizationDetails,
    institutionDetails,
    entityRelations,
    entityAliases,
    entities,
    cases,
    documents,
    sources,
  ]) {
    await db.delete(t);
  }

  const id = new Map<string, string>();

  console.log("→ inserting sources");
  for (const s of seedSources) {
    const { key, ...rest } = s;
    const [row] = await db.insert(sources).values(rest).returning();
    id.set(`source:${key}`, row!.id);
  }

  console.log("→ inserting documents");
  for (const d of seedDocuments) {
    const { key, sourceKey, publishedAt, ...rest } = d;
    const [row] = await db
      .insert(documents)
      .values({
        ...rest,
        publishedAt: publishedAt ?? null,
        sourceId: id.get(`source:${sourceKey}`)!,
      })
      .returning();
    id.set(`doc:${key}`, row!.id);
  }

  console.log("→ inserting case");
  {
    const { key, ...rest } = seedCase;
    const [row] = await db.insert(cases).values(rest).returning();
    id.set(`case:${key}`, row!.id);
  }

  console.log("→ inserting entities & type extensions");
  for (const e of seedEntities) {
    const [ent] = await db
      .insert(entities)
      .values({
        type: e.type,
        canonicalName: e.name,
        county: "county" in e ? (e as { county?: string }).county ?? "Nairobi City" : "Nairobi City",
      })
      .returning();
    id.set(`entity:${e.key}`, ent!.id);

    if (e.type === "project") {
      const caseId = id.get("case:case")!;
      await db.insert(projectDetails).values({
        entityId: ent!.id,
        caseId,
        sector: (e.details as { sector?: string }).sector ?? "health",
      });
    } else if (e.type === "site") {
      const details = e.details as {
        ward?: string;
        subCounty?: string;
        lat?: number;
        lng?: number;
        locationNote?: string;
      };
      await db.insert(siteDetails).values({
        entityId: ent!.id,
        ward: details.ward,
        subCounty: details.subCounty,
        lat: details.lat,
        lng: details.lng,
        locationNote: details.locationNote,
      });
    } else if (e.type === "organization") {
      const details = e.details as { role?: "contractor"; isUnnamed?: boolean };
      await db.insert(organizationDetails).values({
        entityId: ent!.id,
        role: details.role,
        isUnnamed: details.isUnnamed ?? false,
      });
    } else if (e.type === "institution") {
      const details = e.details as {
        kind: "county_exec" | "county_assembly" | "oversight" | "regulator" | "commission" | "cso";
        mandate?: string;
        atiEligible?: boolean;
        jurisdiction?: string;
      };
      await db.insert(institutionDetails).values({
        entityId: ent!.id,
        kind: details.kind,
        mandate: details.mandate,
        atiEligible: details.atiEligible ?? false,
        jurisdiction: details.jurisdiction ?? "Nairobi City County",
      });
    }
  }

  console.log("→ inserting entity aliases");
  for (const a of seedAliases) {
    const entityId = id.get(`entity:${a.entityKey}`)!;
    await db.insert(entityAliases).values({
      entityId,
      alias: a.alias,
      aliasNormalized: a.alias.toLowerCase().trim(),
    });
  }

  console.log("→ inserting entity relations");
  for (const r of seedRelations) {
    await db.insert(entityRelations).values({
      fromEntityId: id.get(`entity:${r.from}`)!,
      toEntityId: id.get(`entity:${r.to}`)!,
      relation: r.relation,
    });
  }

  console.log("→ inserting claims");
  const allClaims = [...seedClaimsPumwani, ...seedClaimsGumba, ...seedClaimsMamaLucy];
  for (const c of allClaims) {
    const subjectEntityId = id.get(`entity:${c.subjectKey}`)!;
    const documentId = id.get(`doc:${c.docKey}`)!;
    const objectEntityId = "objectKey" in c && c.objectKey ? id.get(`entity:${c.objectKey}`) ?? null : null;
    const valueNumeric = "valueNumeric" in c ? (c.valueNumeric as number) : null;
    const valueUnit = "valueUnit" in c ? (c.valueUnit as string) : null;
    const valueStatus = "valueStatus" in c ? (c.valueStatus as any) : null;

    const [row] = await db
      .insert(claims)
      .values({
        subjectEntityId,
        predicate: c.predicate,
        objectEntityId,
        valueNumeric,
        valueUnit,
        valueStatus,
        assertion: c.assertion,
        stage: c.stage,
        documentId,
        span: { excerpt: c.excerpt, page: 1 },
        observedAt: c.observedAt ?? null,
        extractionMethod: "manual",
        reviewState: "approved",
        reviewedBy: "seed-gate",
        reviewAction: "approved",
      })
      .returning();
    id.set(`claim:${c.key}`, row!.id);
  }

  console.log("→ inserting claim links");
  for (const l of seedClaimLinks) {
    const fromId = id.get(`claim:${l.from}`);
    const toId = id.get(`claim:${l.to}`);
    if (fromId && toId) {
      await db.insert(claimLinks).values({
        fromClaimId: fromId,
        toClaimId: toId,
        relation: l.relation,
        rationale: l.rationale,
        createdBy: "human",
      });
    }
  }

  console.log("→ inserting field reports");
  for (const r of seedReports) {
    const subjectEntityId = id.get(`entity:${r.subjectKey}`)!;
    await db.insert(fieldReports).values({
      subjectEntityId,
      observedStatus: r.observedStatus,
      comment: r.comment,
      capturedAt: new Date(r.capturedAt),
      clientUuid: crypto.randomUUID(),
      channel: "pwa",
      corroborationState: "unverified",
      isDemo: true,
    });
  }

  console.log("→ inserting action items");
  for (const a of seedActionItems) {
    const subjectEntityId = id.get(`entity:${a.subjectKey}`)!;
    const institutionEntityId = id.get(`entity:${a.institutionKey}`)!;
    await db.insert(actionItems).values({
      subjectEntityId,
      institutionEntityId,
      kind: a.kind,
      title: a.title,
      bodyTemplate: a.bodyTemplate,
      priority: a.priority,
      status: "open",
      generatedBy: "human",
    });
  }

  console.log("→ running closed-loop recompute pass for all 4 project entities");
  const projectEntityKeys = [
    "proj-lucky-summer",
    "proj-majengo",
    "proj-gumba",
    "proj-mama-lucy",
  ];
  for (const pk of projectEntityKeys) {
    const entityId = id.get(`entity:${pk}`)!;
    console.log(`   - recomputing ${pk} (${entityId})`);
    const res = await recomputeForSubject(db, entityId);
    console.log(`     verdicts: ${res.verdicts.length}, evidence requests: ${res.requests.length}`);
  }

  console.log("✓ Seed v3 complete. The evidence loop is closed and operational.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
