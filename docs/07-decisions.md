# 07 — Decisions (ADRs)

One line each on *what would change our mind*. Newest last. Amend by appending, not editing.

## ADR-001 — Postgres (Neon) over SQLite/Turso — 2026-09-21

**Decision:** migrate `packages/db` from libsql/Turso to Neon Postgres with PostGIS.
**Why:** location features are core (project pins, GPS field reports, ward polygons,
proximity "reports near this project"); PostGIS is the standard tool; Neon free tier +
branching fits; better-auth + drizzle pg are first-class; we're deploying for real.
**Context note:** an earlier draft leaned Turso (scaffold default) — that was before
geospatial and real deployment became requirements. The offline problem was never a DB
problem (see ADR-005), so this switch costs the offline story nothing.
**Changes our mind:** Neon free-tier storage/egress surprises; PostGIS extension gated.

## ADR-002 — Artifacts in R2, excerpts in Postgres

Raw PDFs/photos immutable and content-addressed in R2 (zero egress, free 10 GB); claims
carry verbatim excerpts in Postgres so evidence rendering never touches object storage.
**Changes our mind:** R2 presign complexity exceeding a day.

## ADR-003 — LLM extraction with a human publish gate; no LLM verdicts

AI proposes typed claims with spans; deterministic rules reconcile; humans approve. Verdicts
are never model output. **Changes our mind:** never for v1 — this *is* the product thesis.

## ADR-004 — OCDS-aligned vocabulary, FtM-inspired graph

Stage enums from OCDS; immutable documents ~ OCDS releases; verdict snapshots ~ records;
parties/links graph inspired by FollowTheMoney/Aleph. No full standard export in v1.

## ADR-005 — Offline = client outbox, not database replication

Field reports queue in IndexedDB with idempotency keys; sync via one mutation; Background
Sync where available, honest fallback elsewhere. No CRDTs — reports are append-only.
**Changes our mind:** a future requirement to *edit* shared data offline (none today).

## ADR-006 — Anonymous-by-default reporting (better-auth anonymous plugin)

No PII from reporters; corroboration via pseudonymous sessions; EXIF stripped client-side.
Kenya DPA 2019 compliance is a design consequence, not a policy page.

## ADR-007 — Hono API on a long-lived host (Railway/Fly), web on Cloudflare Pages

PDF/Gemini workloads exceed comfortable Workers budgets today; Hono stays Workers-compatible
(Neon serverless driver + R2 bindings) so edge migration later is incremental.
**Changes our mind:** ops burden > Workers porting cost.

## ADR-008 — Parties stay as named in the record

If the OAG doesn't name a contractor, we don't. Labels like "Contractor A (unnamed in OAG
report)". Defamation-safe, and *more* credible: we show the record, not our conclusions.

## ADR-009 — CARTO Dark now; Kenya PMTiles-on-R2 as the scale path

The current demo uses CARTO Dark raster tiles through MapLibre because the public style is
keyless, visually suited to the case-file HUD, and quick to ship. Attribution remains visible
for OSM and CARTO. This is an online demo dependency, not an offline guarantee: the case file
must remain usable as a list when tiles fail. The scale path is a Kenya-only PMTiles extract on
R2, which reduces third-party dependency and supports regional caching.

**Changes our mind:** CARTO availability/terms become unsuitable for the demo, attribution
cannot be maintained, or the R2-hosted PMTiles path is not operationally simpler.

## ADR-010 — Subagents abandoned for research (2026-09-21)

Spawned research agents had no network path (connection refused). Research was done direct.
Not a product decision — recorded so we don't burn time retrying that lane today.

## ADR-011 — Assertions are canonical; narratives are derived — 2026-09-21

The product's durable object is a provenance-bearing assertion about an entity, not a document summary. Documents, web pages, photos, videos, and field reports are containers for evidence. Extractors stage typed candidates with exact source spans; deterministic reconciliation compares approved claims; the public narrative is rendered last and returns its basis claim IDs.

This keeps claimed, observed, and supported states distinct, makes disagreement inspectable, and prevents an LLM from silently becoming the source of truth. **Changes our mind:** a future domain where claims cannot be independently cited, reviewed, or updated over time.

## ADR-012 — Use maintained integrations for auth, model extraction, and object storage — 2026-09-21

Better Auth owns sessions, anonymous reporting, reviewer roles, and magic links. The AI SDK/provider integration owns structured extraction and validation. Cloudflare R2 is accessed through the AWS S3-compatible SDK and presigned URLs. TanStack/IndexedDB and Workbox provide the PWA outbox and service-worker behavior. We do not replace these with custom authentication, storage signing, model protocols, or offline synchronization layers.

**Changes our mind:** a platform constraint that a maintained integration cannot support the required provenance, security, or offline semantics.

## ADR-013 — Varlock owns environment loading and validation — 2026-09-21

Each runnable app owns a `.env.schema`; Bun's automatic dotenv loading is disabled with
`env = false`, and Varlock loads/validates the environment before the app starts. This avoids
silently mixing `.env`, `.env.local`, and environment-specific values across workspace packages.
Run validation from the owning app directory with `bun x varlock load --show-all`.

The Windows `UV_HANDLE_CLOSING` assertion can occur during Varlock/Bun shutdown and is a
runtime/libuv issue, not a useful validation diagnosis. The validation output immediately above
it remains authoritative. **Changes our mind:** a deployment platform that supplies a stronger,
centrally managed secret/config contract without losing schema validation.

## Open questions (not yet decisions)

1. Swahili translation depth: UI strings only, or claim summaries too (Gemini-assisted,
   always linked to the English/original span)?
2. Reviewer identity for the demo: single seeded reviewer account vs magic-link setup live?
3. Do we show the unnamed-contractor *pattern* across projects in the UI (graph view) or
   keep it as a narrative contradiction card? (Leaning: card. Graph is v2.)
