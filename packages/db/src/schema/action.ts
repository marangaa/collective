import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { entities } from "./entities";
import {
  actorKind,
  actionKind,
  actionStatus,
  corroborationState,
  derivedKind,
  mediaKind,
  observedStatus,
  reportChannel,
} from "./enums";

/**
 * Field reports — structured community observations. The "crowd as sensors":
 * specific questions, structured answers, optional media. An observation is an
 * append-only report; its claims are created through the same candidate pipeline
 * as any other source (fieldReportId carries the provenance).
 */
export const fieldReports = pgTable(
  "field_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => entities.id),
    userId: text("user_id"),
    observedStatus: observedStatus("observed_status").notNull(),
    /** structured per-question answers: {question_key: value} */
    answers: jsonb("answers").notNull().default({}),
    comment: text("comment"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    gpsAccuracyM: integer("gps_accuracy_m"),
    photoKeys: jsonb("photo_keys").notNull().default([]),
    audioKeys: jsonb("audio_keys").notNull().default([]),
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
    index("field_reports_subject_idx").on(t.subjectEntityId, t.submittedAt),
  ],
);

/**
 * Media artifacts — photos, voice notes, video. The original file is always
 * retained in the vault (vaultKey + sha256); derived text (transcript, OCR,
 * description) is marked as derived and never canonical.
 */
export const media = pgTable(
  "media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    kind: mediaKind("kind").notNull(),
    title: text("title"),
    sourceId: uuid("source_id"),
    vaultKey: text("vault_key"),
    sha256: text("sha256"),
    byteSize: integer("byte_size"),
    mime: text("mime"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    /** EXIF after privacy stripping (GPS kept only if the reporter opted in) */
    exif: jsonb("exif").notNull().default({}),
    derivedText: text("derived_text"),
    derivedKind: derivedKind("derived_kind"),
    fieldReportId: uuid("field_report_id").references(() => fieldReports.id),
    uploadedBy: text("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("media_sha256_idx").on(t.sha256),
    index("media_report_idx").on(t.fieldReportId),
  ],
);

/**
 * Action items — what to DO (institutional action: ATI requests, oversight
 * referrals). Distinct from evidence requests (what to VERIFY). Institution is
 * an entity of type institution.
 */
export const actionItems = pgTable(
  "action_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subjectEntityId: uuid("subject_entity_id")
      .notNull()
      .references(() => entities.id),
    institutionEntityId: uuid("institution_entity_id").references(() => entities.id),
    kind: actionKind("kind").notNull(),
    title: text("title").notNull(),
    bodyTemplate: text("body_template").notNull(),
    priority: integer("priority").notNull().default(3),
    status: actionStatus("status").notNull().default("open"),
    generatedBy: text("generated_by").notNull().default("human"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("action_items_subject_idx").on(t.subjectEntityId)],
);

export const ingestEvents = pgTable("ingest_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  actor: actorKind("actor").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: uuid("entity_id"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
