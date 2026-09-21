# 03 — Data model: assertions, evidence, and state

The database models Collective as a provenance-preserving observation system. A document is a container; an assertion is the unit that can be compared, cited, reviewed, and placed on a timeline.

The current schema is **v3**. It is implemented in `packages/db/src/schema/` and uses Postgres/Drizzle. The schema deliberately keeps official records and community observations in the same evidence graph while retaining their provenance and source lane.

## Epistemic rules

- Original documents and media remain authoritative artifacts. Derived text, OCR, descriptions, and narratives are never substitutes for them.
- Ingestion records provenance only. It does not assign truth.
- Extractors write to staging (`claim_candidates`); only review publication writes canonical claims.
- Approved claims are append-only. Conflicts coexist and are represented by `claim_links` and verdict snapshots.
- `verdicts` are deterministic, explainable summaries over a set of claims. They are not LLM output and do not overwrite claims.
- A public narrative is a rendering of approved claims and verdicts. It carries the IDs of its basis claims.
- Field reports are structured observations, not votes or comments. They become claims with `field_report_id` provenance.
- Trust is multi-dimensional: provenance, specificity, recency, directness, verifiability, independence, corroboration, and consistency are stored/explained separately. There is no canonical single trust score.

## Core graph

```text
source ──< document ──< document_page
                         │
                         └──< claim_candidate ──publish──> claim
                                                        │
entity <──────────────── subject/object ────────────────┘
  │                                                     │
  └── entity_relation                              claim_link
                                                        │
                                                  verdict snapshot

field_report ──< media
      │
      └── claim (same canonical claim model, field_report provenance)
```

## Tables

### Sources and normalized artifacts

```text
sources
  id, name, publisher, type, url, country_code, county,
  trust_tier(official|independent|community), first_seen_at

source.type
  audit | procurement | budget | press | news | community |
  official_database | civil_society | citizen_observation |
  photo | video | social_post

documents
  id, source_id, title, doc_type, fiscal_year, url, published_at,
  retrieved_at, sha256, storage_key, byte_size, page_count,
  vault_state, supersedes_id, extraction_state, notes

document_pages
  id, document_id, page_number UNIQUE PER DOCUMENT, text,
  char_count, metadata, created_at
```

The original bytes are stored in object storage when configured (Cloudflare R2 through the S3-compatible API). Postgres stores metadata and normalized page text for citation and extraction. A new version gets a new document row and points to its predecessor through `supersedes_id`.

### Canonical entities

```text
entities
  id, type(project|site|organization|institution|contract|person),
  canonical_name, description, identifiers, country_code, county, created_at

entity_aliases
  id, entity_id, alias, alias_normalized, source_id,
  first_seen, last_seen, confidence

entity_relations
  id, from_entity_id, to_entity_id,
  relation(site_of|part_of|managed_by|implemented_by|concerns|same_as),
  first_seen, last_seen

project_details
  entity_id, case_id, sector, ocds_id, gpris_id
site_details
  entity_id, ward, sub_county, lat, lng, location_note
organization_details
  entity_id, role, registration_no, is_unnamed
institution_details
  entity_id, kind, jurisdiction, mandate, contact_channels, ati_eligible
```

Names extracted from a source remain in `claim_candidates.subject_name_raw` and `object_name_raw`. The resolver may attach canonical entity IDs, a method, and a score. Unresolved names remain reviewable; they are never silently assigned to an arbitrary project.

### Canonical assertions and evidence links

```text
claims
  id, subject_entity_id, predicate, object_entity_id,
  value_text, value_numeric, value_unit, value_date, value_status, value_pct,
  assertion, stage, span,
  document_id NULL, media_id NULL, field_report_id NULL,
  observed_at, published_at, extracted_at, first_seen, last_seen,
  extraction_method(llm|rule|manual), confidence, dimensions,
  review_state, reviewed_by, reviewed_at, review_action, review_note,
  from_candidate_id, created_at

claim.predicate
  asserted_status | tender_published | contract_awarded_to | contract_value |
  budget_allocated | payment_made | expected_completion | completion_claimed |
  progress_reported | inspection_finding | delivery_observed | observed_status |
  managed_by | implemented_by | located_in | commissioned | demolished | operational

claim.stage
  planning | tender | award | contract | implementation | completion

claim_links
  id, from_claim_id, to_claim_id,
  relation(supports|contradicts|updates|same_finding),
  rationale, created_by(engine|human), created_at
```

Each canonical claim has one provenance lane: a document span, a media artifact, or a field report. `span` contains the location of the evidence, such as `{page, excerpt, start, end}` or media timing/frame metadata. The original artifact is retained separately.

### Community observation and media

```text
field_reports
  id, subject_entity_id, user_id NULL, observed_status, answers,
  comment, lat, lng, gps_accuracy_m, photo_keys, audio_keys,
  captured_at, submitted_at, client_uuid UNIQUE,
  channel(pwa|ussd|whatsapp|voice),
  corroboration_state(unverified|corroborated|reviewed), is_demo

media
  id, kind(image|audio|video), title, source_id, vault_key, sha256,
  byte_size, mime, captured_at, lat, lng, exif, derived_text, derived_kind,
  field_report_id, uploaded_by, created_at
```

The PWA compresses images and re-encodes them before upload to remove EXIF. Reports enter an IndexedDB outbox with a client UUID, are uploaded through a presigned R2 URL when available, and are submitted idempotently. Background Sync is an enhancement; app-open and online-event retries are the fallback.

### Staged extraction and review

```text
claim_candidates
  id, document_id NULL, media_id NULL, field_report_id NULL,
  subject_name_raw, subject_entity_id, predicate,
  object_name_raw, object_entity_id,
  value fields, assertion, stage, span,
  extractor, model, prompt_version, confidence,
  validation, resolution,
  status(pending|needs_review|approved|rejected|published),
  decided_by, decided_at, decision_note, published_claim_id,
  fingerprint UNIQUE, created_at

extraction_runs
  id, document_id NULL, media_id NULL, extractor, model, prompt_version,
  tokens_in, tokens_out, cost_usd, duration_ms,
  status(success|failed|partial), created_at
```

The review API is restricted to authenticated reviewer/admin users. Public case queries only expose canonical claims in `review_state = approved`.

### Reconciliation, uncertainty, and action

```text
verdicts
  id, subject_entity_id,
  aspect(budget|award|payments|delivery|current_state),
  verdict(corroborated|contradicted|unverifiable|partially_corroborated),
  summary, basis_claim_ids uuid[], gaps jsonb,
  inputs_hash, computed_at

evidence_requests
  id, subject_entity_id,
  kind(document|observation|expert|official_confirmation),
  question, rationale, aspect, priority,
  status(open|fulfilled|dismissed), fulfilled_by_claim_id,
  generated_by, created_at

action_items
  id, subject_entity_id, institution_entity_id,
  kind(ati_request|oversight_referral|evidence_needed|field_verification),
  title, body_template, priority, status(open|done|dismissed),
  generated_by, created_at
```

A recomputation pass refreshes claim dimensions, creates a new verdict snapshot when the input hash changes, and regenerates open engine evidence requests while preserving fulfilled history. This is the loop from uncertainty to community/institutional action and back to new evidence.

### Authentication and auditability

Better Auth owns the `user`, `session`, `account`, and `verification` tables through its Drizzle adapter. The configured plugins are anonymous sessions for reporting, admin roles for review, and magic links for reviewer sign-in. `ingest_events` records system, extractor, reviewer, and observer actions.

## Lifecycle

1. Create the source/document row before parsing; retain the raw artifact even when extraction fails.
2. Normalize pages/media metadata without changing the original.
3. Extract typed candidate assertions with exact source spans and raw entity names.
4. Resolve entities deterministically where possible; stage ambiguous results for review.
5. Validate spans and structured values; publish only through the reviewer gate.
6. Recompute dimensions, verdict snapshots, conflicts, and evidence requests.
7. Render the case file: narrative, official lane, independent lane, community lane, conflicts, supported assessments, timeline, and actions.
8. Accept structured observations and media; feed them through the same claim/reconciliation loop.

## Standards and external records

GPRIS and PPRA/e-GPS remain official-record sources; Collective is the independent observation and reconciliation layer beside them. The model uses OCDS-inspired lifecycle vocabulary and retains future join fields such as `ocds_id` and `gpris_id`, but it does not attempt to replace those systems or claim that a source is true merely because it is official.

PostGIS geography columns are a later deployment upgrade. The current schema keeps `lat`/`lng` for map rendering and JSON boundaries, so spatial indexing must not be described as active until that migration is applied.
