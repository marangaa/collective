# 02, System architecture

## The five stages

```text
SOURCES            EXTRACTION           RECONCILIATION      GROUND TRUTH         ACTION
source registry    text and PDF         claim graph         community reports    gaps go to
goes to            becomes claims       becomes verdicts    (anonymous,          offices
vault (R2,         with exact           and open            offline queue,       as ATI
stored for good)   quotes (model        questions,          photo goes          requests
                   plus rules,          kept as             straight to         and case
                   checked by           snapshots)          storage) goes       exports
                   a person)                               to corroboration
```

Each stage protects one thing: you can always work backwards. Start at any verdict and follow it back to the exact document it came from, byte for byte.

## What lives where

```text
collective/
├── apps/
│   ├── web/          # The PWA (React 19, TanStack Router, Tailwind 4, vite-plugin-pwa)
│   └── server/       # The API host: tRPC, auth, photo upload signing (Bun)
├── packages/
│   ├── db/           # Database schema and client (Postgres on Neon, PostGIS later)
│   ├── api/          # tRPC routes, the reconciliation engine, the next-step generator
│   ├── pipeline/     # Reading documents (fetch, hash, store, extract with Gemini,
│   │                 # check quotes, queue for review). Runs as scripts and jobs.
│   ├── ui/           # Shared interface pieces
│   └── config/       # Shared TypeScript config
├── corpus/           # Local copies of source files for pipeline work (gitignored)
└── docs/             # These design docs
```

The pipeline package only reads and writes through storage and provider interfaces. The API and database packages serve and store the public case file. Auth is wired by hand in `apps/server` because login is an app concern, not a data layer concern.

## How data moves

Reading a new document:

Fetch the file, hash it, store the raw bytes (R2, or the local corpus folder while developing). Gemini reads it in page chunks. The model returns claim candidates with exact quotes. Code checks each quote against the stated page, the page has to exist and the text has to match. What passes goes into a review queue. A person approves it. Approved claims get published. Reconciliation runs again and a new verdict snapshot is stored.

Filing a report offline:

The form creates an anonymous session, shrinks the photo and strips its location data on the phone, then saves the report in an IndexedDB outbox with a client ID. When the phone is back online (Background Sync where the browser has it, otherwise the online event, app open, or a manual retry button), the photo uploads straight to storage through a signed URL and the report submits through one tRPC call. The client ID makes retries safe. Then corroboration is recalculated.

Reconciliation:

Plain functions in `packages/api/lib/reconcile/` look at the claims, the links between them, and the field reports for one project and one aspect. Out comes a verdict, the open gaps, and the IDs of the claims behind it. The verdict is appended with a hash of its inputs. Old verdicts stay. When a verdict flips between audits, we show that as "what changed", because that is the point.

## Where it runs

```text
Phone browser (PWA) talks to Cloudflare Pages, static web app, cached at the edge.

Pages talks to the Hono API (Bun, on Railway or Fly, long lived) over tRPC.

The API talks to Neon Postgres (eu-central, pooled, free tier fits because
PDFs and photos live in R2, not in the database).

The API signs uploads for Cloudflare R2 (raw docs, text, photos, map tiles).

Pipeline jobs (packages/pipeline) run on a schedule, Railway cron or
GitHub Actions. They fetch and extract. They are never in the request path.
```

Why a long lived server instead of Cloudflare Workers for now: reading PDFs and calling Gemini takes more CPU and wall time than Workers comfortably allow, some PDF tools expect Node APIs, and auth is simplest on Node or Bun. Hono can move to Workers later (Neon serverless driver plus R2 bindings make that a small move). See ADR-007.

## Boundaries that matter

- `packages/db` knows the Postgres tables and migrations. Nothing else.
- `packages/pipeline` writes claim candidates. It cannot publish. Only the review gate publishes.
- The reconciliation engine is pure functions. No network, no model calls. Easy to test, same input always gives the same output.
- The model is only reachable through `packages/pipeline/extract/*` and `packages/api/lib/ai/*`, behind a provider interface. Swapping Gemini for something else touches one place.
- Storage is only reachable through a `StorageDriver` interface, with an R2 version and a local folder version.
