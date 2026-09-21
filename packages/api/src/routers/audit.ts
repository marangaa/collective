import { and, desc, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";

import {
  actionItems,
  cases,
  claimLinks,
  claims,
  documents,
  entities,
  entityRelations,
  evidenceRequests,
  fieldReports,
  institutionDetails,
  projectDetails,
  siteDetails,
  sources,
  verdicts,
} from "@collective/db/schema";

import { buildEvidenceNarrative } from "../lib/narrative";
import { publicProcedure, router } from "../index";

export const auditRouter = router({
  listCases: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(cases);
  }),

  /** The full case file: projects + approved claims with citation joins,
   *  evidence links, latest verdict per aspect, timeline inputs, reports, next steps,
   *  and evidence requests. */
  caseFile: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [caseRow] = await ctx.db.select().from(cases).where(eq(cases.slug, input.slug));
      if (!caseRow) throw new Error(`case not found: ${input.slug}`);

      const projectRows = await ctx.db
        .select({
          entity: entities,
          project: projectDetails,
        })
        .from(entities)
        .innerJoin(projectDetails, eq(entities.id, projectDetails.entityId))
        .where(eq(projectDetails.caseId, caseRow.id));

      const projectEntityIds = projectRows.map((p) => p.entity.id);

      const siteRelations = projectEntityIds.length
        ? await ctx.db
            .select({
              projectEntityId: entityRelations.fromEntityId,
              site: siteDetails,
            })
            .from(entityRelations)
            .innerJoin(siteDetails, eq(entityRelations.toEntityId, siteDetails.entityId))
            .where(
              and(
                inArray(entityRelations.fromEntityId, projectEntityIds),
                eq(entityRelations.relation, "concerns"),
              ),
            )
        : [];
      const siteMap = new Map<string, (typeof siteRelations)[number]["site"]>();
      for (const sr of siteRelations) {
        siteMap.set(sr.projectEntityId, sr.site);
      }

      const claimRows = projectEntityIds.length
        ? await ctx.db
            .select({
              claim: claims,
              document: documents,
              source: sources,
            })
            .from(claims)
            .leftJoin(documents, eq(claims.documentId, documents.id))
            .leftJoin(sources, eq(documents.sourceId, sources.id))
            .where(inArray(claims.subjectEntityId, projectEntityIds))
        : [];
      const approved = claimRows.filter((r) => r.claim.reviewState === "approved");

      const claimIds = approved.map((r) => r.claim.id);
      const linkRows = claimIds.length
        ? await ctx.db
            .select()
            .from(claimLinks)
            .where(or(inArray(claimLinks.fromClaimId, claimIds), inArray(claimLinks.toClaimId, claimIds)))
        : [];

      const verdictRows = projectEntityIds.length
        ? await ctx.db
            .select()
            .from(verdicts)
            .where(inArray(verdicts.subjectEntityId, projectEntityIds))
            .orderBy(desc(verdicts.computedAt))
        : [];
      // latest verdict per (subjectEntityId, aspect)
      const latestVerdicts = new Map<string, (typeof verdictRows)[number]>();
      for (const v of verdictRows) {
        const key = `${v.subjectEntityId}:${v.aspect}`;
        if (!latestVerdicts.has(key)) latestVerdicts.set(key, v);
      }

      const reportRows = projectEntityIds.length
        ? await ctx.db
            .select()
            .from(fieldReports)
            .where(inArray(fieldReports.subjectEntityId, projectEntityIds))
            .orderBy(desc(fieldReports.submittedAt))
        : [];

      const actionRows = projectEntityIds.length
        ? await ctx.db
            .select({
              item: actionItems,
              institution: entities,
              institutionDetail: institutionDetails,
            })
            .from(actionItems)
            .leftJoin(entities, eq(actionItems.institutionEntityId, entities.id))
            .leftJoin(institutionDetails, eq(entities.id, institutionDetails.entityId))
            .where(inArray(actionItems.subjectEntityId, projectEntityIds))
        : [];

      const requestRows = projectEntityIds.length
        ? await ctx.db
            .select()
            .from(evidenceRequests)
            .where(
              and(
                inArray(evidenceRequests.subjectEntityId, projectEntityIds),
                eq(evidenceRequests.status, "open"),
              ),
            )
        : [];

      return {
        case: caseRow,
        projects: projectRows.map(({ entity, project }) => {
          const site = siteMap.get(entity.id);
          const projectClaimRows = approved.filter((r) => r.claim.subjectEntityId === entity.id);
          const projectClaims = projectClaimRows.map((r) => ({
            ...r.claim,
            // frontend compatibility aliases:
            projectId: r.claim.subjectEntityId,
            kind: r.claim.predicate,
            amountKes: r.claim.valueNumeric,
            eventDate: r.claim.observedAt ?? r.claim.publishedAt,
            observedStatus: r.claim.valueStatus,
            document: r.document ?? {
              id: "field-report",
              sourceId: "community",
              title: "Community field observation",
              docType: "field_photo",
              fiscalYear: null,
              publishedAt: r.claim.observedAt,
              retrievedAt: r.claim.createdAt,
              url: null,
              sha256: null,
              storageKey: null,
              byteSize: null,
              pageCount: null,
              vaultState: "pending",
              supersedesId: null,
              extractionState: "skipped",
              notes: null,
            },
            source: r.source ?? {
              id: "community",
              name: "Community observation",
              publisher: "Collective reporters",
              type: "community",
              countryCode: "KE",
              county: caseRow.county,
              trustTier: "community",
              url: null,
              firstSeenAt: new Date(),
            },
          }));
          const projectVerdicts = [...latestVerdicts.values()]
            .filter((v) => v.subjectEntityId === entity.id)
            .map((v) => ({ ...v, projectId: v.subjectEntityId }));
          const projectReports = reportRows
            .filter((r) => r.subjectEntityId === entity.id)
            .map((r) => ({ ...r, projectId: r.subjectEntityId }));
          return {
            id: entity.id,
            name: entity.canonicalName,
            sector: project.sector,
            ward: site?.ward ?? null,
            subCounty: site?.subCounty ?? null,
            lat: site?.lat ?? null,
            lng: site?.lng ?? null,
            claims: projectClaims,
            links: linkRows,
            verdicts: projectVerdicts,
            reports: projectReports,
            narrative: buildEvidenceNarrative({
              subjectName: entity.canonicalName,
              claims: projectClaims.map((claim) => ({
                id: claim.id,
                assertion: claim.assertion,
                predicate: claim.predicate,
                valueNumeric: claim.valueNumeric,
                sourceType: claim.source.type,
                observedAt: claim.observedAt,
                publishedAt: claim.publishedAt ?? claim.document.publishedAt,
              })),
              verdicts: projectVerdicts,
              reportCount: projectReports.length,
            }),
            nextSteps: actionRows
              .filter((s) => s.item.subjectEntityId === entity.id)
              .map((s) => ({
                id: s.item.id,
                projectId: s.item.subjectEntityId,
                kind: s.item.kind,
                title: s.item.title,
                bodyTemplate: s.item.bodyTemplate,
                priority: s.item.priority,
                status: s.item.status,
                institution: s.institution
                  ? {
                      id: s.institution.id,
                      name: s.institution.canonicalName,
                      kind: s.institutionDetail?.kind ?? null,
                      mandate: s.institutionDetail?.mandate ?? null,
                      atiEligible: s.institutionDetail?.atiEligible ?? false,
                    }
                  : null,
              })),
            evidenceRequests: requestRows
              .filter((req) => req.subjectEntityId === entity.id)
              .map((req) => ({ ...req, projectId: req.subjectEntityId })),
          };
        }),
      };
    }),
});
