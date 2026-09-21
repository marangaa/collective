import {
  boolean,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { entityRelationKind, entityType, institutionKind, partyRole } from "./enums";
import { sources } from "./registry";

/**
 * Canonical entities — the subjects and objects of every claim.
 * A place (site) and the record of works on it (project) are deliberately
 * separate: GPRIS and audits publish many project records per facility over
 * the years, while observations and photos are about the place itself.
 */
export const entities = pgTable(
  "entities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: entityType("type").notNull(),
    canonicalName: text("canonical_name").notNull(),
    description: text("description"),
    identifiers: jsonb("identifiers").notNull().default({}),
    countryCode: text("country_code").notNull().default("KE"),
    county: text("county"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("entities_type_idx").on(t.type),
    index("entities_name_idx").on(t.canonicalName),
  ],
);

/** Every surface form of an entity seen in any source ("Kawangware HC", "XYZ Ltd.") —
 *  this is what entity resolution matches against, with provenance of who used it. */
export const entityAliases = pgTable(
  "entity_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id),
    alias: text("alias").notNull(),
    aliasNormalized: text("alias_normalized").notNull(),
    sourceId: uuid("source_id").references(() => sources.id),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    confidence: doublePrecision("confidence").notNull().default(1),
  },
  (t) => [
    uniqueIndex("entity_aliases_unique_idx").on(t.entityId, t.aliasNormalized),
    index("entity_aliases_norm_idx").on(t.aliasNormalized),
  ],
);

/** Structural links between entities that are not claims themselves
 *  (site_of, part_of). Facts like "managed_by" live in claims with provenance. */
export const entityRelations = pgTable(
  "entity_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromEntityId: uuid("from_entity_id")
      .notNull()
      .references(() => entities.id),
    toEntityId: uuid("to_entity_id")
      .notNull()
      .references(() => entities.id),
    relation: entityRelationKind("relation").notNull(),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("entity_relations_unique_idx").on(t.fromEntityId, t.toEntityId, t.relation)],
);

/** Type extensions — thin tables keyed by entity id. */
export const projectDetails = pgTable("project_details", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  caseId: uuid("case_id"),
  sector: text("sector").notNull().default("health"),
  ocdsId: text("ocds_id"),
  gprisId: text("gpris_id"),
});

export const siteDetails = pgTable("site_details", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  ward: text("ward"),
  subCounty: text("sub_county"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  locationNote: text("location_note"),
});

export const organizationDetails = pgTable("organization_details", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  role: partyRole("role"),
  registrationNo: text("registration_no"),
  isUnnamed: boolean("is_unnamed").notNull().default(false),
});

export const institutionDetails = pgTable("institution_details", {
  entityId: uuid("entity_id")
    .primaryKey()
    .references(() => entities.id),
  kind: institutionKind("kind").notNull(),
  jurisdiction: text("jurisdiction").notNull().default("Nairobi City County"),
  mandate: text("mandate"),
  contactChannels: jsonb("contact_channels").notNull().default({}),
  atiEligible: boolean("ati_eligible").notNull().default(false),
});
