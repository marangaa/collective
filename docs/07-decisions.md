# 07, Decisions

Each entry says what would change our mind. Newest goes last. To amend, append, do not edit.

## ADR-001, Postgres on Neon instead of SQLite or Turso, 2026-09-21

We moved `packages/db` from libsql/Turso to Neon Postgres with PostGIS lined up.

Why: location is core to the product (project pins, GPS reports, ward outlines, reports near a project). PostGIS is the standard tool for that. Neon's free tier and branching fit. Auth and Drizzle both treat Postgres as first class. And we are deploying for real.

Note: an early draft used Turso because the scaffold defaulted to it. That was before location and real deployment became requirements. Offline was never a database problem (see ADR-005), so this switch cost the offline story nothing.

Changes our mind: surprise storage or egress bills on the free tier, or the PostGIS extension being gated.

## ADR-002, Raw files in R2, quotes in Postgres

Raw PDFs and photos sit in R2, immutable and addressed by hash (no egress fees, 10 GB free). Claims carry their exact quotes in Postgres, so rendering evidence never touches object storage.

Changes our mind: if signed URL plumbing takes more than a day.

## ADR-003, The model extracts, a person publishes, no model verdicts

The model proposes typed claims with quotes. Plain rules reconcile. People approve. Verdicts are never model output.

Changes our mind: never for v1. This is the product thesis.

## ADR-004, Words borrowed from open contracting, graph borrowed from FollowTheMoney

Stage names come from the Open Contracting Data Standard. Immutable documents play the role of releases, verdict snapshots the role of records. The parties and links graph takes cues from FollowTheMoney and Aleph. No full standard export in v1.

## ADR-005, Offline means an outbox on the phone, not database sync

Reports wait in IndexedDB under idempotency keys and submit through one call. Background Sync where the browser has it, honest fallback everywhere else. No conflict resolution machinery, because reports are only ever appended.

Changes our mind: a future need to edit shared data offline. Nothing today needs that.

## ADR-006, Anonymous reporting (Better Auth anonymous sessions)

Reporters give no personal details. Repeat reporters are recognized by session, not by identity. Location data is stripped on the phone. Kenya's Data Protection Act holds because of the construction, not because of a policy page.

## ADR-007, Hono API on a long lived host, web on Cloudflare Pages

PDF reading and model calls need more CPU and wall time than Workers comfortably allow today. Hono stays Workers compatible (Neon serverless driver plus R2 bindings), so moving to the edge later is a small step.

Changes our mind: if running the server costs more effort than porting to Workers.

## ADR-008, Parties appear as the record names them

If the Auditor-General does not name a contractor, neither do we. Labels read like "Contractor A (unnamed in OAG report)". This is safer legally, and more believable: we show the record, not our conclusions.

## ADR-009, CARTO Dark now, Kenya map extract on R2 later

The demo uses CARTO Dark raster tiles through MapLibre because the style is public and keyless, suits the case file look, and ships fast. OpenStreetMap and CARTO stay credited. This is an online demo dependency, not an offline promise: the case file must read fine as a list when tiles fail. The scale plan is a Kenya-only extract on R2, which cuts the third party dependency and allows regional caching.

Changes our mind: CARTO terms or availability turn unsuitable, credit cannot be kept, or the R2 hosted extract proves simpler to run.

## ADR-010, Research agents dropped for direct research, 2026-09-21

Spawned research agents had no network path (connection refused). Research was done directly instead. Not a product decision. Written down so nobody burns time retrying that today.

## ADR-011, Claims are the product, stories are rendered, 2026-09-21

What lasts is a claim about a thing, with its source attached. Documents, pages, photos, videos, and field reports are containers. Extractors stage typed candidates with exact quotes. Reconciliation compares approved claims. The public story renders last and lists the claim IDs behind it.

That keeps claimed, observed, and supported as three different states, keeps disagreement visible, and stops the model from quietly becoming the source of truth.

Changes our mind: a future area where claims cannot be quoted, reviewed, or updated over time.

## ADR-012, Use kept libraries for auth, models, and storage, 2026-09-21

Better Auth owns sessions, anonymous reporting, reviewer roles, and magic links. The AI SDK owns structured extraction and validation. R2 is reached through the S3 style SDK and signed URLs. TanStack plus IndexedDB plus Workbox provide the outbox and service worker. We do not hand roll auth, signing, model protocols, or sync.

Changes our mind: a platform limit that a kept library cannot meet for evidence, security, or offline needs.

## ADR-013, Varlock owns environment loading, 2026-09-21

Each runnable app owns an `.env.schema`. Bun's auto dotenv is off (`env = false`), and Varlock loads and checks the environment before the app starts. That stops `.env` and `.env.local` values from mixing silently across packages. Check from the app folder with `bun x varlock load --show-all`.

The Windows `UV_HANDLE_CLOSING` message during Varlock or Bun shutdown is a runtime issue, not a diagnosis. The validation output above it is what counts.

Changes our mind: a host that provides a stronger secrets contract without losing schema checks.

## Open questions (not decisions yet)

1. How deep does Swahili go: interface strings only, or claim summaries too (model helped, always linked to the original quote)?
2. Reviewer login for the demo: one seeded reviewer account, or magic link setup live?
3. Do we show the unnamed contractor pattern across projects as a graph, or keep it as a contradiction card? Leaning card. Graph is v2.
