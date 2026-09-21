import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { entities } from "./entities";
import {
  candidateStatus,
  claimPredicate,
  claimStage,
  extractionMethod,
  observedStatus,
  requestKind,
  requestStatus,
  verdictAspect,
} from "./enums";
import { claims } from "./evidence";
import { documents } from "./registry";

/**
 * Claim candidates — the STAGING layer. Extraction writes here and nowhere else.
 * A candidate becomes a claim only through the human review gate (candidateStatus
 * transitions + review audit fields). This separation is the product's epistemics
 * in schema form: AI proposes, rules validate, humans approve.
 */
export const claimCandidates = pgTable(
  "claim_candidates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    documentId: uuid("document_id").references(() => documents.id),
    mediaId: uuid("media_id"),
    fieldReportId: uuid("field_report_id"),

    // subject/object as extracted (raw), plus resolved entity links when found
    subjectNameRaw: text("subject_name_raw").notNull(),
    subjectEntityId: uuid("subject_entity_id").references(() => entities.id),
    predicate: claimPredicate("predicate").notNull(),
    objectNameRaw: text("object_name_raw"),
    objectEntityId: uuid("object_entity_id").references(() => entities.id),

    valueText: text("value_text"),
    valueNumeric: numeric("value_numeric"),
    valueUnit: text("value_unit"),
    valueDate: text("value_date"),
    valueStatus: observedStatus("value_status"),
    valuePct: integer("value_pct"),

    assertion: text("assertion").notNull(),
    stage: claimStage("stage").notNull(),
    span: jsonb("span").notNull(),

    extractor: extractionMethod("extractor").notNull(),
    model: text("model"),
    promptVersion: text("prompt_version"),
    confidence: numeric("confidence"),

    /** deterministic checks: {span_verified, page_exists, chars_per_page_ok, ...} */
    validation: jsonb("validation").notNull().default({}),
    /** entity resolution result: {method, score, matched} */
    resolution: jsonb("resolution"),

    status: candidateStatus("status").notNull().default("pending"),
    decidedBy: text("decided_by"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decisionNote: text("decision_note"),
    publishedClaimId: uuid("published_claim_id").references(() => claims.id),

    /** idempotency: documentId + predicate + normalized excerpt hash */
    fingerprint: text("fingerprint").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("claim_candidates_fingerprint_idx").on(t.fingerprint),
    index("claim_candidates_status_idx").on(t.status),
    index("claim_candidates_document_idx").on(t.documentId),
  ],
);

/** Evidence requests — the system identifying its own uncertainty and asking
 *  the community or institutions to resolve it. Generated from conflicts/gaps. */
export const evidenceRequests = pgTable(
  "evidence_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => entities.id),
    kind: requestKind("kind").notNull(),
    question: text("question").notNull(),
    rationale: text("rationale").notNull(),
    aspect: verdictAspect("aspect"),
    priority: integer("priority").notNull().default(3),
    status: requestStatus("status").notNull().default("open"),
    fulfilledByClaimId: uuid("fulfilled_by_claim_id").references(() => claims.id),
    generatedBy: text("generated_by").notNull().default("engine"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("evidence_requests_subject_idx").on(t.subjectEntityId, t.status)],
);

/** The AI-usage ledger: every extraction run with model, prompt version, tokens,
 *  cost, duration. This is the transparency record for our own automation. */
export const extractionRuns = pgTable("extraction_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  mediaId: uuid("media_id"),
  extractor: extractionMethod("extractor").notNull(),
  model: text("model"),
  promptVersion: text("prompt_version"),
  tokensIn: integer("tokens_in"),
  tokensOut: integer("tokens_out"),
  costUsd: numeric("cost_usd"),
  durationMs: integer("duration_ms"),
  status: text("status", { enum: ["success", "failed", "partial"] }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
