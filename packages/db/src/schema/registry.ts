import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
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

import {
  caseStatus,
  docType,
  extractionState,
  partyRole,
  sourceType,
  trustTier,
  vaultState,
} from "./enums";

export const sources = pgTable("sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  publisher: text("publisher").notNull(),
  type: sourceType("type").notNull(),
  url: text("url"),
  countryCode: text("country_code").notNull().default("KE"),
  county: text("county"),
  trustTier: trustTier("trust_tier").notNull(),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceId: uuid("source_id")
      .notNull()
      .references(() => sources.id),
    title: text("title").notNull(),
    docType: docType("doc_type").notNull(),
    fiscalYear: text("fiscal_year"),
    url: text("url"),
    publishedAt: date("published_at"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull().defaultNow(),
    sha256: text("sha256"),
    storageKey: text("storage_key"),
    byteSize: bigint("byte_size", { mode: "number" }),
    pageCount: integer("page_count"),
    vaultState: vaultState("vault_state").notNull().default("pending"),
    supersedesId: uuid("supersedes_id"),
    extractionState: extractionState("extraction_state").notNull().default("pending"),
    notes: text("notes"),
  },
  (t) => [uniqueIndex("documents_sha256_idx").on(t.sha256), index("documents_source_idx").on(t.sourceId)],
);

/** Kenya administrative geography. boundary is GeoJSON (rendered natively by MapLibre);
 *  PostGIS geography(MultiPolygon) upgrade happens on Neon deploy — see docs/07 ADR-001. */
export const areas = pgTable("areas", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["county", "sub_county", "ward", "constituency"] }).notNull(),
  parentId: uuid("parent_id"),
  boundary: jsonb("boundary"),
});

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    county: text("county").notNull(),
    sector: text("sector").notNull(),
    status: caseStatus("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("cases_slug_idx").on(t.slug)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    name: text("name").notNull(),
    sector: text("sector").notNull().default("health"),
    ward: text("ward"),
    subCounty: text("sub_county"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    locationNote: text("location_note"),
    ocdsId: text("ocds_id"),
  },
  (t) => [index("projects_case_idx").on(t.caseId)],
);

export const parties = pgTable("parties", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name"),
  label: text("label").notNull(),
  role: partyRole("role").notNull(),
  identifiers: jsonb("identifiers"),
  isUnnamed: boolean("is_unnamed").notNull().default(false),
});

export const schemaMeta = pgTable("schema_meta", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});
