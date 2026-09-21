import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";

import { fieldReports } from "@collective/db/schema";

import { publicProcedure, router } from "../index";

const observedStatusEnum = z.enum([
  "operational",
  "partially_built",
  "stalled",
  "abandoned",
  "not_started",
  "unusable",
  "unknown",
]);

export const reportRouter = router({
  /** Idempotent on clientUuid — safe for offline-outbox retries. */
  submit: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        observedStatus: observedStatusEnum,
        comment: z.string().max(500).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        gpsAccuracyM: z.number().int().positive().optional(),
        capturedAt: z.string().datetime().optional(),
        photoKeys: z.array(z.string()).max(3).optional(),
        clientUuid: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(fieldReports)
        .values({
          projectId: input.projectId,
          observedStatus: input.observedStatus,
          comment: input.comment ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          gpsAccuracyM: input.gpsAccuracyM ?? null,
          photoKeys: input.photoKeys ?? [],
          capturedAt: input.capturedAt ? new Date(input.capturedAt) : null,
          clientUuid: input.clientUuid,
          channel: "pwa",
          isDemo: false,
        })
        .onConflictDoNothing({ target: fieldReports.clientUuid });

      const [saved] = await ctx.db
        .select()
        .from(fieldReports)
        .where(eq(fieldReports.clientUuid, input.clientUuid));

      // Corroboration: ≥2 non-demo reports agreeing on status → corroborated.
      const siblings = await ctx.db
        .select()
        .from(fieldReports)
        .where(
          and(
            eq(fieldReports.projectId, input.projectId),
            eq(fieldReports.observedStatus, input.observedStatus),
            ne(fieldReports.isDemo, true),
          ),
        );
      if (siblings.length >= 2) {
        await ctx.db
          .update(fieldReports)
          .set({ corroborationState: "corroborated" })
          .where(
            and(
              eq(fieldReports.projectId, input.projectId),
              eq(fieldReports.observedStatus, input.observedStatus),
              ne(fieldReports.isDemo, true),
            ),
          );
      }

      return { ok: true as const, report: saved, corroborated: siblings.length >= 2 };
    }),

  listByProject: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(fieldReports)
        .where(eq(fieldReports.projectId, input.projectId));
    }),
});
