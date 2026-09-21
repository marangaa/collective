import { z } from "zod";

/**
 * The shared contract between the extractor (AI) and the review gate (humans).
 * A candidate without a verbatim excerpt is invalid by construction —
 * the schema enforces the product's epistemics.
 */
export const claimCandidateSchema = z.object({
  subjectName: z.string().min(2).describe("Canonical or source name of the entity this assertion is about"),
  objectName: z.string().nullable().describe("Named entity that is the object of the assertion, such as a contractor"),
  stage: z.enum(["planning", "tender", "award", "contract", "implementation", "completion"]),
  kind: z.enum([
    "budget_allocated",
    "tender_published",
    "award_made",
    "payment_made",
    "progress_reported",
    "completion_claimed",
    "inspection_finding",
    "delivery_observed",
  ]),
  assertion: z
    .string()
    .min(12)
    .describe("One-sentence statement of fact, in the language of the record, no adjectives of judgment"),
  amountKes: z.number().int().positive().nullable(),
  eventDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  observedStatus: z
    .enum(["operational", "partially_built", "stalled", "abandoned", "not_started", "unusable", "unknown"])
    .nullable(),
  partyLabel: z.string().nullable(),
  span: z.object({
    page: z.number().int().positive().nullable(),
    excerpt: z.string().min(20).describe("VERBATIM quote from the source — never paraphrased"),
  }),
});

export type ClaimCandidate = z.infer<typeof claimCandidateSchema>;

export const extractionResultSchema = z.object({
  candidates: z.array(claimCandidateSchema),
  notes: z.string().nullable(),
});

export type ExtractionResult = z.infer<typeof extractionResultSchema>;
