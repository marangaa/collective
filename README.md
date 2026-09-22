# collective

Public records about government projects are scattered. Audit reports live in PDFs, budgets in spreadsheets, tenders on portals, and what residents see with their own eyes lives nowhere at all. collective pulls all of that into one case file that anyone can check.

The first case is health facilities in Nairobi County. The product is a case-file app, not a chatbot or a dashboard. Every claim links back to its source. Every gap points to a next step.

## What you can do with it

- Open the case file at `/case/nairobi-health-facilities`: a map, the four projects, an evidence timeline, verdicts per project, contradictions between sources, open evidence requests, next steps, and community reports.
- File a report at `/report/:projectId`: say what you saw at a facility. It works offline. The report is stored on your phone and sent when you are back online. No account, no name.
- Review staged claims at `/review`: for reviewers only. Approve or reject what the extraction pipeline pulled out of documents.

Under the hood there is a typed API (Hono and tRPC), an evidence model (approved claims, source excerpts, verdict snapshots, action items), and a PWA shell that works offline for reading and reporting.

## Technology

Plain list, no surprises:

- TypeScript and React 19
- TanStack Router and TanStack Query
- Tailwind CSS 4 with shared UI primitives
- Hono and tRPC
- Bun and Turborepo
- Drizzle ORM with Neon PostgreSQL
- Better Auth (anonymous sessions, reviewer roles, magic links, database rate limiting)
- MapLibre GL with CARTO Dark tiles for the map
- Cloudflare R2 for documents and photos
- Gemini through the AI SDK for reading documents into structured claims

## Repository structure

```text
collective/
├── apps/
│   ├── web/                 # The PWA and its routes
│   └── server/              # The API (Bun/Hono) and auth
├── packages/
│   ├── api/                 # tRPC routers, reconciliation, seed data
│   ├── db/                  # Database schema and migrations
│   ├── pipeline/            # Reading documents, extracting claims
│   ├── ui/                  # Shared UI pieces
│   └── config/              # Shared TypeScript config
├── corpus/                  # Local source files (gitignored, stays on your machine)
├── docs/                    # Design docs, the source of truth
└── package.json             # Workspace scripts
```

## Prerequisites

- Bun 1.4 or newer
- A Neon PostgreSQL database (there is no local file database option, dev and prod both use Postgres)
- Node-compatible tooling for the Bun/Vite setup

## Install and configure

```bash
bun install
```

Each app has its own environment schema:

- `apps/server/.env.schema` for the API, database, auth, and storage
- `apps/web/.env.schema` for browser-safe values like `VITE_SERVER_URL`

There are example files to copy from:

```bash
cp apps/server/.env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

Then fill in your values and check them from each app directory:

```bash
cd apps/server
bun x varlock load --show-all
bun run env:generate

cd ../web
bun x varlock load --show-all
bun run env:generate
```

The only values you must set to get running are `DATABASE_URL` (your Neon connection string) and `CORS_ORIGIN` (where the web app runs, usually `http://localhost:3001`). Everything else can wait. `GEMINI_API_KEY` is only needed if you want to run document extraction. The `R2_*` values are only needed for real photo uploads; without them, reports still work, they just submit without photos. `REVIEWER_EMAIL` is needed if you want to sign in at `/review`.

Keep Neon secrets and auth secrets on the server. Only variables meant for the browser start with `VITE_`.

## Database setup

`DATABASE_URL` must be a Neon/PostgreSQL connection string. Neon gives you two kinds:

- The pooled URL is for the API process.
- The direct URL is for running migrations.

Run the checked-in migrations from the database package:

```bash
cd packages/db
bun run db:migrate
```

The auth tables, including `rate_limit`, are part of the schema. One rule: never rename a migration folder after it has run against Neon. Drizzle tracks which migrations ran by folder name.

To load the Nairobi case data (this replaces the case data in that database, so only do it on purpose):

```bash
cd apps/server
bun run seed
```

## Run the project

From the repo root:

```bash
bun run dev
```

That starts the web app at `http://localhost:3001` and the API at `http://localhost:3000`.

To run one side on its own:

```bash
bun run dev:web
bun run dev:server
```

The service worker is off in development so it cannot serve you stale pages. Production builds use it.

## A quick tour (three minutes)

1. Open `http://localhost:3001`. You land on the Nairobi health case.
2. Pick a project on the map (try Mama Lucy Phase II). The dots above it show the verdict for budget, award, payments, delivery, and current state.
3. Scroll the timeline and open any card. Each one shows the exact excerpt, the document, and the page it came from.
4. Open the contradictions section. This is where sources disagree.
5. Hit Report and file an observation. Turn off your network first if you want to see the offline queue work.
6. Open `/review` after setting `REVIEWER_EMAIL` and signing in through the magic link. Approve a candidate and watch the verdicts update.

## Checks and builds

```bash
bun run check-types
bun run build
```

The web package has two extra commands:

```bash
cd apps/web
bun run generate-pwa-assets
bun run serve
```

If your browser already installed an old service worker, remove it once under DevTools, Application, Service Workers, then reload.

## Environment trouble on Windows

If Varlock says `env config validation failed`, look at the line above the error. That line names the bad variable. Run the check directly from the app that owns it:

```bash
cd apps/server
bun x varlock load --show-all

cd ../web
bun x varlock load --show-all
```

You may also see this native error on Windows while Varlock exits:

```text
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 94
```

That is a known Bun/Windows shutdown race. It does not tell you which variable is wrong. Fix whatever `varlock load` flagged. If validation passes and the message still shows up, update Bun and Varlock, or run the same command under Node to compare. The `bunfig.toml` files keep `env = false` so Bun does not load `.env` files ahead of Varlock.

## Design docs

The files in `docs/` say what this project is and why it works the way it does. Read them first:

1. [`docs/01-vision.md`](docs/01-vision.md)
2. [`docs/02-architecture.md`](docs/02-architecture.md)
3. [`docs/03-data-model.md`](docs/03-data-model.md)
4. [`docs/04-ai-pipeline.md`](docs/04-ai-pipeline.md)
5. [`docs/05-ux.md`](docs/05-ux.md)
6. [`docs/06-infrastructure.md`](docs/06-infrastructure.md)
7. [`docs/07-decisions.md`](docs/07-decisions.md)

The short version: evidence before guessing, sources before confidence, and every dead end should still tell you what to do next.
