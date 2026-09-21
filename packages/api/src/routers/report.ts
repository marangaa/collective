import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { entities, fieldReports, media, projectDetails } from "@collective/db/schema";

import { publicProcedure, router } from "../index";
import { onObservationSubmitted } from "../lib/loop";
import { isObjectStorageConfigured, presignMediaUpload } from "../storage";

const observedStatusEnum = z.enum([
  "operational",
  "partially_built",
  "stalled",
  "abandoned",
  "not_started",
  "unusable",
  "unknown",
]);

const photoKey = z.string().regex(/^photos\/[A-Za-z0-9_-]+\/[A-Za-z0-9-]+\.[A-Za-z0-9]+$/);
const photoMetadata = z.object({
  key: photoKey,
  mime: z.string().regex(/^image\//),
});

export const reportRouter = router({
  presignMedia: publicProcedure
    .input(
      z.object({
        mime: z.string().regex(/^(image|audio|video)\//),
        extension: z.string().regex(/^[a-z0-9]{1,8}$/i).default("bin"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = ctx.user?.id ?? "anonymous";
      const key = `photos/${owner}/${randomUUID()}.${input.extension.toLowerCase()}`;
      const url = await presignMediaUpload({ key, contentType: input.mime });
      return { configured: isObjectStorageConfigured(), key, url };
    }),

  /** Idempotent on clientUuid — safe for offline-outbox retries. */
  submit: publicProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        observedStatus: observedStatusEnum,
        comment: z.string().max(500).optional(),
        answers: z.record(z.string(), z.string()).optional(),
        lat: z.number().min(-90).max(90).optional(),
        lng: z.number().min(-180).max(180).optional(),
        gpsAccuracyM: z.number().int().positive().optional(),
        capturedAt: z.string().datetime().optional(),
        photoKeys: z.array(photoKey).max(3).optional(),
        photoMetadata: z.array(photoMetadata).max(3).optional(),
        clientUuid: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [project] = await ctx.db
        .select({ id: entities.id })
        .from(entities)
        .innerJoin(projectDetails, eq(projectDetails.entityId, entities.id))
        .where(and(eq(entities.id, input.projectId), eq(entities.type, "project")))
        .limit(1);
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const submittedMedia = input.photoMetadata ?? (input.photoKeys ?? []).map((key) => ({ key, mime: "image/jpeg" }));
      const submittedPhotoKeys = [...new Set(submittedMedia.map((item) => item.key))];

      await ctx.db
        .insert(fieldReports)
        .values({
          subjectEntityId: input.projectId,
          userId: ctx.user?.id ?? null,
          observedStatus: input.observedStatus,
          answers: input.answers ?? {},
          comment: input.comment ?? null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          gpsAccuracyM: input.gpsAccuracyM ?? null,
          photoKeys: submittedPhotoKeys,
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

      if (saved) {
        const existingMedia = await ctx.db
          .select({ vaultKey: media.vaultKey })
          .from(media)
          .where(eq(media.fieldReportId, saved.id));
        const existingKeys = new Set(existingMedia.map((item) => item.vaultKey).filter((key): key is string => key != null));
        const newMedia = submittedMedia.filter((item) => !existingKeys.has(item.key));
        if (newMedia.length > 0) {
          await ctx.db.insert(media).values(
            newMedia.map((item) => ({
              kind: "image" as const,
              vaultKey: item.key,
              mime: item.mime,
              capturedAt: saved.capturedAt,
              lat: saved.lat,
              lng: saved.lng,
              fieldReportId: saved.id,
              uploadedBy: ctx.user?.id ?? null,
            })),
          );
        }

        // Trigger the closed loop: observation -> claim -> recompute verdicts & evidence requests
        await onObservationSubmitted(ctx.db, saved.id);
      }

      const [updated] = await ctx.db
        .select()
        .from(fieldReports)
        .where(eq(fieldReports.clientUuid, input.clientUuid));

      return {
        ok: true as const,
        report: updated ?? saved,
        corroborated: (updated ?? saved)?.corroborationState === "corroborated",
      };
    }),

  listByProject: publicProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(fieldReports)
        .where(eq(fieldReports.subjectEntityId, input.projectId));
    }),
});
