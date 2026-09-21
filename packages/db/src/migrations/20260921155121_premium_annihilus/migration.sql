ALTER TYPE "source_type" ADD VALUE 'official_database';--> statement-breakpoint
ALTER TYPE "source_type" ADD VALUE 'civil_society';--> statement-breakpoint
ALTER TYPE "source_type" ADD VALUE 'citizen_observation';--> statement-breakpoint
ALTER TYPE "source_type" ADD VALUE 'photo';--> statement-breakpoint
ALTER TYPE "source_type" ADD VALUE 'video';--> statement-breakpoint
ALTER TYPE "source_type" ADD VALUE 'social_post';--> statement-breakpoint
CREATE TABLE "document_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_id" uuid NOT NULL,
	"page_number" integer NOT NULL,
	"text" text NOT NULL,
	"char_count" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "document_pages_unique_idx" ON "document_pages" ("document_id","page_number");--> statement-breakpoint
CREATE INDEX "document_pages_document_idx" ON "document_pages" ("document_id");--> statement-breakpoint
ALTER TABLE "document_pages" ADD CONSTRAINT "document_pages_document_id_documents_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id");