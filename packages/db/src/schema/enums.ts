import { pgEnum } from "drizzle-orm/pg-core";

export const sourceType = pgEnum("source_type", [
  "audit",
  "procurement",
  "budget",
  "press",
  "news",
  "community",
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

export const partyRole = pgEnum("party_role", [
  "contracting_authority",
  "contractor",
  "auditor",
  "funder",
  "oversight",
]);

// OCDS-aligned stages
export const claimStage = pgEnum("claim_stage", [
  "planning",
  "tender",
  "award",
  "contract",
  "implementation",
  "completion",
]);

export const claimKind = pgEnum("claim_kind", [
  "budget_allocated",
  "tender_published",
  "award_made",
  "payment_made",
  "progress_reported",
  "completion_claimed",
  "inspection_finding",
  "delivery_observed",
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

export const reportChannel = pgEnum("report_channel", ["pwa", "ussd", "whatsapp"]);

export const corroborationState = pgEnum("corroboration_state", [
  "unverified",
  "corroborated",
  "reviewed",
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

export const nextStepKind = pgEnum("next_step_kind", [
  "ati_request",
  "oversight_referral",
  "evidence_needed",
  "field_verification",
]);

export const nextStepStatus = pgEnum("next_step_status", ["open", "done", "dismissed"]);

export const actorKind = pgEnum("actor_kind", ["system", "extractor", "reviewer"]);
