import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  cases,
  claimLinks,
  claims,
  documents,
  fieldReports,
  institutions,
  nextSteps,
  projects,
  sources,
  verdicts,
} from "@collective/db/schema";

import { publicProcedure, router } from "../index";

export const auditRouter = router({
  listCases: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(cases);
  }),

  /** The full case file: projects + approved claims with citation joins,
   *  evidence links, latest verdict per aspect, timeline inputs, reports, next steps. */
  caseFile: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [caseRow] = await ctx.db.select().from(cases).where(eq(cases.slug, input.slug));
      if (!caseRow) throw new Error(`case not found: ${input.slug}`);

      const projectRows = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.caseId, caseRow.id));
      const projectIds = projectRows.map((p) => p.id);

      const claimRows = projectIds.length
        ? await ctx.db
            .select({
              claim: claims,
              document: documents,
              source: sources,
            })
            .from(claims)
            .innerJoin(documents, eq(claims.documentId, documents.id))
            .innerJoin(sources, eq(documents.sourceId, sources.id))
            .where(inArray(claims.projectId, projectIds))
        : [];
      const approved = claimRows.filter((r) => r.claim.reviewState === "approved");

      const claimIds = approved.map((r) => r.claim.id);
      const linkRows = claimIds.length
        ? await ctx.db.select().from(claimLinks).where(inArray(claimLinks.fromClaimId, claimIds))
        : [];

      const verdictRows = projectIds.length
        ? await ctx.db
            .select()
            .from(verdicts)
            .where(inArray(verdicts.projectId, projectIds))
            .orderBy(desc(verdicts.computedAt))
        : [];
      // latest verdict per (project, aspect)
      const latestVerdicts = new Map<string, (typeof verdictRows)[number]>();
      for (const v of verdictRows) {
        const key = `${v.projectId}:${v.aspect}`;
        if (!latestVerdicts.has(key)) latestVerdicts.set(key, v);
      }

      const reportRows = projectIds.length
        ? await ctx.db
            .select()
            .from(fieldReports)
            .where(inArray(fieldReports.projectId, projectIds))
            .orderBy(desc(fieldReports.submittedAt))
        : [];

      const stepRows = projectIds.length
        ? await ctx.db
            .select({ step: nextSteps, institution: institutions })
            .from(nextSteps)
            .leftJoin(institutions, eq(nextSteps.institutionId, institutions.id))
            .where(inArray(nextSteps.projectId, projectIds))
        : [];

      return {
        case: caseRow,
        projects: projectRows.map((p) => ({
          ...p,
          claims: approved
            .filter((r) => r.claim.projectId === p.id)
            .map((r) => ({
              ...r.claim,
              document: r.document,
              source: r.source,
            })),
          links: linkRows,
          verdicts: [...latestVerdicts.values()].filter((v) => v.projectId === p.id),
          reports: reportRows.filter((r) => r.projectId === p.id),
          nextSteps: stepRows
            .filter((s) => s.step.projectId === p.id)
            .map((s) => ({ ...s.step, institution: s.institution })),
        })),
      };
    }),
});
