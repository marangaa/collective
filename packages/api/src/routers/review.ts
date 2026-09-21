import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  claimCandidates,
  claims,
  documents,
  ingestEvents,
} from "@collective/db/schema";

import { recomputeForSubject } from "../lib/loop";
import { reviewerProcedure, router } from "../index";

const decisionSchema = z.object({
  candidateId: z.string().uuid(),
  decision: z.enum(["approve", "edit", "reject"]),
  subjectEntityId: z.string().uuid().optional(),
  objectEntityId: z.string().uuid().nullable().optional(),
  assertion: z.string().min(12).optional(),
  decisionNote: z.string().max(1000).optional(),
});

export const reviewRouter = router({
  listCandidates: reviewerProcedure
    .input(
      z.object({
        status: z.enum(["pending", "needs_review", "approved", "rejected", "published"]).optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const filters = input.status
        ? eq(claimCandidates.status, input.status)
        : inArray(claimCandidates.status, ["pending", "needs_review"]);
      return ctx.db
        .select({ candidate: claimCandidates, document: documents })
        .from(claimCandidates)
        .leftJoin(documents, eq(claimCandidates.documentId, documents.id))
        .where(filters)
        .orderBy(desc(claimCandidates.createdAt))
        .limit(input.limit);
    }),

  decideCandidate: reviewerProcedure.input(decisionSchema).mutation(async ({ ctx, input }) => {
    const [candidate] = await ctx.db
      .select()
      .from(claimCandidates)
      .where(
        and(
          eq(claimCandidates.id, input.candidateId),
          inArray(claimCandidates.status, ["pending", "needs_review"]),
        ),
      );
    if (!candidate) throw new Error("candidate not found or already decided");

    if (input.decision === "reject") {
      const [updated] = await ctx.db
        .update(claimCandidates)
        .set({
          status: "rejected",
          decidedBy: ctx.user!.id,
          decidedAt: new Date(),
          decisionNote: input.decisionNote ?? null,
        })
        .where(eq(claimCandidates.id, candidate.id))
        .returning();
      await ctx.db.insert(ingestEvents).values({
        actor: "reviewer",
        action: "candidate_rejected",
        entityType: "claim_candidate",
        entityId: candidate.id,
        detail: { decisionNote: input.decisionNote ?? null },
      });
      return { candidate: updated, claim: null };
    }

    const subjectEntityId = input.subjectEntityId ?? candidate.subjectEntityId;
    if (!subjectEntityId) throw new Error("a resolved subject entity is required before publishing");

    const [claim] = await ctx.db
      .insert(claims)
      .values({
        subjectEntityId,
        predicate: candidate.predicate,
        objectEntityId: input.objectEntityId ?? candidate.objectEntityId,
        valueText: candidate.valueText,
        valueNumeric: candidate.valueNumeric == null ? null : Number(candidate.valueNumeric),
        valueUnit: candidate.valueUnit,
        valueDate: candidate.valueDate || null,
        valueStatus: candidate.valueStatus,
        valuePct: candidate.valuePct,
        assertion: input.assertion ?? candidate.assertion,
        stage: candidate.stage,
        documentId: candidate.documentId,
        mediaId: candidate.mediaId,
        fieldReportId: candidate.fieldReportId,
        span: candidate.span,
        extractionMethod: candidate.extractor,
        confidence: candidate.confidence,
        reviewState: "approved",
        reviewedBy: ctx.user!.id,
        reviewedAt: new Date(),
        reviewAction: input.decision === "edit" ? "edited" : "approved",
        reviewNote: input.decisionNote ?? null,
        fromCandidateId: candidate.id,
      })
      .returning();

    const [updated] = await ctx.db
      .update(claimCandidates)
      .set({
        status: "published",
        subjectEntityId,
        objectEntityId: input.objectEntityId ?? candidate.objectEntityId,
        assertion: input.assertion ?? candidate.assertion,
        decidedBy: ctx.user!.id,
        decidedAt: new Date(),
        decisionNote: input.decisionNote ?? null,
        publishedClaimId: claim!.id,
      })
      .where(eq(claimCandidates.id, candidate.id))
      .returning();

    await recomputeForSubject(ctx.db, subjectEntityId);
    await ctx.db.insert(ingestEvents).values({
      actor: "reviewer",
      action: "candidate_published",
      entityType: "claim",
      entityId: claim!.id,
      detail: { candidateId: candidate.id, decision: input.decision },
    });

    return { candidate: updated, claim };
  }),
});
