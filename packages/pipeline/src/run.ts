/**
 * Pipeline CLI.
 *   bun run src/run.ts ingest <url> <sourceKey> [title] [docType]
 *   bun run src/run.ts extract <documentId>          (requires GEMINI_API_KEY)
 *   bun run src/run.ts reconcile <caseSlug>
 *
 * DATABASE_URL: Neon/PostgreSQL connection string loaded by Varlock.
 */
import { createDb } from "@collective/db";
import { migrateDb } from "@collective/db/migrate";
import { eq } from "drizzle-orm";

import {
  cases,
  claimCandidates,
  documentPages,
  documents,
  entities,
  extractionRuns,
  ingestEvents,
  projectDetails,
  siteDetails,
  sources,
} from "@collective/db/schema";
import { recomputeForSubject } from "@collective/api/lib/loop";
import { ingestUrl } from "./ingest";
import { storageFromEnv } from "./storage";
import { createGeminiExtractor } from "./extract/gemini";
import { htmlToText } from "./extract/html";
import { validateCandidate, candidateFingerprint } from "./extract/validate";
import type { ClaimCandidate } from "./extract/schema";
import { isProjectEntity, loadResolvableEntities, resolveEntityName, resolutionJson } from "./resolve";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required; pipeline jobs run against Neon/PostgreSQL");
const db = createDb({ DATABASE_URL });
const storage = storageFromEnv();

async function cmdIngest(args: string[]) {
  const [url, sourceName, title, docType] = args;
  if (!url || !sourceName) throw new Error("usage: ingest <url> <sourceName> [title] [docType]");

  const [source] = await db.select().from(sources).where(eq(sources.name, sourceName));
  if (!source) throw new Error(`unknown source "${sourceName}" — register it first (sources table)`);

  const result = await ingestUrl(db, storage, {
    url,
    sourceId: source.id,
    title: title ?? url,
    docType: (docType as "news_article") ?? "news_article",
    notes: `ingested via pipeline CLI at ${new Date().toISOString()}`,
  });

  console.log(
    result.deduped
      ? `✓ deduped — identical bytes already vaulted (doc ${result.documentId}, sha ${result.sha256.slice(0, 12)}…)`
      : `✓ vaulted ${result.byteSize.toLocaleString()} bytes → doc ${result.documentId} (sha ${result.sha256.slice(0, 12)}…)`,
  );
}

async function cmdExtract(args: string[]) {
  const [documentId] = args;
  if (!documentId) throw new Error("usage: extract <documentId>");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set — extraction is disabled (AI proposes only when the key exists)");

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc) throw new Error(`document ${documentId} not found`);
  const bytes = doc.storageKey ? await storage.get(doc.storageKey) : null;
  if (!bytes) throw new Error("document bytes not found in vault");

  // PDF magic bytes (%PDF) → native document understanding; HTML → text layer.
  const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  const documentText = isPdf ? null : htmlToText(new TextDecoder().decode(bytes));
  if (documentText) {
    await db
      .insert(documentPages)
      .values({ documentId: doc.id, pageNumber: 1, text: documentText, charCount: documentText.length })
      .onConflictDoNothing();
    await db.update(documents).set({ pageCount: 1 }).where(eq(documents.id, doc.id));
  }

  const resolvableEntities = await loadResolvableEntities(db);
  const knownProjects = await db
    .select({
      id: entities.id,
      name: entities.canonicalName,
      ward: siteDetails.ward,
      subCounty: siteDetails.subCounty,
    })
    .from(entities)
    .innerJoin(projectDetails, eq(entities.id, projectDetails.entityId))
    .leftJoin(siteDetails, eq(entities.id, siteDetails.entityId));

  const extractor = createGeminiExtractor({ apiKey });
  let runStatus: "success" | "failed" | "partial" = "failed";
  let candidateCount = 0;

  try {
    const { result, usage } = await extractor.extract({
      documentText,
      fileData: isPdf ? bytes : undefined,
      fileMime: "application/pdf",
      sourceTitle: doc.title,
      knownProjects: knownProjects.map((p) => ({
        name: p.name,
        hints: [p.ward ?? "", p.subCounty ?? "", ...resolvableEntities.filter((entity) => entity.id === p.id).map((entity) => entity.name)],
      })),
    });

    // validate + dedupe, then write survivors as review-pending candidates
    const seen = new Set<string>();
    for (const c of result.candidates as ClaimCandidate[]) {
      const fp = candidateFingerprint(doc.id, c);
      if (seen.has(fp)) continue;
      seen.add(fp);
      const subjectResolution = resolveEntityName(c.subjectName, resolvableEntities);
      const objectResolution = resolveEntityName(c.objectName, resolvableEntities);
      if (documentText) {
        const outcome = validateCandidate(c, documentText);
        if (!outcome.valid) {
          console.log(`  ✗ dropped (${outcome.reason}): ${c.assertion.slice(0, 70)}…`);
          continue;
        }
      }

      candidateCount++;
      console.log(`  candidate: [${c.kind}] ${c.assertion.slice(0, 90)}…`);
      await db.insert(claimCandidates).values({
        subjectNameRaw: c.subjectName,
        subjectEntityId: subjectResolution.entityId,
        predicate: c.kind === "award_made" ? "contract_awarded_to" : c.kind,
        objectNameRaw: c.objectName,
        objectEntityId: objectResolution.entityId,
        valueNumeric: c.amountKes ? String(c.amountKes) : null,
        valueStatus: c.observedStatus,
        valueDate: c.eventDate,
        assertion: c.assertion,
        stage: c.stage,
        span: c.span,
        extractor: "llm",
        model: usage.model,
        promptVersion: "v2-assertion-graph",
        status: subjectResolution.entityId && isProjectEntity(subjectResolution.entityId, resolvableEntities)
          ? "pending"
          : "needs_review",
        validation: { spanVerified: Boolean(documentText), pageExists: c.span.page == null || c.span.page === 1 },
        resolution: resolutionJson(subjectResolution, objectResolution),
        fingerprint: fp,
        documentId: doc.id,
      });
    }
    runStatus = candidateCount > 0 ? "success" : "partial";
    await db.update(documents).set({ extractionState: candidateCount > 0 ? "extracted" : "failed" }).where(eq(documents.id, doc.id));

    await db.insert(extractionRuns).values({
      documentId: doc.id,
      extractor: "llm",
      model: usage.model,
      promptVersion: "v1-verbatim-span",
      tokensIn: usage.tokensIn,
      tokensOut: usage.tokensOut,
      durationMs: usage.durationMs,
      status: runStatus,
    });
    console.log(`✓ extraction ${runStatus}: ${candidateCount} candidates (usage: ${usage.tokensIn}/${usage.tokensOut} tokens, ${usage.durationMs}ms)`);
  } catch (e) {
    await db.update(documents).set({ extractionState: "failed" }).where(eq(documents.id, doc.id));
    await db.insert(extractionRuns).values({
      documentId: doc.id,
      extractor: "llm",
      status: "failed",
    });
    throw e;
  }
}

async function cmdReconcile(args: string[]) {
  const [slug] = args;
  if (!slug) throw new Error("usage: reconcile <caseSlug>");
  const [caseRow] = await db.select().from(cases).where(eq(cases.slug, slug));
  if (!caseRow) throw new Error(`case ${slug} not found`);
  const projectRows = await db
    .select({ entityId: projectDetails.entityId })
    .from(projectDetails)
    .where(eq(projectDetails.caseId, caseRow.id));
  for (const project of projectRows) {
    const result = await recomputeForSubject(db, project.entityId);
    console.log(`✓ ${project.entityId}: ${result.verdicts.length} verdicts, ${result.requests.length} open requests`);
  }
  void ingestEvents;
}

const [cmd, ...rest] = process.argv.slice(2);
const commands: Record<string, (args: string[]) => Promise<void>> = {
  ingest: cmdIngest,
  extract: cmdExtract,
  reconcile: cmdReconcile,
};

async function main() {
  if (!cmd || !commands[cmd]) {
    console.error("usage: run.ts <ingest|extract|reconcile> …");
    process.exit(1);
  }
  await migrateDb(db);
  await commands[cmd](rest);
  process.exit(0);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
