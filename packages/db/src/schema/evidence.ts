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

import {
  claimKind,
  claimStage,
  extractionMethod,
  linkCreator,
  linkRelation,
  observedStatus,
  reviewState,
  verdictAspect,
  verdictValue,
} from "./enums";
import { documents, parties, projects } from "./registry";

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    partyId: uuid("party_id").references(() => parties.id),
    stage: claimStage("stage").notNull(),
    kind: claimKind("kind").notNull(),
    assertion: text("assertion").notNull(),
    amountKes: bigint("amount_kes", { mode: "number" }),
    pctComplete: integer("pct_complete"),
    observedStatus: observedStatus("observed_status"),
    eventDate: date("event_date"),
    /** {page, excerpt, start, end} — the verbatim evidence span. No span, no claim. */
    span: jsonb("span").notNull(),
    extractionMethod: extractionMethod("extraction_method").notNull(),
    confidence: numeric("confidence"),
    reviewState: reviewState("review_state").notNull().default("pending"),
    reviewedBy: text("reviewed_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("claims_project_idx").on(t.projectId),
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
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    aspect: verdictAspect("aspect").notNull(),
    verdict: verdictValue("verdict").notNull(),
    summary: text("summary").notNull(),
    basisClaimIds: uuid("basis_claim_ids").array().notNull(),
    gaps: jsonb("gaps").notNull(),
    inputsHash: text("inputs_hash").notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verdicts_project_idx").on(t.projectId, t.aspect, t.computedAt)],
);
