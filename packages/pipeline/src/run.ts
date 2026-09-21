/**
 * Pipeline CLI.
 *   bun run src/run.ts ingest <url> <sourceKey> [title] [docType]
 *   bun run src/run.ts extract <documentId>          (requires GEMINI_API_KEY)
 *   bun run src/run.ts reconcile <caseSlug>
 *
 * DATABASE_URL: postgres (Neon) for prod, file:./local.db for offline dev.
 */
import { createDb } from "@collective/db";
import { migrateDb } from "@collective/db/migrate";
import { eq } from "drizzle-orm";

import { cases, documents, extractionRuns, ingestEvents, projects, sources } from "@collective/db/schema";
import { ingestUrl } from "./ingest";
import { storageFromEnv } from "./storage";
import { createGeminiExtractor } from "./extract/gemini";
import { htmlToText } from "./extract/html";
import { validateCandidate, candidateFingerprint } from "./extract/validate";
import type { ClaimCandidate } from "./extract/schema";
import { claims as claimsTable } from "@collective/db/schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./local.db";
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

  const knownProjects = await db.select().from(projects);

  const extractor = createGeminiExtractor({ apiKey });
  let runStatus: "success" | "failed" | "partial" = "failed";
  let candidateCount = 0;

  try {
    const { result, usage } = await extractor.extract({
      documentText,
      fileData: isPdf ? bytes : undefined,
      fileMime: "application/pdf",
      sourceTitle: doc.title,
      knownProjects: knownProjects.map((p) => ({ name: p.name, hints: [p.ward ?? "", p.subCounty ?? ""] })),
    });

    // validate + dedupe, then write survivors as review-pending candidates
    const seen = new Set<string>();
    for (const c of result.candidates as ClaimCandidate[]) {
      const fp = candidateFingerprint(doc.id, c);
      if (seen.has(fp)) continue;
      seen.add(fp);
      if (documentText) {
        const outcome = validateCandidate(c, documentText);
        if (!outcome.valid) {
          console.log(`  ✗ dropped (${outcome.reason}): ${c.assertion.slice(0, 70)}…`);
          continue;
        }
      }
      // Native-PDF path: excerpt can't be string-checked against page text
      // without the text layer, so it lands flagged for the human review gate.

      candidateCount++;
      console.log(`  candidate: [${c.kind}] ${c.assertion.slice(0, 90)}…`);
      await db.insert(claimsTable).values({
        projectId: (await db.select().from(projects).limit(1))[0]!.id, // project resolution lands with the review console
        documentId: doc.id,
        stage: c.stage,
        kind: c.kind,
        assertion: c.assertion,
        amountKes: c.amountKes,
        observedStatus: c.observedStatus,
        eventDate: c.eventDate,
        span: c.span,
        extractionMethod: "llm",
        reviewState: "pending",
      });
    }
    runStatus = candidateCount > 0 ? "success" : "partial";

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
  console.log(`reconcile ${slug}: runs the deterministic engine in packages/api (bin pending — engine is called by seed and by the review-gate webhooks)`);
  void cases;
  void claimsTable;
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
  await migrateDb(db, DATABASE_URL);
  await commands[cmd](rest);
  process.exit(0);
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
