import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { entities } from "./entities";
import {
  claimPredicate,
  claimStage,
  extractionMethod,
  linkCreator,
  linkRelation,
  observedStatus,
  reviewAction,
  reviewState,
  verdictAspect,
  verdictValue,
} from "./enums";
import { documents } from "./registry";

/**
 * Claims — generalized assertions about reality. The fundamental object of the
 * system (a document is only a container). Subject–predicate–object, always with
 * provenance, append-only with first_seen/last_seen (the statement model):
 * conflicting claims from different sources COEXIST in the data; resolution
 * happens at render time (verdicts), never by overwriting.
 *
 * provenance is exactly ONE of: document+span, media+span, field_report.
 */
export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => entities.id),
    predicate: claimPredicate("predicate").notNull(),
    objectEntityId: uuid("object_entity_id").references(() => entities.id),

    // literal values (used when predicate carries a value rather than an entity)
    valueText: text("value_text"),
    valueNumeric: bigint("value_numeric", { mode: "number" }),
    valueUnit: text("value_unit"),
    valueDate: date("value_date"),
    valueStatus: observedStatus("value_status"),
    valuePct: integer("value_pct"),

    assertion: text("assertion").notNull(),
    stage: claimStage("stage").notNull(),

    // provenance — one of these carries the claim's source
    documentId: uuid("document_id").references(() => documents.id),
    mediaId: uuid("media_id"),
    fieldReportId: uuid("field_report_id"),
    /** {page, excerpt, start, end} | {t} seconds for audio/video | {frame} for video */
    span: jsonb("span").notNull(),

    observedAt: date("observed_at"),
    publishedAt: date("published_at"),
    extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow(),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),

    extractionMethod: extractionMethod("extraction_method").notNull(),
    confidence: numeric("confidence"),

    /** computed evidence dimensions (see packages/api/lib/dimensions.ts) */
    dimensions: jsonb("dimensions"),

    reviewState: reviewState("review_state").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewAction: reviewAction("review_action"),
    reviewNote: text("review_note"),
    /** set when a claim was created by publishing a staged candidate */
    fromCandidateId: uuid("from_candidate_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("claims_subject_idx").on(t.subjectEntityId, t.predicate),
    index("claims_object_idx").on(t.objectEntityId),
    index("claims_document_idx").on(t.documentId),
  ],
);

export const claimLinks = pgTable(
  "claim_links",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromClaimId: uuid("from_claim_id")
      .notNull()
      .references(() => claims.id),
    toClaimId: uuid("to_claim_id")
      .notNull()
      .references(() => claims.id),
    relation: linkRelation("relation").notNull(),
    rationale: text("rationale"),
    createdBy: linkCreator("created_by").notNull().default("engine"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("claim_links_pair_idx").on(t.fromClaimId, t.toClaimId)],
);

export const verdicts = pgTable(
  "verdicts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => entities.id),
    aspect: verdictAspect("aspect").notNull(),
    verdict: verdictValue("verdict").notNull(),
    summary: text("summary").notNull(),
    basisClaimIds: uuid("basis_claim_ids").array().notNull(),
    gaps: jsonb("gaps").notNull(),
    inputsHash: text("inputs_hash").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verdicts_subject_idx").on(t.subjectEntityId, t.aspect, t.computedAt)],
);
