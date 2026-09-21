# collective

**collective** turns a community's scattered public record—audits, budgets, tenders, press claims, and field observations—into an inspectable evidence chain that people can verify and act on.

The first case is the Nairobi County health facilities cluster. The product is a case-file PWA, not a chatbot or a generic dashboard: every public assertion should lead back to its source, and every uncertainty should produce a useful next step.

## What is implemented

- **Case file** at `/case/nairobi-health-facilities`: map, project switcher, evidence timeline, verdicts, contradictions, evidence requests, next steps, and community reports.
- **Offline reporting** at `/report/:projectId`: anonymous field observations are compressed, stored in an IndexedDB outbox, and retried when connectivity returns.
- **Review surface** at `/review`: reviewer workflows for staged claims.
- **Typed API**: Hono and tRPC, backed by the shared API package.
- **Evidence model**: approved claims, provenance spans, deterministic reconciliation, verdict snapshots, and action items.
- **PWA shell**: Vite PWA with a custom Workbox service worker. Document navigations are routed to the client app shell; API requests remain network-only.

## Technology

- TypeScript
- React 19
- TanStack Router and TanStack Query
- Tailwind CSS 4 and shared shadcn/ui primitives
- Hono and tRPC
- Bun and Turborepo
- Drizzle ORM with Neon PostgreSQL
- Better Auth with anonymous sessions, reviewer roles, magic links, and database-backed rate limiting
- MapLibre GL with CARTO Dark raster tiles for the current map view (PMTiles/R2 is the planned offline path)
- Cloudflare R2 interfaces for documents, photos, and future presigned uploads
- Gemini/AI SDK pipeline code for structured extraction and evidence-span validation

## Repository structure

```text
collective/
├── apps/
│   ├── web/                 # React PWA and TanStack Router routes
│   └── server/              # Bun/Hono API and Better Auth handler
├── packages/
│   ├── api/                 # tRPC routers, reconciliation, seed data
│   ├── db/                  # PostgreSQL schema and Drizzle migrations
│   ├── pipeline/            # ingestion, extraction, resolution, and jobs
│   ├── ui/                  # shared UI primitives and design tokens
│   └── config/              # shared TypeScript configuration
├── corpus/                  # local, gitignored source-artifact vault
├── docs/                    # product and architecture design authority
└── package.json             # workspace scripts
```

## Prerequisites

- Bun 1.4 or newer
- A Neon PostgreSQL database
- Node-compatible tooling for the Bun/Vite ecosystem
- Environment values required by the web and server schemas

There is no local SQLite, PGlite, or file-backed database fallback. Development and production use PostgreSQL/Neon.

## Install and configure

```bash
bun install
```

Each app owns its Varlock schema:

- `apps/server/.env.schema` for the API, database, auth, storage, and server integrations
- `apps/web/.env.schema` for browser-safe values such as `VITE_SERVER_URL`

Create ignored environment files beside the relevant schema, then validate them from the owning app directory:

```bash
cd apps/server
bun x varlock load --show-all
bun run env:generate

cd ../web
bun x varlock load --show-all
bun run env:generate
```

Do not put Neon credentials or Better Auth secrets in the web app. Only variables explicitly intended for the browser should use the `VITE_` prefix.

## Database setup

`DATABASE_URL` must be a Neon/PostgreSQL connection string. Neon provides pooled and direct connection strings:

- Use the pooled URL for the long-lived API process when appropriate.
- Use the direct/unpooled URL for schema migrations when Neon provides both.

Apply checked-in migrations from the database package:

```bash
cd packages/db
bun run db:migrate
```

The Better Auth tables, including `rate_limit`, are part of the Drizzle schema and migrations. Do not rename a migration directory after it has been applied to Neon; Drizzle uses the migration tag to track execution history.

Seed the Nairobi case only when you intentionally want to replace the configured database's case data:

```bash
cd apps/server
bun run seed
```

## Run the project

From the repository root:

```bash
bun run dev
```

This starts:

- Web: `http://localhost:3001`
- API: `http://localhost:3000`

Run one app independently when debugging:

```bash
bun run dev:web
bun run dev:server
```

The service worker is disabled in Vite development to avoid stale navigation interception. Production builds use the custom Workbox service worker.

## Validation and builds

```bash
bun run check-types
bun run build
```

The web package also exposes:

```bash
cd apps/web
bun run generate-pwa-assets
bun run serve
```

If an old service worker is already installed in the browser, unregister it once in DevTools → Application → Service Workers and reload after changing PWA configuration.

## Environment troubleshooting on Windows

If Varlock reports `env config validation failed`, the message above the native assertion is the important part. Run the validator directly from the app that owns the schema:

```bash
cd apps/server
bun x varlock load --show-all

cd ../web
bun x varlock load --show-all
```

The following native error is a known Windows/Bun/libuv shutdown race that can appear while Varlock exits:

```text
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\\win\\async.c, line 94
```

It does not identify the invalid environment variable. Fix the validation item printed by `varlock load`; if the assertion still occurs after validation succeeds, update Bun and Varlock, or run the command through a current Node.js environment as a diagnostic comparison. Keep `env = false` in the repository and app `bunfig.toml` files so Bun does not load `.env` files before Varlock.

## Design authority

The documents in `docs/` define the product and its trust model. Start with:

1. [`docs/01-vision.md`](docs/01-vision.md)
2. [`docs/02-architecture.md`](docs/02-architecture.md)
3. [`docs/03-data-model.md`](docs/03-data-model.md)
4. [`docs/04-ai-pipeline.md`](docs/04-ai-pipeline.md)
5. [`docs/05-ux.md`](docs/05-ux.md)
6. [`docs/06-infrastructure.md`](docs/06-infrastructure.md)
7. [`docs/07-decisions.md`](docs/07-decisions.md)

The product rule is simple: **evidence before inference, provenance before confidence, and action after uncertainty.**
