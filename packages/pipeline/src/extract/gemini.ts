import { createGoogle } from "@ai-sdk/google";
import { generateText, Output } from "ai";

import type { ClaimCandidate, ExtractionResult } from "./schema";
import { extractionResultSchema } from "./schema";

/**
 * Gemini extractor (AI SDK v7 + @ai-sdk/google).
 * Model ids and knobs are configurable; defaults per docs research:
 *  - gemini-3.8-flash (current flash generation) for bulk extraction
 *  - thinkingLevel 'low' — extraction doesn't need deep reasoning
 *  - native document understanding (PDF ≤1000pp / 50MB, ~258 tokens/page)
 * AI proposes; validation + human review dispose. Never publishes directly.
 */
export interface Extractor {
  extract(input: {
    documentText: string | null;
    fileData?: Uint8Array;
    fileMime?: string;
    sourceTitle: string;
    knownProjects: { name: string; hints: string[] }[];
    maxCandidates?: number;
  }): Promise<{ result: ExtractionResult; usage: { tokensIn: number; tokensOut: number; model: string; durationMs: number } }>;
}

const SYSTEM = `You extract verifiable factual claims from Kenyan public-records documents
(auditor-general reports, budgets, tender notices, press releases, news investigations).

Rules:
- Extract only claims supported by the text. Never infer beyond it.
- Each claim MUST carry span.excerpt: a VERBATIM quote from the source (copy exactly).
- If the excerpt spans a specific page you know, set span.page; otherwise null.
- Amounts: parse to integer KES. "Sh869 million" → 869000000.
- Dates: ISO yyyy-mm-dd when the document states them; null otherwise.
- observedStatus only for claims about physical delivery state.
- partyLabel: contractor/authority names as printed; null if unnamed.
- Language discipline: no judgment words (corrupt, stolen, mismanaged).`;

export function createGeminiExtractor(opts: { apiKey: string; model?: string }): Extractor {
  const google = createGoogle({ apiKey: opts.apiKey });
  const modelId = opts.model ?? "gemini-3.8-flash";

  return {
    async extract(input) {
      const started = Date.now();
      const projectHint = input.knownProjects
        .map((p) => `- ${p.name}${p.hints.length ? ` (aliases: ${p.hints.join("; ")})` : ""}`)
        .join("\n");

      const taskText = [
        `Document: ${input.sourceTitle}`,
        input.knownProjects.length
          ? `Known projects this document may discuss (match by name or alias, do not invent):\n${projectHint}`
          : "",
        input.documentText
          ? `Document text:\n\n${input.documentText.slice(0, 400_000)}`
          : "Document attached as PDF.",
        `Extract up to ${input.maxCandidates ?? 25} claim candidates as structured output.`,
      ]
        .filter(Boolean)
        .join("\n\n");

      const content = input.fileData
        ? ([
            { type: "file" as const, data: input.fileData, mediaType: input.fileMime ?? "application/pdf" },
            { type: "text" as const, text: taskText },
          ] as const)
        : taskText;

      const { output, usage } = await generateText({
        model: google(modelId),
        system: SYSTEM,
        prompt: content as string,
        output: Output.object({ schema: extractionResultSchema }),
        maxRetries: 2,
        temperature: 0.1,
        providerOptions: {
          google: { thinkingLevel: "low" },
        },
      });

      const result = (output ?? { candidates: [], notes: null }) as ExtractionResult;
      return {
        result,
        usage: {
          tokensIn: usage?.inputTokens ?? 0,
          tokensOut: usage?.outputTokens ?? 0,
          model: modelId,
          durationMs: Date.now() - started,
        },
      };
    },
  };
}

export type { ClaimCandidate };
