import {
  boolean,
  doublePrecision,
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

import {
  actorKind,
  corroborationState,
  extractionMethod,
  institutionKind,
  nextStepKind,
  nextStepStatus,
  observedStatus,
  reportChannel,
} from "./enums";
import { documents, projects } from "./registry";

export const fieldReports = pgTable(
  "field_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    userId: text("user_id"),
    observedStatus: observedStatus("observed_status").notNull(),
    comment: text("comment"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    gpsAccuracyM: integer("gps_accuracy_m"),
    photoKeys: jsonb("photo_keys").notNull().default([]),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    /** Client-generated idempotency key — safe retries from the offline outbox. */
    clientUuid: text("client_uuid").notNull(),
    channel: reportChannel("channel").notNull().default("pwa"),
    corroborationState: corroborationState("corroboration_state").notNull().default("unverified"),
    isDemo: boolean("is_demo").notNull().default(false),
  },
  (t) => [
    uniqueIndex("field_reports_client_uuid_idx").on(t.clientUuid),
    index("field_reports_project_idx").on(t.projectId, t.submittedAt),
  ],
);

export const institutions = pgTable("institutions", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: institutionKind("kind").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("Nairobi City County"),
  mandate: text("mandate"),
  contactChannels: jsonb("contact_channels").notNull().default({}),
  atiEligible: boolean("ati_eligible").notNull().default(false),
});

export const nextSteps = pgTable(
  "next_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    institutionId: uuid("institution_id").references(() => institutions.id),
    kind: nextStepKind("kind").notNull(),
    title: text("title").notNull(),
    bodyTemplate: text("body_template").notNull(),
    priority: integer("priority").notNull().default(3),
    status: nextStepStatus("status").notNull().default("open"),
  },
  (t) => [index("next_steps_project_idx").on(t.projectId)],
);

export const extractionRuns = pgTable("extraction_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
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

export const ingestEvents = pgTable("ingest_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actor: actorKind("actor").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
