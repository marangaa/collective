/**
 * Span validation — deterministic, no LLM. A candidate survives only if its
 * verbatim excerpt actually exists in the document's text (fuzzy match tolerates
 * whitespace/quote normalization). This is where hallucinated spans die.
 */

const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/** Sliding-window containment: does the excerpt appear (fuzzily) in the text? */
export function spanExists(excerpt: string, documentText: string): boolean {
  const needle = normalize(excerpt);
  const hay = normalize(documentText);
  if (hay.includes(needle)) return true;

  // token-window fallback: ≥85% of excerpt tokens appear in order
  const tokens = needle.split(" ").filter((t) => t.length > 2);
  if (tokens.length < 4) return false;
  const hayTokens = hay.split(" ");
  let hits = 0;
  let cursor = 0;
  for (const t of tokens) {
    const idx = hayTokens.indexOf(t, cursor);
    if (idx === -1) continue;
    hits++;
    cursor = idx;
  }
  return hits / tokens.length >= 0.85;
}

export type ValidationOutcome = {
  valid: boolean;
  reason?: "span_not_found" | "excerpt_too_short";
};

export function validateCandidate(
  candidate: { span: { excerpt?: string } },
  documentText: string,
): ValidationOutcome {
  const excerpt = candidate.span?.excerpt ?? "";
  if (excerpt.trim().length < 20) return { valid: false, reason: "excerpt_too_short" };
  if (!spanExists(excerpt, documentText)) return { valid: false, reason: "span_not_found" };
  return { valid: true };
}

/** Stable per-document candidate fingerprint for dedupe across re-runs. */
export function candidateFingerprint(documentId: string, candidate: { kind: string; span: { excerpt?: string } }): string {
  const norm = normalize(candidate.span?.excerpt ?? "").slice(0, 120);
  return `${documentId}:${candidate.kind}:${norm}`;
}
