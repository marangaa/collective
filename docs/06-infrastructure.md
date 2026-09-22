# 06, Infrastructure

## Database: Neon Postgres

The free plan gives 100 projects, 10 branches each, 100 compute hours per project, autoscale to 2 compute units, scale to zero after 5 minutes idle, 0.5 GB storage, and 5 GB transfer a month.

That fits because of one split: structured data and quotes live in Postgres, raw PDFs and photos live in R2. The whole structured set is megabytes.

PostGIS comes with a `CREATE EXTENSION postgis;` (it is in Neon's extension list). Region is eu-central-1, the closest well supported region to Kenya, with edge caching covering the rest. Branches are free and instant: `main` for prod, a `dev` branch for staging and migration tests.

Drizzle uses the `postgresql` dialect with `postgres.js` on the long lived Bun API, which is how the code runs today. Pooled connections serve the API; migrations use a direct connection when Neon gives you both. The schema currently keeps plain `lat`/`lng` and JSON boundaries. PostGIS is a planned upgrade, not something live, so do not describe spatial indexing as active until that migration lands.

## Object storage: Cloudflare R2

Free tier: 10 GB months of storage, a million write-type operations, ten million read-type, no egress fees.

```text
collective-vault/
  raw/<sha256>/<filename>      # original PDFs, kept for good, addressed by hash
  text/<sha256>.txt            # extracted text snapshots (pipeline cache)
  photos/<report-id>/<uuid>    # field photos (shrunk on the phone, location stripped)
  tiles/kenya.pmtiles          # regional basemap (the scale plan, see Maps)
```

Photo upload goes browser to R2 directly through a signed URL. The server signs, it never touches the bytes, which matters on 2G. Documents are fetched by signed URL on demand, but quotes render from Postgres so that rarely happens. CORS follows the documented Protomaps R2 pattern so map tile range requests work from the browser.

## Maps

The demo basemap is CARTO Dark raster tiles drawn by MapLibre GL. The tile URLs are public and need no key, with OpenStreetMap and CARTO credit in the map style. CARTO provides the tiles, MapLibre draws them and handles tapping and dragging.

Why CARTO for the demo: the dark style suits the case file look, it needs no token in the browser, and it ships fast. It still needs the internet, so a tile failure must never block the case file list or the evidence views.

The scale plan is a Kenya-only map extract (built with Protomaps or Planetiler) served from R2, which drops the third party tile dependency and allows regional caching. Fully offline maps stay a nice to have; the facility list is the fallback.

In the code, `maplibre-gl` owns the canvas, controls, markers, and camera through a small internal style object, not a React map wrapper.

## Auth: Better Auth

- Anonymous sessions for reporters: a real session with zero personal details. A reporter can attach an email later if they ever want to. Corroboration without identity.
- Roles for reviewers guard the review console.
- Reviewers sign in with magic links through Resend's free tier. No passwords to leak.
- The auth tables live in our own database either way.

## PWA realities

- vite-plugin-pwa with a custom service worker for the outbox sync. The worker serves the cached app shell for `/`, `/case/*`, `/report/*`, and `/review/*`, while `/trpc/*` and `/api/*` always hit the network. It stays off in development so an old worker cannot hide route changes.
- Background Sync is Chromium only. iOS Safari does not have it, so the fallback is the online event plus app open plus a retry button you can see.
- Camera uses a plain file input with rear camera hint. It works everywhere, no permission flow to build.
- Location needs HTTPS, ward level accuracy is enough, and it is always optional.

## Jobs

Re-fetching and extraction run on a schedule, Railway cron or GitHub Actions calling the pipeline scripts. Never in the API request path.

## Environment variables

The schemas are the source of truth: `apps/server/.env.schema` and `apps/web/.env.schema`. Check yours from each app folder with `bun x varlock load --show-all`.

The full list: `DATABASE_URL`, `GEMINI_API_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `RESEND_API_KEY`, `VITE_SERVER_URL`, `VITE_MAP_STYLE_URL`. The root README says which ones you actually need to get running.

## Free tier check

Neon: we need about 50 MB of structured data with bursty dev use. The free tier gives 0.5 GB and 100 compute hours. Fits.

R2: we need about 2 GB of docs and photos. The free tier gives 10 GB with no egress fees. Fits.

Gemini: the corpus is about 500k tokens of ingestion plus iteration. The per-project free tier covers it, with the Batch API as backup. Fits.

Cloudflare Pages: static PWA hosting. Fits.

Railway or Fly: one small Bun API (Render free works too). Fits.

Resend: a few reviewer magic links a day against 100 free a day. Fits.
