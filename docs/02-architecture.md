# 02 — System architecture

## The five stages

```
① SOURCES             ② EXTRACTION            ③ RECONCILIATION       ④ GROUND TRUTH          ⑤ ACTION
source registry  →    text/PDF → claims  →    claim graph →          community reports  →    gaps → institutions
fetch → sha256 →      with verbatim spans     verdicts + gaps,       (anonymous, offline     → ATI requests
vault (R2,            (LLM + rules,           append-only            queue, photo → R2)     → case export
immutable)            human review gate)      snapshots)             → corroboration
```

Each stage exists to protect one property: **inspectability**. A user can start at any
verdict and walk backwards to the raw byte-identical document it came from.

## Module map (this monorepo)

```
collective/
├── apps/
│   ├── web/          # PWA (React 19, TanStack Router, Tailwind 4, vite-plugin-pwa)
│   └── server/       # Hono API host: tRPC, better-auth, R2 presigning (Bun)
├── packages/
│   ├── db/           # Drizzle schema + client (Postgres / Neon, PostGIS)
│   ├── api/          # tRPC routers + reconciliation engine + next-step generator
│   ├── pipeline/     # ingestion & extraction (fetch, hash, vault, Gemini extractors,
│   │                 # span validation, review-queue writers) — runs as scripts/jobs
│   ├── ui/           # shared shadcn primitives
│   └── config/       # shared tsconfig
├── corpus/           # local dev vault (mirrors R2 layout; gitignored artifacts)
└── docs/             # this design set
```

`packages/pipeline` is scaffolded with `bunx create-better-t-stack add --package pipeline`
(BTS `add` supports workspace packages and addons; **auth is not an addon** — better-auth is
wired manually, see `06-infrastructure.md`).

## Data flow narratives

**Ingestion run (per source document):**
`fetch → sha256 → vault raw bytes (R2/local) → Gemini document understanding (chunked,
page-anchored) → claim candidates with spans → programmatic span validation (excerpt must
fuzzy-match source text at stated page) → review queue (status pending) → human approve →
claims published → reconciliation re-run → verdict snapshot appended.`

**Field report (offline path):**
`PWA form → anonymous session (better-auth anonymous) → photo compressed + EXIF-stripped
client-side → outbox row in IndexedDB (client_uuid) → sync when online (Background Sync API
where available; else online-event/app-open/manual retry) → presigned PUT direct to R2 →
tRPC mutation (idempotent on client_uuid) → corroboration state recomputed.`

**Reconciliation:**
pure functions in `packages/api/lib/reconcile/` over claims + links + field reports for one
project/aspect → verdict + gaps + basis claim IDs → appended to `verdicts` with an
`inputs_hash`. Never updates in place. A verdict flipping between audits is a *feature* we
display ("what changed").

## Deployment topology (target)

```
                 ┌───────────────┐
 Browser (PWA) ─►│ Cloudflare     │  static web, edge-cached (Nairobi/Mombasa PoPs)
                 │ Pages          │
                 └──────┬────────┘
                        │ tRPC over HTTPS (batched, small payloads)
                 ┌──────▼────────┐         ┌──────────────────┐
                 │ Hono API       │────────►│ Neon Postgres     │  eu-central, pooled,
                 │ (Bun, Railway/ │  pg     │ + PostGIS         │  0.5 GB free tier fits:
                 │  Fly long-lived)│         └──────────────────┘  blobs live in R2
                 └──────┬────────┘
                        │ presign / vault
                 ┌──────▼────────┐         ┌──────────────────┐
                 │ Cloudflare R2  │◄────────│ pipeline jobs     │  cron (Railway cron or
                 │ raw docs, text,│  S3 API │ (packages/pipeline)│  GH Actions) — fetch +
                 │ photos, tiles  │         └──────────────────┘  extract, not in API path
                 └───────────────┘
```

**Why a long-lived server and not Cloudflare Workers (today):** PDF extraction + Gemini
calls exceed Workers' comfortable CPU/wall-clock budget; some PDF tooling assumes Node APIs;
better-auth is simplest on Node/Bun. Hono stays Workers-compatible so this can move later
(Neon serverless driver + R2 bindings make that a small step, not a rewrite). See ADR-007.

## Hard boundaries (modularity contract)

- `packages/db` knows tables, nothing else.
- `packages/pipeline` writes claim *candidates*; it cannot publish (only the review gate can).
- The reconciliation engine is **pure** (no I/O, no LLM calls) — testable, deterministic.
- LLM access only through `packages/pipeline/extract/*` and `packages/api/lib/ai/*` behind a
  provider interface (AI SDK). Swap Gemini ↔ anything without touching callers.
- Storage only through a `StorageDriver` interface (`R2Driver`, `LocalFsDriver`).
