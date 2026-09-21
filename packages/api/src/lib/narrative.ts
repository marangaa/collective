type NarrativeClaim = {
  id: string;
  assertion: string;
  predicate: string;
  valueNumeric: number | null;
  sourceType: string | null;
  observedAt: string | Date | null;
  publishedAt: string | Date | null;
};

type NarrativeVerdict = {
  aspect: string;
  verdict: string;
  summary: string;
  basisClaimIds: string[];
};

export type EvidenceNarrative = {
  headline: string;
  paragraphs: string[];
  basisClaimIds: string[];
};

/**
 * The public narrative is a rendering of structured evidence, not an extraction
 * result. It stays deterministic and returns the claim IDs behind every sentence.
 */
export function buildEvidenceNarrative(input: {
  subjectName: string;
  claims: NarrativeClaim[];
  verdicts: NarrativeVerdict[];
  reportCount: number;
}): EvidenceNarrative {
  const delivery = input.verdicts.find((verdict) => verdict.aspect === "delivery");
  const payments = input.verdicts.find((verdict) => verdict.aspect === "payments");
  const current = input.verdicts.find((verdict) => verdict.aspect === "current_state");
  const dated = [...input.claims]
    .filter((claim) => claim.observedAt ?? claim.publishedAt)
    .sort((a, b) => String(a.observedAt ?? a.publishedAt).localeCompare(String(b.observedAt ?? b.publishedAt)));
  const official = input.claims.filter((claim) => claim.sourceType === "audit" || claim.sourceType === "procurement" || claim.sourceType === "budget");
  const community = input.claims.filter((claim) => claim.sourceType === "community" || claim.sourceType === "citizen_observation");
  const basis = new Set<string>();
  for (const verdict of [delivery, payments, current]) {
    for (const id of verdict?.basisClaimIds ?? []) basis.add(id);
  }

  const headline = delivery?.verdict === "contradicted"
    ? `${input.subjectName}: the record conflicts with delivery.`
    : current?.verdict === "unverifiable"
      ? `${input.subjectName}: current physical state is not established.`
      : `${input.subjectName}: what the evidence currently establishes.`;

  const paragraphs = [
    official.length > 0
      ? `The official and procurement record contains ${official.length} assertion(s) about this project.`
      : "No official or procurement assertion for this project is in the approved record.",
    payments?.summary ?? "The approved record does not establish payments.",
    delivery?.summary ?? "The approved record does not establish delivery.",
    input.reportCount > 0
      ? `${input.reportCount} community observation(s) have been submitted; ${community.length} observation claim(s) are in the evidence graph.`
      : "No community observations have been submitted yet.",
    dated.length > 0
      ? `The evidence timeline currently runs from ${String(dated[0]?.observedAt ?? dated[0]?.publishedAt)} to ${String(dated.at(-1)?.observedAt ?? dated.at(-1)?.publishedAt)}.`
      : "No dated events are available in the approved record.",
  ];

  return { headline, paragraphs, basisClaimIds: [...basis] };
}
