# 03, Data model: claims, evidence, and state

The database treats collective as a system that keeps evidence, not a pile of documents. A document is a container. A claim is the thing you can compare, quote, review, and put on a timeline.

The schema is at v3. It lives in `packages/db/src/schema/` and runs on Postgres through Drizzle. Official records and community observations sit in the same graph, but each one keeps its own lane so you always know where a claim came from.

## The rules

- The original document or photo is always the authority. Extracted text, transcripts, and summaries never replace it.
- Saving a file records where it came from. It says nothing about whether it is true.
- The model writes to staging (`claim_candidates`). Only a reviewer publishing writes real claims.
- Approved claims are never edited or deleted. When claims disagree, the disagreement is stored as links and verdict snapshots.
- A verdict is a plain, repeatable summary over a set of claims. It is not model output and it never overwrites claims.
- The public story is rendered from approved claims and verdicts, and it carries the IDs of the claims it used.
- A field report is an observation with a structure, not a comment or a vote. It becomes a claim like any other, with the report as its source.
- Trust has eight parts (where it came from, how specific it is, how recent, how direct, how checkable, how independent, how corroborated, how consistent). Each is stored on its own. There is no single trust score.

## The shape of it

```text
source has many documents, each document has many pages.
A page holds claim candidates, and publishing turns a candidate into a claim.
Claims point at entities as their subject or object.
Entities link to each other, claims link to each other, and claims roll up into verdicts.

A field report holds photos and also becomes a claim, with the report as its source.
```

## Tables

Sources and files:

```text
sources
  id, name, publisher, type, url, country_code, county,
  trust_tier (official, independent, or community), first_seen_at

source types
  audit, procurement, budget, press, news, community,
  official_database, civil_society, citizen_observation,
  photo, video, social_post

documents
  id, source_id, title, doc_type, fiscal_year, url, published_at,
  retrieved_at, sha256, storage_key, byte_size, page_count,
  vault_state, supersedes_id, extraction_state, notes

document_pages
  id, document_id, page_number (unique per document), text,
  char_count, metadata, created_at
```

The original file sits in object storage when configured (Cloudflare R2 over its S3-style API). Postgres keeps metadata plus the page text used for quotes and extraction. A new version of a document is a new row that points back at the old one through `supersedes_id`.

Entities (the things claims talk about):

```text
entities
  id, type (project, site, organization, institution, contract, person),
  canonical_name, description, identifiers, country_code, county, created_at

entity_aliases
  id, entity_id, alias, alias_normalized, source_id,
  first_seen, last_seen, confidence

entity_relations
  id, from_entity_id, to_entity_id,
  relation (site_of, part_of, managed_by, implemented_by, concerns, same_as),
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

Names as written in a source stay in the candidate's raw name fields. The resolver can attach a canonical entity with a method and a score. Names it cannot place stay visible for review. They are never quietly assigned to some project.

Claims and the links between them:

```text
claims
  id, subject_entity_id, predicate, object_entity_id,
  value_text, value_numeric, value_unit, value_date, value_status, value_pct,
  assertion, stage, span,
  document_id, media_id, field_report_id (exactly one of these is set),
  observed_at, published_at, extracted_at, first_seen, last_seen,
  extraction_method (llm, rule, or manual), confidence, dimensions,
  review_state, reviewed_by, reviewed_at, review_action, review_note,
  from_candidate_id, created_at

claim predicates
  asserted_status, tender_published, contract_awarded_to, contract_value,
  budget_allocated, payment_made, expected_completion, completion_claimed,
  progress_reported, inspection_finding, delivery_observed, observed_status,
  managed_by, implemented_by, located_in, commissioned, demolished, operational

claim stages
  planning, tender, award, contract, implementation, completion

claim_links
  id, from_claim_id, to_claim_id,
  relation (supports, contradicts, updates, same_finding),
  rationale, created_by (engine or human), created_at
```

Each claim has one source lane: a passage in a document, a photo or recording, or a field report. The `span` field says where the evidence sits, for example page plus quote, or time plus frame for media. The original file is kept separately.

Community observations and media:

```text
field_reports
  id, subject_entity_id, user_id (often empty), observed_status, answers,
  comment, lat, lng, gps_accuracy_m, photo_keys, audio_keys,
  captured_at, submitted_at, client_uuid (unique, makes retries safe),
  channel (pwa, ussd, whatsapp, voice),
  corroboration_state (unverified, corroborated, reviewed), is_demo

media
  id, kind (image, audio, video), title, source_id, vault_key, sha256,
  byte_size, mime, captured_at, lat, lng, exif, derived_text, derived_kind,
  field_report_id, uploaded_by, created_at
```

The app shrinks photos and re-saves them before upload, which drops the location data. Reports wait in a phone-side outbox under a client ID, photos upload through a signed URL when storage is set up, and submitting twice with the same client ID creates one report, not two. Background Sync helps where it exists; opening the app or coming back online covers the rest.

Staging and review:

```text
claim_candidates
  id, document_id, media_id, field_report_id (one source),
  subject_name_raw, subject_entity_id, predicate,
  object_name_raw, object_entity_id,
  value fields, assertion, stage, span,
  extractor, model, prompt_version, confidence,
  validation, resolution,
  status (pending, needs_review, approved, rejected, published),
  decided_by, decided_at, decision_note, published_claim_id,
  fingerprint (unique, stops duplicates), created_at

extraction_runs
  id, document_id, media_id, extractor, model, prompt_version,
  tokens_in, tokens_out, cost_usd, duration_ms,
  status (success, failed, partial), created_at
```

Only signed-in reviewers and admins can use the review API. Public queries only ever see claims with `review_state = approved`.

Verdicts, gaps, and actions:

```text
verdicts
  id, subject_entity_id,
  aspect (budget, award, payments, delivery, current_state),
  verdict (corroborated, contradicted, unverifiable, partially_corroborated),
  summary, basis_claim_ids, gaps,
  inputs_hash, computed_at

evidence_requests
  id, subject_entity_id,
  kind (document, observation, expert, official_confirmation),
  question, rationale, aspect, priority,
  status (open, fulfilled, dismissed), fulfilled_by_claim_id,
  generated_by, created_at

action_items
  id, subject_entity_id, institution_entity_id,
  kind (ati_request, oversight_referral, evidence_needed, field_verification),
  title, body_template, priority, status (open, done, dismissed),
  generated_by, created_at
```

Each recompute refreshes the claim scores, stores a new verdict when the inputs changed, and rebuilds the open machine-made evidence requests while leaving resolved ones alone. That loop, gap to request to new evidence to new verdict, is how uncertainty turns into action and back into evidence.

Login and audit:

Better Auth owns the `user`, `session`, `account`, and `verification` tables through its Drizzle adapter. We use anonymous sessions for reporting, roles for reviewers, and magic links for reviewer sign-in. The `ingest_events` table logs what the system, the extractor, reviewers, and observers did.

## The lifecycle, in order

1. Create the source and document rows first. Keep the raw file even if reading it fails.
2. Split out pages and media metadata without touching the original.
3. Pull out typed candidate claims with exact quotes and names as written.
4. Match names to entities where the match is solid. Leave the rest for a person.
5. Check quotes and values. Publish only through review.
6. Recompute scores, verdicts, conflicts, and evidence requests.
7. Render the case file: the story, the three lanes (official, independent, community), the conflicts, the supported assessments, the timeline, and the actions.
8. Take in observations and photos through the same loop as everything else.

## Outside standards

GPRIS and the procurement authority stay the official record. Collective sits next to them as the independent layer that compares and reconciles. The schema borrows lifecycle words from the Open Contracting Data Standard and keeps join fields like `ocds_id` and `gpris_id` for later, but it does not replace those systems, and it never treats an official source as true just because it is official.

Map columns for PostGIS come later. For now the schema keeps plain `lat`/`lng` and JSON boundaries, so spatial indexing should not be described as live until that migration lands.
