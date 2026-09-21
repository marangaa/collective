# 03 — Data model (Postgres / Neon / PostGIS)

Schema v2. Approved in discussion 2026-09-21; changes go through `07-decisions.md`.

## Conventions

- UUID primary keys (`gen_random_uuid()`), `timestamptz` everywhere, `jsonb` for structured blobs.
- **pg enums** for controlled vocabularies (OCDS-aligned where applicable).
- **Nothing is deleted.** Documents supersede (`supersedes_id`), claims are linked
  (`updates`/`contradicts`), verdicts append. Rejection is a state, not a deletion.
- Geospatial: `geography(Point, 4326)` on projects/field_reports; `geography(MultiPolygon, 4326)`
  on areas; GiST indexes; plain `lat`/`lng` doubles denormalized for cheap map rendering.
- Full-text search: generated `tsvector` column + GIN index over `claims.assertion` and span
  excerpt (Postgres-native; replaces the earlier FTS5 idea from the SQLite draft).
- better-auth tables (`user`, `session`, `account`, `verification`) are owned by the
  better-auth drizzle adapter; `user` gains `isAnonymous` (anonymous plugin) and `role`
  (admin plugin). We do not hand-edit those tables.

## Tables

```sql
sources        id, name, publisher, type(audit|procurement|budget|press|news|community),
               url, country_code, county, trust_tier(official|independent|community),
               first_seen_at
documents      id, source_id, title, doc_type(green_book|budget_estimate|budget_implementation|
               tender_notice|press_release|news_article|inspection_report|field_photo),
               fiscal_year, published_at, retrieved_at, sha256 UNIQUE, storage_key,
               byte_size, page_count, supersedes_id REFERENCES documents(id),
               extraction_state(pending|extracted|failed|skipped), notes
areas          id, name, kind(county|sub_county|ward|constituency), parent_id,
               boundary geography(MultiPolygon,4326)  -- GiST; jurisdiction + "story of a place"
cases          id, slug UNIQUE, title, summary, county, sector, status(open|monitoring|resolved),
               created_at
projects       id, case_id, name, sector, ward, sub_county,
               location geography(Point,4326), lat, lng,   -- GiST on location
               ocds_id TEXT NULL                          -- future OCID join key
parties        id, name NULL, label NOT NULL,               -- e.g. "Contractor A (unnamed in OAG report)"
               role(contracting_authority|contractor|auditor|funder|oversight),
               identifiers jsonb                           -- PPRA reg no. etc, only if published
claims         id, project_id, document_id, party_id NULL,
               stage(planning|tender|award|contract|implementation|completion),   -- OCDS
               kind(budget_allocated|tender_published|award_made|payment_made|
                    progress_reported|completion_claimed|inspection_finding|delivery_observed),
               assertion TEXT, amount_kes BIGINT NULL, pct_complete INT NULL,
               observed_status(operational|partially_built|stalled|abandoned|not_started|
                               unusable|unknown) NULL,
               event_date DATE NULL,
               span jsonb NOT NULL,        -- {page:int, excerpt:text, start:int, end:int}
               extraction_method(llm|rule|manual), confidence NUMERIC NULL,
               review_state(pending|approved|rejected), reviewed_by NULL, created_at
               -- GIN tsvector over (assertion, span->>'excerpt')
claim_links    id, from_claim_id, to_claim_id,
               relation(supports|contradicts|updates|same_finding),
               rationale TEXT, created_by(engine|human), created_at
```
```sql
verdicts       id, project_id, aspect(budget|award|payments|delivery|current_state),
               verdict(corroborated|contradicted|unverifiable|partially_corroborated),
               summary TEXT, basis_claim_ids uuid[], gaps jsonb,
               inputs_hash TEXT, computed_at          -- append-only; no updates
field_reports  id, project_id, user_id NULL,          -- anonymous better-auth user
               observed_status(...same enum...), comment TEXT NULL,
               location geography(Point,4326) NULL, lat, lng, gps_accuracy_m INT NULL,
               photo_keys jsonb,                        -- R2 keys; EXIF stripped pre-upload
               captured_at, submitted_at, client_uuid UNIQUE,   -- idempotency
               channel(pwa|ussd|whatsapp),
               corroboration_state(unverified|corroborated|reviewed)
institutions   id, name, kind(county_exec|county_assembly|oversight|regulator|commission|cso|
               judiciary), jurisdiction TEXT, mandate TEXT, contact_channels jsonb,
               ati_eligible BOOLEAN
next_steps     id, project_id, institution_id,
               kind(ati_request|oversight_referral|evidence_needed|field_verification),
               title, body_template TEXT, priority INT, status(open|done|dismissed)
extraction_runs id, document_id, extractor(llm|rule), model TEXT NULL, prompt_version TEXT,
               tokens_in INT, tokens_out INT, cost_usd NUMERIC NULL, duration_ms INT,
               status(success|failed|partial), created_at
               -- the product's own AI-usage ledger; also feeds the hackathon written summary
ingest_events  id, actor(system|extractor|reviewer), action, entity_type, entity_id,
               detail jsonb, created_at                 -- audit log of the system itself
```

## Lifecycle rules

1. A `document` row is written **before** parsing; its raw bytes are already vaulted. Parsing
   failure never loses the artifact.
2. Claim candidates enter as `review_state = pending`. Public queries filter to `approved`.
3. `verdicts.computed_at` defines "last verified". The UI renders staleness honestly.
4. `field_reports` are append-only; moderation changes `corroboration_state`, never content.
5. A re-fetched source with a new `sha256` inserts a new `documents` row with
   `supersedes_id` pointing at the old one → diffable history of the official record.

## Standards alignment (credibility + scalability story)

| Ours | OCDS (Open Contracting Data Standard) | FollowTheMoney (OCCRP) |
| --- | --- | --- |
| `claims.stage` | planning / tender / award / contract / implementation | — |
| `documents` immutability + `supersedes_id` | releases (immutable, point-in-time) | provenance-first document model |
| `projects.ocds_id` | OCID joins a whole contracting process | — |
| `parties`, `claim_links` graph | parties building block | entity/relationship graph (Aleph) |
| verdict snapshots | records (compiled view over releases) | — |

We align vocabulary and shape; we do **not** implement full OCDS/FtM export in v1. The claim
on demo day: "a new country is a new source registry and institution directory — the data
model already speaks the international standards."
