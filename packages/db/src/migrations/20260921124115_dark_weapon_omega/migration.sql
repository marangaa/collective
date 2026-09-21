CREATE TYPE "action_kind" AS ENUM('ati_request', 'oversight_referral', 'evidence_needed', 'field_verification');--> statement-breakpoint
CREATE TYPE "action_status" AS ENUM('open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "actor_kind" AS ENUM('system', 'extractor', 'reviewer', 'observer');--> statement-breakpoint
CREATE TYPE "candidate_status" AS ENUM('pending', 'needs_review', 'approved', 'rejected', 'published');--> statement-breakpoint
CREATE TYPE "case_status" AS ENUM('open', 'monitoring', 'resolved');--> statement-breakpoint
CREATE TYPE "claim_predicate" AS ENUM('asserted_status', 'tender_published', 'contract_awarded_to', 'contract_value', 'budget_allocated', 'payment_made', 'expected_completion', 'completion_claimed', 'progress_reported', 'inspection_finding', 'delivery_observed', 'observed_status', 'managed_by', 'implemented_by', 'located_in', 'commissioned', 'demolished', 'operational');--> statement-breakpoint
CREATE TYPE "claim_stage" AS ENUM('planning', 'tender', 'award', 'contract', 'implementation', 'completion');--> statement-breakpoint
CREATE TYPE "corroboration_state" AS ENUM('unverified', 'corroborated', 'reviewed');--> statement-breakpoint
CREATE TYPE "derived_kind" AS ENUM('transcript', 'ocr', 'description', 'frame_note');--> statement-breakpoint
CREATE TYPE "doc_type" AS ENUM('green_book', 'budget_estimate', 'budget_implementation', 'tender_notice', 'press_release', 'news_article', 'inspection_report', 'field_photo');--> statement-breakpoint
CREATE TYPE "entity_relation_kind" AS ENUM('site_of', 'part_of', 'managed_by', 'implemented_by', 'concerns', 'same_as');--> statement-breakpoint
CREATE TYPE "entity_type" AS ENUM('project', 'site', 'organization', 'institution', 'contract', 'person');--> statement-breakpoint
CREATE TYPE "extraction_method" AS ENUM('llm', 'rule', 'manual');--> statement-breakpoint
CREATE TYPE "extraction_state" AS ENUM('pending', 'extracted', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "institution_kind" AS ENUM('county_exec', 'county_assembly', 'oversight', 'regulator', 'commission', 'cso', 'judiciary');--> statement-breakpoint
CREATE TYPE "link_creator" AS ENUM('engine', 'human');--> statement-breakpoint
CREATE TYPE "link_relation" AS ENUM('supports', 'contradicts', 'updates', 'same_finding');--> statement-breakpoint
CREATE TYPE "media_kind" AS ENUM('image', 'audio', 'video');--> statement-breakpoint
CREATE TYPE "observed_status" AS ENUM('operational', 'partially_built', 'stalled', 'abandoned', 'not_started', 'unusable', 'unknown');--> statement-breakpoint
CREATE TYPE "party_role" AS ENUM('contracting_authority', 'contractor', 'auditor', 'funder', 'oversight');--> statement-breakpoint
CREATE TYPE "report_channel" AS ENUM('pwa', 'ussd', 'whatsapp', 'voice');--> statement-breakpoint
CREATE TYPE "request_kind" AS ENUM('document', 'observation', 'expert', 'official_confirmation');--> statement-breakpoint
CREATE TYPE "request_status" AS ENUM('open', 'fulfilled', 'dismissed');--> statement-breakpoint
CREATE TYPE "review_action" AS ENUM('approved', 'edited', 'rejected');--> statement-breakpoint
CREATE TYPE "review_state" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "source_type" AS ENUM('audit', 'procurement', 'budget', 'press', 'news', 'community');--> statement-breakpoint
CREATE TYPE "trust_tier" AS ENUM('official', 'independent', 'community');--> statement-breakpoint
CREATE TYPE "vault_state" AS ENUM('pending', 'vaulted', 'failed');--> statement-breakpoint
CREATE TYPE "verdict_aspect" AS ENUM('budget', 'award', 'payments', 'delivery', 'current_state');--> statement-breakpoint
CREATE TYPE "verdict_value" AS ENUM('corroborated', 'contradicted', 'unverifiable', 'partially_corroborated');--> statement-breakpoint
CREATE TABLE "areas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"parent_id" uuid,
	"boundary" jsonb
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"county" text NOT NULL,
	"sector" text NOT NULL,
	"status" "case_status" DEFAULT 'open'::"case_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"doc_type" "doc_type" NOT NULL,
	"fiscal_year" text,
	"url" text,
	"published_at" date,
	"retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sha256" text,
	"storage_key" text,
	"byte_size" bigint,
	"page_count" integer,
	"vault_state" "vault_state" DEFAULT 'pending'::"vault_state" NOT NULL,
	"supersedes_id" uuid,
	"extraction_state" "extraction_state" DEFAULT 'pending'::"extraction_state" NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "schema_meta" (
	"key" text PRIMARY KEY,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"publisher" text NOT NULL,
	"type" "source_type" NOT NULL,
	"url" text,
	"country_code" text DEFAULT 'KE' NOT NULL,
	"county" text,
	"trust_tier" "trust_tier" NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" "entity_type" NOT NULL,
	"canonical_name" text NOT NULL,
	"description" text,
	"identifiers" jsonb DEFAULT '{}' NOT NULL,
	"country_code" text DEFAULT 'KE' NOT NULL,
	"county" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_normalized" text NOT NULL,
	"source_id" uuid,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" double precision DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entity_relations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"from_entity_id" uuid NOT NULL,
	"to_entity_id" uuid NOT NULL,
	"relation" "entity_relation_kind" NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institution_details" (
	"entity_id" uuid PRIMARY KEY,
	"kind" "institution_kind" NOT NULL,
	"jurisdiction" text DEFAULT 'Nairobi City County' NOT NULL,
	"mandate" text,
	"contact_channels" jsonb DEFAULT '{}' NOT NULL,
	"ati_eligible" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_details" (
	"entity_id" uuid PRIMARY KEY,
	"role" "party_role",
	"registration_no" text,
	"is_unnamed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_details" (
	"entity_id" uuid PRIMARY KEY,
	"case_id" uuid,
	"sector" text DEFAULT 'health' NOT NULL,
	"ocds_id" text,
	"gpris_id" text
);
--> statement-breakpoint
CREATE TABLE "site_details" (
	"entity_id" uuid PRIMARY KEY,
	"ward" text,
	"sub_county" text,
	"lat" double precision,
	"lng" double precision,
	"location_note" text
);
--> statement-breakpoint
CREATE TABLE "claim_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"from_claim_id" uuid NOT NULL,
	"to_claim_id" uuid NOT NULL,
	"relation" "link_relation" NOT NULL,
	"rationale" text,
	"created_by" "link_creator" DEFAULT 'engine'::"link_creator" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_entity_id" uuid NOT NULL,
	"predicate" "claim_predicate" NOT NULL,
	"object_entity_id" uuid,
	"value_text" text,
	"value_numeric" bigint,
	"value_unit" text,
	"value_date" date,
	"value_status" "observed_status",
	"value_pct" integer,
	"assertion" text NOT NULL,
	"stage" "claim_stage" NOT NULL,
	"document_id" uuid,
	"media_id" uuid,
	"field_report_id" uuid,
	"span" jsonb NOT NULL,
	"observed_at" date,
	"published_at" date,
	"extracted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"first_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen" timestamp with time zone DEFAULT now() NOT NULL,
	"extraction_method" "extraction_method" NOT NULL,
	"confidence" numeric,
	"dimensions" jsonb,
	"review_state" "review_state" DEFAULT 'pending'::"review_state" NOT NULL,
	"reviewed_by" text,
	"reviewed_at" timestamp with time zone,
	"review_action" "review_action",
	"review_note" text,
	"from_candidate_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_entity_id" uuid NOT NULL,
	"aspect" "verdict_aspect" NOT NULL,
	"verdict" "verdict_value" NOT NULL,
	"summary" text NOT NULL,
	"basis_claim_ids" uuid[] NOT NULL,
	"gaps" jsonb NOT NULL,
	"inputs_hash" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "action_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_entity_id" uuid NOT NULL,
	"institution_entity_id" uuid,
	"kind" "action_kind" NOT NULL,
	"title" text NOT NULL,
	"body_template" text NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"status" "action_status" DEFAULT 'open'::"action_status" NOT NULL,
	"generated_by" text DEFAULT 'human' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_entity_id" uuid NOT NULL,
	"user_id" text,
	"observed_status" "observed_status" NOT NULL,
	"answers" jsonb DEFAULT '{}' NOT NULL,
	"comment" text,
	"lat" double precision,
	"lng" double precision,
	"gps_accuracy_m" integer,
	"photo_keys" jsonb DEFAULT '[]' NOT NULL,
	"audio_keys" jsonb DEFAULT '[]' NOT NULL,
	"captured_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"client_uuid" text NOT NULL,
	"channel" "report_channel" DEFAULT 'pwa'::"report_channel" NOT NULL,
	"corroboration_state" "corroboration_state" DEFAULT 'unverified'::"corroboration_state" NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingest_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor" "actor_kind" NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" "media_kind" NOT NULL,
	"title" text,
	"source_id" uuid,
	"vault_key" text,
	"sha256" text,
	"byte_size" integer,
	"mime" text,
	"captured_at" timestamp with time zone,
	"lat" double precision,
	"lng" double precision,
	"exif" jsonb DEFAULT '{}' NOT NULL,
	"derived_text" text,
	"derived_kind" "derived_kind",
	"field_report_id" uuid,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claim_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid,
	"media_id" uuid,
	"field_report_id" uuid,
	"subject_name_raw" text NOT NULL,
	"subject_entity_id" uuid,
	"predicate" "claim_predicate" NOT NULL,
	"object_name_raw" text,
	"object_entity_id" uuid,
	"value_text" text,
	"value_numeric" numeric,
	"value_unit" text,
	"value_date" text,
	"value_status" "observed_status",
	"value_pct" integer,
	"assertion" text NOT NULL,
	"stage" "claim_stage" NOT NULL,
	"span" jsonb NOT NULL,
	"extractor" "extraction_method" NOT NULL,
	"model" text,
	"prompt_version" text,
	"confidence" numeric,
	"validation" jsonb DEFAULT '{}' NOT NULL,
	"resolution" jsonb,
	"status" "candidate_status" DEFAULT 'pending'::"candidate_status" NOT NULL,
	"decided_by" text,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"published_claim_id" uuid,
	"fingerprint" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"subject_entity_id" uuid NOT NULL,
	"kind" "request_kind" NOT NULL,
	"question" text NOT NULL,
	"rationale" text NOT NULL,
	"aspect" "verdict_aspect",
	"priority" integer DEFAULT 3 NOT NULL,
	"status" "request_status" DEFAULT 'open'::"request_status" NOT NULL,
	"fulfilled_by_claim_id" uuid,
	"generated_by" text DEFAULT 'engine' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid,
	"media_id" uuid,
	"extractor" "extraction_method" NOT NULL,
	"model" text,
	"prompt_version" text,
	"tokens_in" integer,
	"tokens_out" integer,
	"cost_usd" numeric,
	"duration_ms" integer,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"role" text,
	"is_anonymous" boolean DEFAULT false,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cases_slug_idx" ON "cases" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_sha256_idx" ON "documents" ("sha256");--> statement-breakpoint
CREATE INDEX "documents_source_idx" ON "documents" ("source_id");--> statement-breakpoint
CREATE INDEX "entities_type_idx" ON "entities" ("type");--> statement-breakpoint
CREATE INDEX "entities_name_idx" ON "entities" ("canonical_name");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_aliases_unique_idx" ON "entity_aliases" ("entity_id","alias_normalized");--> statement-breakpoint
CREATE INDEX "entity_aliases_norm_idx" ON "entity_aliases" ("alias_normalized");--> statement-breakpoint
CREATE UNIQUE INDEX "entity_relations_unique_idx" ON "entity_relations" ("from_entity_id","to_entity_id","relation");--> statement-breakpoint
CREATE INDEX "claim_links_pair_idx" ON "claim_links" ("from_claim_id","to_claim_id");--> statement-breakpoint
CREATE INDEX "claims_subject_idx" ON "claims" ("subject_entity_id","predicate");--> statement-breakpoint
CREATE INDEX "claims_object_idx" ON "claims" ("object_entity_id");--> statement-breakpoint
CREATE INDEX "claims_document_idx" ON "claims" ("document_id");--> statement-breakpoint
CREATE INDEX "verdicts_subject_idx" ON "verdicts" ("subject_entity_id","aspect","computed_at");--> statement-breakpoint
CREATE INDEX "action_items_subject_idx" ON "action_items" ("subject_entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "field_reports_client_uuid_idx" ON "field_reports" ("client_uuid");--> statement-breakpoint
CREATE INDEX "field_reports_subject_idx" ON "field_reports" ("subject_entity_id","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "media_sha256_idx" ON "media" ("sha256");--> statement-breakpoint
CREATE INDEX "media_report_idx" ON "media" ("field_report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_candidates_fingerprint_idx" ON "claim_candidates" ("fingerprint");--> statement-breakpoint
CREATE INDEX "claim_candidates_status_idx" ON "claim_candidates" ("status");--> statement-breakpoint
CREATE INDEX "claim_candidates_document_idx" ON "claim_candidates" ("document_id");--> statement-breakpoint
CREATE INDEX "evidence_requests_subject_idx" ON "evidence_requests" ("subject_entity_id","status");--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");--> statement-breakpoint
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "entity_aliases" ADD CONSTRAINT "entity_aliases_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_from_entity_id_entities_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "entity_relations" ADD CONSTRAINT "entity_relations_to_entity_id_entities_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "institution_details" ADD CONSTRAINT "institution_details_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "organization_details" ADD CONSTRAINT "organization_details_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "project_details" ADD CONSTRAINT "project_details_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "site_details" ADD CONSTRAINT "site_details_entity_id_entities_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "claim_links" ADD CONSTRAINT "claim_links_from_claim_id_claims_id_fkey" FOREIGN KEY ("from_claim_id") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "claim_links" ADD CONSTRAINT "claim_links_to_claim_id_claims_id_fkey" FOREIGN KEY ("to_claim_id") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_subject_entity_id_entities_id_fkey" FOREIGN KEY ("subject_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_object_entity_id_entities_id_fkey" FOREIGN KEY ("object_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");--> statement-breakpoint
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_subject_entity_id_entities_id_fkey" FOREIGN KEY ("subject_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_subject_entity_id_entities_id_fkey" FOREIGN KEY ("subject_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_institution_entity_id_entities_id_fkey" FOREIGN KEY ("institution_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_subject_entity_id_entities_id_fkey" FOREIGN KEY ("subject_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_field_report_id_field_reports_id_fkey" FOREIGN KEY ("field_report_id") REFERENCES "field_reports"("id");--> statement-breakpoint
ALTER TABLE "claim_candidates" ADD CONSTRAINT "claim_candidates_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");--> statement-breakpoint
ALTER TABLE "claim_candidates" ADD CONSTRAINT "claim_candidates_subject_entity_id_entities_id_fkey" FOREIGN KEY ("subject_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "claim_candidates" ADD CONSTRAINT "claim_candidates_object_entity_id_entities_id_fkey" FOREIGN KEY ("object_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "claim_candidates" ADD CONSTRAINT "claim_candidates_published_claim_id_claims_id_fkey" FOREIGN KEY ("published_claim_id") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_subject_entity_id_entities_id_fkey" FOREIGN KEY ("subject_entity_id") REFERENCES "entities"("id");--> statement-breakpoint
ALTER TABLE "evidence_requests" ADD CONSTRAINT "evidence_requests_fulfilled_by_claim_id_claims_id_fkey" FOREIGN KEY ("fulfilled_by_claim_id") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id");