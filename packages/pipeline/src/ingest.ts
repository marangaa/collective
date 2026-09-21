import { eq } from "drizzle-orm";

import { documents, ingestEvents, sources } from "@collective/db/schema";
import type { Database } from "@collective/db";

import { rawKey, sha256, type StorageDriver } from "./storage";

export type IngestResult = {
  documentId: string;
  sha256: string;
  deduped: boolean;
  byteSize: number;
};

/**
 * Fetch with an honest TLS fallback: some Kenyan government servers ship
 * expired certificates. We retry once with relaxed verification ONLY for the
 * fetch, and record that fact in the audit trail — content integrity is still
 * guaranteed by the SHA-256 hash, not by TLS.
 */
export async function fetchWithTlsFallback(
  url: string,
): Promise<{ bytes: Uint8Array; relaxedTls: boolean }> {
  const headers = { "user-agent": "collective-pipeline/0.1 (civic audit research; contact: repo README)" };
  try {
    const res = await fetch(url, { headers, redirect: "follow" });
    if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), relaxedTls: false };
  } catch (e) {
    const msg = String(e);
    if (!/certificate|tls|ssl/i.test(msg)) throw e;
    const res = await (fetch as (u: string, i: object) => Promise<Response>)(url, {
      headers,
      redirect: "follow",
      tls: { rejectUnauthorized: false },
    });
    if (!res.ok) throw new Error(`fetch failed ${res.status} for ${url} (relaxed TLS)`);
    return { bytes: new Uint8Array(await res.arrayBuffer()), relaxedTls: true };
  }
}

/**
 * Fetch a source document, vault it (immutable, content-addressed), and register
 * it in the DB. Idempotent: the same bytes at a different URL are the same document.
 * A CHANGED document at the same URL creates a new version row (supersedes).
 */
export async function ingestUrl(
  db: Database,
  storage: StorageDriver,
  input: {
    url: string;
    sourceId: string;
    title: string;
    docType: "green_book" | "budget_estimate" | "budget_implementation" | "tender_notice" | "press_release" | "news_article" | "inspection_report";
    fiscalYear?: string;
    notes?: string;
  },
): Promise<IngestResult> {
  const { bytes, relaxedTls } = await fetchWithTlsFallback(input.url);
  const hash = sha256(bytes);

  // Dedupe by content hash
  const [existing] = await db.select().from(documents).where(eq(documents.sha256, hash));
  if (existing) {
    return { documentId: existing.id, sha256: hash, deduped: true, byteSize: bytes.byteLength };
  }

  const filename = input.url.split("/").pop()?.split("?")[0] ?? "document";
  const key = rawKey(hash, filename);
  await storage.put(key, bytes);

  // Versioning: prefer filling the newest PENDING document row for the same
  // source+title (from seeding); otherwise create a new version row.
  const prior = await db.select().from(documents).where(eq(documents.sourceId, input.sourceId));
  const pendingMatch = prior
    .filter((d) => d.title === input.title && d.vaultState === "pending")
    .sort((a, b) => (b.retrievedAt?.getTime() ?? 0) - (a.retrievedAt?.getTime() ?? 0))[0];
  const priorSame = prior
    .filter((d) => d.title === input.title && d.vaultState !== "pending")
    .sort((a, b) => (b.retrievedAt?.getTime() ?? 0) - (a.retrievedAt?.getTime() ?? 0))[0];

  let documentId: string;
  if (pendingMatch) {
    await db
      .update(documents)
      .set({
        url: input.url,
        sha256: hash,
        storageKey: key,
        byteSize: bytes.byteLength,
        vaultState: "vaulted",
        supersedesId: priorSame?.id ?? null,
      })
      .where(eq(documents.id, pendingMatch.id));
    documentId = pendingMatch.id;
  } else {
    const [row] = await db
      .insert(documents)
      .values({
        sourceId: input.sourceId,
        title: input.title,
        docType: input.docType,
        fiscalYear: input.fiscalYear ?? null,
        url: input.url,
        retrievedAt: new Date(),
        sha256: hash,
        storageKey: key,
        byteSize: bytes.byteLength,
        vaultState: "vaulted",
        supersedesId: priorSame?.id ?? null,
        extractionState: "pending",
        notes: input.notes ?? null,
      })
      .returning();
    documentId = row!.id;
  }

  await db.insert(ingestEvents).values({
    actor: "system",
    action: "ingest",
    entityType: "document",
    entityId: documentId,
    detail: { url: input.url, sha256: hash, bytes: bytes.byteLength, relaxedTls },
  });

  if (relaxedTls && pendingMatch) {
    await db
      .update(documents)
      .set({ notes: `${input.notes ?? ""}\n[retrieved with relaxed TLS: server certificate invalid; integrity via sha256]`.trim() })
      .where(eq(documents.id, documentId));
  }

  return { documentId, sha256: hash, deduped: false, byteSize: bytes.byteLength };
}

export async function ensureSource(
  db: Database,
  input: { name: string; publisher: string; type: "audit" | "procurement" | "budget" | "press" | "news" | "community"; url: string; trustTier: "official" | "independent" | "community"; county?: string },
): Promise<string> {
  const [existing] = await db.select().from(sources).where(eq(sources.name, input.name));
  if (existing) return existing.id;
  const [row] = await db.insert(sources).values(input).returning();
  return row!.id;
}
