import type { VerdictDraft } from "./reconcile";

export type RequestDraft = {
  kind: "document" | "observation" | "expert" | "official_confirmation";
  question: string;
  rationale: string;
  aspect: VerdictDraft["aspect"];
  priority: number;
};

/**
 * Evidence-request generator — the system identifying its OWN uncertainty and
 * asking the world to resolve it. Deterministic mapping from verdicts+gaps to
 * concrete verification asks. This is what makes the loop alive: conflicts and
 * gaps become questions that the community or institutions can answer.
 */
export function generateEvidenceRequests(
  verdicts: VerdictDraft[],
  subjectName: string,
): RequestDraft[] {
  const drafts: RequestDraft[] = [];

  for (const v of verdicts) {
    if (v.verdict === "unverifiable" || v.verdict === "partially_corroborated") {
      for (const gap of v.gaps) {
        switch (gap) {
          case "budget_line":
            drafts.push({
              kind: "document", aspect: v.aspect, priority: 2,
              question: `Which budget line funded ${subjectName}, and what did it allocate?`,
              rationale: "No budget allocation appears in the ingested record; without it, payment levels cannot be judged.",
            });
            break;
          case "completion_certificate":
            drafts.push({
              kind: "official_confirmation", aspect: v.aspect, priority: 1,
              question: `Was a completion certificate ever issued for ${subjectName}?`,
              rationale: "Payments and inspection findings conflict on delivery; the completion certificate would settle it.",
            });
            break;
          case "current_status":
          case "field_verification":
            drafts.push({
              kind: "observation", aspect: v.aspect, priority: 1,
              question: `What does ${subjectName} look like right now — operational, under construction, stalled, or gone?`,
              rationale: "The record is silent or stale on the current physical state; firsthand observations resolve it.",
            });
            break;
          case "independent_award_record":
            drafts.push({
              kind: "document", aspect: v.aspect, priority: 2,
              question: `Where is the original tender and award record for ${subjectName}?`,
              rationale: "The award traces to a single finding; the procurement record would independently confirm it.",
            });
            break;
          case "contractor_identity":
            drafts.push({
              kind: "document", aspect: v.aspect, priority: 2,
              question: `Which registered company holds the contract for ${subjectName}?`,
              rationale: "The record refers to a contractor without naming them; procurement records name the winner.",
            });
            break;
          case "inspection_evidence":
            drafts.push({
              kind: "document", aspect: v.aspect, priority: 2,
              question: `Is there any inspection report establishing the delivery state of ${subjectName}?`,
              rationale: "No inspection or observation exists in the record at all.",
            });
            break;
          case "independent_field_reports":
            drafts.push({
              kind: "observation", aspect: v.aspect, priority: 2,
              question: `Can another independent witness confirm what is at ${subjectName}?`,
              rationale: "A single report establishes a lead, not a pattern; independent confirmation strengthens it.",
            });
            break;
          default:
            break;
        }
      }
    }

    if (v.verdict === "contradicted") {
      drafts.push({
        kind: "official_confirmation", aspect: v.aspect, priority: 1,
        question: `Which document, if any, shows ${subjectName} was formally completed and handed over?`,
        rationale: "Sources conflict on delivery; a signed handover or commissioning record would resolve the contradiction.",
      });
    }
  }

  // dedupe by question, keep highest priority
  const seen = new Map<string, RequestDraft>();
  for (const d of drafts) {
    const prior = seen.get(d.question);
    if (!prior || d.priority < prior.priority) seen.set(d.question, d);
  }
  return [...seen.values()];
}
