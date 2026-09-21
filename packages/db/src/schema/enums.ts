import { pgEnum } from "drizzle-orm/pg-core";

export const sourceType = pgEnum("source_type", [
  "audit",
  "procurement",
  "budget",
  "press",
  "news",
  "community",
  "official_database",
  "civil_society",
  "citizen_observation",
  "photo",
  "video",
  "social_post",
]);

export const trustTier = pgEnum("trust_tier", ["official", "independent", "community"]);

export const docType = pgEnum("doc_type", [
  "green_book",
  "budget_estimate",
  "budget_implementation",
  "tender_notice",
  "press_release",
  "news_article",
  "inspection_report",
  "field_photo",
]);

export const extractionState = pgEnum("extraction_state", [
  "pending",
  "extracted",
  "failed",
  "skipped",
]);

export const vaultState = pgEnum("vault_state", ["pending", "vaulted", "failed"]);

export const caseStatus = pgEnum("case_status", ["open", "monitoring", "resolved"]);

// ── v3: entity model ────────────────────────────────────────────────────────
export const entityType = pgEnum("entity_type", [
  "project",
  "site",
  "organization",
  "institution",
  "contract",
  "person",
]);

export const entityRelationKind = pgEnum("entity_relation_kind", [
  "site_of",
  "part_of",
  "managed_by",
  "implemented_by",
  "concerns",
  "same_as",
]);

export const partyRole = pgEnum("party_role", [
  "contracting_authority",
  "contractor",
  "auditor",
  "funder",
  "oversight",
]);

// ── v3: generalized assertion predicates (OCDS-aligned where applicable) ───
export const claimPredicate = pgEnum("claim_predicate", [
  "asserted_status",
  "tender_published",
  "contract_awarded_to",
  "contract_value",
  "budget_allocated",
  "payment_made",
  "expected_completion",
  "completion_claimed",
  "progress_reported",
  "inspection_finding",
  "delivery_observed",
  "observed_status",
  "managed_by",
  "implemented_by",
  "located_in",
  "commissioned",
  "demolished",
  "operational",
]);

export const claimStage = pgEnum("claim_stage", [
  "planning",
  "tender",
  "award",
  "contract",
  "implementation",
  "completion",
]);

export const observedStatus = pgEnum("observed_status", [
  "operational",
  "partially_built",
  "stalled",
  "abandoned",
  "not_started",
  "unusable",
  "unknown",
]);

export const extractionMethod = pgEnum("extraction_method", ["llm", "rule", "manual"]);

export const reviewState = pgEnum("review_state", ["pending", "approved", "rejected"]);

export const reviewAction = pgEnum("review_action", ["approved", "edited", "rejected"]);

export const candidateStatus = pgEnum("candidate_status", [
  "pending",
  "needs_review",
  "approved",
  "rejected",
  "published",
]);

export const linkRelation = pgEnum("link_relation", [
  "supports",
  "contradicts",
  "updates",
  "same_finding",
]);

export const linkCreator = pgEnum("link_creator", ["engine", "human"]);

export const verdictAspect = pgEnum("verdict_aspect", [
  "budget",
  "award",
  "payments",
  "delivery",
  "current_state",
]);

export const verdictValue = pgEnum("verdict_value", [
  "corroborated",
  "contradicted",
  "unverifiable",
  "partially_corroborated",
]);

export const reportChannel = pgEnum("report_channel", ["pwa", "ussd", "whatsapp", "voice"]);

export const corroborationState = pgEnum("corroboration_state", [
  "unverified",
  "corroborated",
  "reviewed",
]);

export const mediaKind = pgEnum("media_kind", ["image", "audio", "video"]);

export const derivedKind = pgEnum("derived_kind", [
  "transcript",
  "ocr",
  "description",
  "frame_note",
]);

export const institutionKind = pgEnum("institution_kind", [
  "county_exec",
  "county_assembly",
  "oversight",
  "regulator",
  "commission",
  "cso",
  "judiciary",
]);

export const actionKind = pgEnum("action_kind", [
  "ati_request",
  "oversight_referral",
  "evidence_needed",
  "field_verification",
]);

export const actionStatus = pgEnum("action_status", ["open", "done", "dismissed"]);

export const requestKind = pgEnum("request_kind", [
  "document",
  "observation",
  "expert",
  "official_confirmation",
]);

export const requestStatus = pgEnum("request_status", ["open", "fulfilled", "dismissed"]);

export const actorKind = pgEnum("actor_kind", [
  "system",
  "extractor",
  "reviewer",
  "observer",
]);

