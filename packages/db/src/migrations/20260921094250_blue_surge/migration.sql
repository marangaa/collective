CREATE TYPE "actor_kind" AS ENUM('system', 'extractor', 'reviewer');--> statement-breakpoint
CREATE TYPE "case_status" AS ENUM('open', 'monitoring', 'resolved');--> statement-breakpoint
CREATE TYPE "claim_kind" AS ENUM('budget_allocated', 'tender_published', 'award_made', 'payment_made', 'progress_reported', 'completion_claimed', 'inspection_finding', 'delivery_observed');--> statement-breakpoint
CREATE TYPE "claim_stage" AS ENUM('planning', 'tender', 'award', 'contract', 'implementation', 'completion');--> statement-breakpoint
CREATE TYPE "corroboration_state" AS ENUM('unverified', 'corroborated', 'reviewed');--> statement-breakpoint
CREATE TYPE "doc_type" AS ENUM('green_book', 'budget_estimate', 'budget_implementation', 'tender_notice', 'press_release', 'news_article', 'inspection_report', 'field_photo');--> statement-breakpoint
CREATE TYPE "extraction_method" AS ENUM('llm', 'rule', 'manual');--> statement-breakpoint
CREATE TYPE "extraction_state" AS ENUM('pending', 'extracted', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "institution_kind" AS ENUM('county_exec', 'county_assembly', 'oversight', 'regulator', 'commission', 'cso', 'judiciary');--> statement-breakpoint
CREATE TYPE "link_creator" AS ENUM('engine', 'human');--> statement-breakpoint
CREATE TYPE "link_relation" AS ENUM('supports', 'contradicts', 'updates', 'same_finding');--> statement-breakpoint
CREATE TYPE "next_step_kind" AS ENUM('ati_request', 'oversight_referral', 'evidence_needed', 'field_verification');--> statement-breakpoint
CREATE TYPE "next_step_status" AS ENUM('open', 'done', 'dismissed');--> statement-breakpoint
CREATE TYPE "observed_status" AS ENUM('operational', 'partially_built', 'stalled', 'abandoned', 'not_started', 'unusable', 'unknown');--> statement-breakpoint
CREATE TYPE "party_role" AS ENUM('contracting_authority', 'contractor', 'auditor', 'funder', 'oversight');--> statement-breakpoint
CREATE TYPE "report_channel" AS ENUM('pwa', 'ussd', 'whatsapp');--> statement-breakpoint
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
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text,
	"label" text NOT NULL,
	"role" "party_role" NOT NULL,
	"identifiers" jsonb,
	"is_unnamed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"case_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sector" text DEFAULT 'health' NOT NULL,
	"ward" text,
	"sub_county" text,
	"lat" double precision,
	"lng" double precision,
	"location_note" text,
	"ocds_id" text
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
	"project_id" uuid NOT NULL,
	"document_id" uuid NOT NULL,
	"party_id" uuid,
	"stage" "claim_stage" NOT NULL,
	"kind" "claim_kind" NOT NULL,
	"assertion" text NOT NULL,
	"amount_kes" bigint,
	"pct_complete" integer,
	"observed_status" "observed_status",
	"event_date" date,
	"span" jsonb NOT NULL,
	"extraction_method" "extraction_method" NOT NULL,
	"confidence" numeric,
	"review_state" "review_state" DEFAULT 'pending'::"review_state" NOT NULL,
	"reviewed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verdicts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"aspect" "verdict_aspect" NOT NULL,
	"verdict" "verdict_value" NOT NULL,
	"summary" text NOT NULL,
	"basis_claim_ids" uuid[] NOT NULL,
	"gaps" jsonb NOT NULL,
	"inputs_hash" text NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extraction_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid,
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
CREATE TABLE "field_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"user_id" text,
	"observed_status" "observed_status" NOT NULL,
	"comment" text,
	"lat" double precision,
	"lng" double precision,
	"gps_accuracy_m" integer,
	"photo_keys" jsonb DEFAULT '[]' NOT NULL,
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
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"kind" "institution_kind" NOT NULL,
	"jurisdiction" text DEFAULT 'Nairobi City County' NOT NULL,
	"mandate" text,
	"contact_channels" jsonb DEFAULT '{}' NOT NULL,
	"ati_eligible" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "next_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"project_id" uuid NOT NULL,
	"institution_id" uuid,
	"kind" "next_step_kind" NOT NULL,
	"title" text NOT NULL,
	"body_template" text NOT NULL,
	"priority" integer DEFAULT 3 NOT NULL,
	"status" "next_step_status" DEFAULT 'open'::"next_step_status" NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "cases_slug_idx" ON "cases" ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_sha256_idx" ON "documents" ("sha256");--> statement-breakpoint
CREATE INDEX "documents_source_idx" ON "documents" ("source_id");--> statement-breakpoint
CREATE INDEX "projects_case_idx" ON "projects" ("case_id");--> statement-breakpoint
CREATE INDEX "claim_links_pair_idx" ON "claim_links" ("from_claim_id","to_claim_id");--> statement-breakpoint
CREATE INDEX "claims_project_idx" ON "claims" ("project_id");--> statement-breakpoint
CREATE INDEX "claims_document_idx" ON "claims" ("document_id");--> statement-breakpoint
CREATE INDEX "verdicts_project_idx" ON "verdicts" ("project_id","aspect","computed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "field_reports_client_uuid_idx" ON "field_reports" ("client_uuid");--> statement-breakpoint
CREATE INDEX "field_reports_project_idx" ON "field_reports" ("project_id","submitted_at");--> statement-breakpoint
CREATE INDEX "next_steps_project_idx" ON "next_steps" ("project_id");--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_source_id_sources_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_case_id_cases_id_fkey" FOREIGN KEY ("case_id") REFERENCES "cases"("id");--> statement-breakpoint
ALTER TABLE "claim_links" ADD CONSTRAINT "claim_links_from_claim_id_claims_id_fkey" FOREIGN KEY ("from_claim_id") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "claim_links" ADD CONSTRAINT "claim_links_to_claim_id_claims_id_fkey" FOREIGN KEY ("to_claim_id") REFERENCES "claims"("id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_party_id_parties_id_fkey" FOREIGN KEY ("party_id") REFERENCES "parties"("id");--> statement-breakpoint
ALTER TABLE "verdicts" ADD CONSTRAINT "verdicts_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");--> statement-breakpoint
ALTER TABLE "extraction_runs" ADD CONSTRAINT "extraction_runs_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");--> statement-breakpoint
ALTER TABLE "field_reports" ADD CONSTRAINT "field_reports_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");--> statement-breakpoint
ALTER TABLE "next_steps" ADD CONSTRAINT "next_steps_project_id_projects_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id");--> statement-breakpoint
ALTER TABLE "next_steps" ADD CONSTRAINT "next_steps_institution_id_institutions_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id");