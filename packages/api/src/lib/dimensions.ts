/**
 * Evidence dimensions — the analytic layer of "verify". Seven explainable
 * dimensions, never one trust score. Deterministic; source authority is ONE
 * input among many (a tweet can have high directness, an official PDF low
 * independence).
 */
export type DimensionName =
  | "provenance"
  | "specificity"
  | "recency"
  | "directness"
  | "verifiability"
  | "independence"
  | "corroboration"
  | "consistency";

export type DimensionScore = { score: number; rationale: string };
export type EvidenceDimensions = Record<DimensionName, DimensionScore> & { strength: number };

export type DimensionInput = {
  predicate: string;
  stage: string;
  span: unknown;
  extractionMethod: "llm" | "rule" | "manual";
  reviewState: string;
  observedAt?: string | null;
  publishedAt?: string | null;
  sourceTrustTier?: string | null;
  sourceType?: string | null;
  fromFieldReport?: boolean;
  hasPhoto?: boolean;
  echoCount: number;
  conflictCount: number;
  now?: Date;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));
const spanExcerpt = (span: unknown): string =>
  typeof span === "object" && span !== null && "excerpt" in span
    ? String((span as { excerpt?: unknown }).excerpt ?? "")
    : "";

export function computeDimensions(input: DimensionInput): EvidenceDimensions {
  const now = input.now ?? new Date();
  const hasSpan = spanExcerpt(input.span).trim().length >= 20;

  const provenance: DimensionScore = (() => {
    let score = 0.6;
    let why = "extracted automatically";
    if (input.extractionMethod === "manual") { score = 1; why = "human-verified entry"; }
    else if (input.extractionMethod === "rule") { score = 0.85; why = "deterministic rule extraction"; }
    else if (input.reviewState === "approved") { score = 0.9; why = "AI-extracted, human-approved"; }
    if (!hasSpan) return { score: Math.min(score, 0.5), rationale: `${why}; no verbatim span` };
    return { score, rationale: why };
  })();

  const specificPredicates = new Set(["contract_value", "payment_made", "budget_allocated", "expected_completion"]);
  const specificity: DimensionScore = specificPredicates.has(input.predicate)
    ? { score: 1, rationale: "value-bearing assertion" }
    : input.predicate === "progress_reported"
      ? { score: 0.7, rationale: "progress statement without audited value" }
      : { score: 0.8, rationale: "concrete status assertion" };

  const when = input.observedAt ?? input.publishedAt ?? null;
  const recency: DimensionScore = (() => {
    if (!when) return { score: 0.5, rationale: "no date recorded" };
    const days = (now.getTime() - new Date(when).getTime()) / 86_400_000;
    if (days <= 90) return { score: 1, rationale: `within 90 days (${when})` };
    if (days <= 365) return { score: 0.8, rationale: `within a year (${when})` };
    if (days <= 730) return { score: 0.5, rationale: `1–2 years old (${when})` };
    return { score: 0.3, rationale: `older than 2 years (${when})` };
  })();

  const directness: DimensionScore = (() => {
    if (input.fromFieldReport)
      return input.hasPhoto
        ? { score: 1, rationale: "firsthand observation with photo" }
        : { score: 0.8, rationale: "firsthand observation" };
    if (input.predicate === "inspection_finding") return { score: 0.9, rationale: "field inspection finding" };
    if (input.sourceType === "audit") return { score: 0.9, rationale: "auditor's own examination" };
    if (input.sourceType === "news") return { score: 0.6, rationale: "journalistic report" };
    if (input.sourceType === "press") return { score: 0.4, rationale: "institutional press statement" };
    return { score: 0.5, rationale: "documentary source" };
  })();

  const verifiability: DimensionScore = (() => {
    if (input.fromFieldReport)
      return input.hasPhoto
        ? { score: 0.8, rationale: "photo evidence attached" }
        : { score: 0.5, rationale: "report only; no media" };
    if (hasSpan && ["audit", "procurement", "budget"].includes(input.sourceType ?? ""))
      return { score: 1, rationale: "public document with verbatim span" };
    if (hasSpan) return { score: 0.7, rationale: "published source with verbatim span" };
    return { score: 0.4, rationale: "no citable span" };
  })();

  const independence: DimensionScore = (() => {
    if (input.echoCount <= 1) return { score: 1, rationale: "standalone finding" };
    if (input.sourceType === "news" && input.echoCount > 1)
      return { score: 0.4, rationale: "republished echo of an earlier finding" };
    return { score: clamp(1 / (1 + 0.5 * (input.echoCount - 1))), rationale: `one of ${input.echoCount} linked reports` };
  })();

  const corroboration: DimensionScore = (() => {
    if (input.echoCount <= 1) return { score: 0.4, rationale: "no independent corroborating finding" };
    if (input.echoCount === 2) return { score: 0.7, rationale: "one additional linked finding" };
    return { score: 1, rationale: `${input.echoCount} linked findings support this assertion` };
  })();

  const consistency: DimensionScore = (() => {
    if (input.conflictCount === 0) return { score: 1, rationale: "no conflicting claims found" };
    if (input.conflictCount === 1) return { score: 0.5, rationale: "one conflicting claim in the record" };
    return { score: 0.2, rationale: `${input.conflictCount} conflicting claims in the record` };
  })();

  const dims = { provenance, specificity, recency, directness, verifiability, independence, corroboration, consistency };
  const weights: Record<DimensionName, number> = {
    provenance: 0.18, specificity: 0.14, recency: 0.14, directness: 0.18,
    verifiability: 0.14, independence: 0.09, corroboration: 0.08, consistency: 0.05,
  };
  const strength = Math.round(
    (Object.keys(dims) as DimensionName[]).reduce((s, k) => s + dims[k].score * weights[k], 0) * 100,
  ) / 100;

  return { ...dims, strength };
}
