import { EvidenceCard, type CaseClaim } from "./evidence";

type EvidenceLink = {
  fromClaimId: string;
  toClaimId: string;
  relation: string;
};

type EvidenceVerdict = {
  id: string;
  aspect: string;
  verdict: string;
  summary: string;
  basisClaimIds: string[];
};

function laneFor(claim: CaseClaim & { fieldReportId?: string | null }) {
  if (claim.fieldReportId || claim.source.trustTier === "community" || ["community", "citizen_observation", "photo", "video"].includes((claim.source as { type?: string }).type ?? "")) {
    return "community" as const;
  }
  if (claim.source.trustTier === "independent" || ["news", "press", "civil_society", "social_post"].includes((claim.source as { type?: string }).type ?? "")) {
    return "independent" as const;
  }
  return "official" as const;
}

const LANE_META = {
  official: {
    title: "Official record",
    description: "What public institutions have reported, budgeted, procured, or audited.",
  },
  independent: {
    title: "Independent and media record",
    description: "Reporting and civil-society evidence that is not treated as an official finding.",
  },
  community: {
    title: "Community observations",
    description: "Firsthand observations submitted by people who visited the site.",
  },
} as const;

export function EvidenceLanes({ claims, links, verdicts }: {
  claims: CaseClaim[];
  links: EvidenceLink[];
  verdicts: EvidenceVerdict[];
}) {
  const claimById = new Map(claims.map((claim) => [claim.id, claim]));
  const contradictionIds = new Set(
    links
      .filter((link) => link.relation === "contradicts")
      .flatMap((link) => [link.fromClaimId, link.toClaimId]),
  );
  const contradictionClaims = [...contradictionIds]
    .map((id) => claimById.get(id))
    .filter((claim): claim is CaseClaim => Boolean(claim));

  return (
    <div className="space-y-5">
      <section>
        <div className="mb-2 border-b border-neutral-900 pb-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-red-400">Where the record conflicts</h3>
          <p className="mt-1 text-[11px] text-neutral-400">Contradictions remain visible. They are not collapsed into a single trust score.</p>
        </div>
        {contradictionClaims.length > 0 ? (
          <div className="space-y-2">
            {contradictionClaims.map((claim) => <EvidenceCard key={claim.id} claim={claim} />)}
          </div>
        ) : (
          <p className="border border-neutral-900 bg-black p-3 text-xs text-neutral-400">No explicit contradiction link has been recorded for the approved claims.</p>
        )}
      </section>

      {(["official", "independent", "community"] as const).map((lane) => {
        const laneClaims = claims.filter((claim) => laneFor(claim) === lane);
        const meta = LANE_META[lane];
        return (
          <section key={lane}>
            <div className="mb-2 border-b border-neutral-900 pb-2">
              <h3 className="font-mono text-[10px] uppercase tracking-widest text-neutral-300">{meta.title}</h3>
              <p className="mt-1 text-[11px] text-neutral-500">{meta.description}</p>
            </div>
            {laneClaims.length > 0 ? (
              <div className="space-y-2">
                {laneClaims.map((claim) => <EvidenceCard key={claim.id} claim={claim} />)}
              </div>
            ) : (
              <p className="border border-neutral-900 bg-black p-3 text-xs text-neutral-500">No approved claims in this evidence lane.</p>
            )}
          </section>
        );
      })}

      <section>
        <div className="mb-2 border-b border-neutral-900 pb-2">
          <h3 className="font-mono text-[10px] uppercase tracking-widest text-emerald-400">Supported assessments</h3>
          <p className="mt-1 text-[11px] text-neutral-400">Deterministic assessments derived from approved claims and their provenance.</p>
        </div>
        <div className="space-y-2">
          {verdicts.map((verdict) => (
            <div key={verdict.id} className="border border-neutral-800 bg-black p-3">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                <span>{verdict.aspect.replace("_", " ")}</span>
                <span className="border border-neutral-700 px-1.5 py-0.5 text-white">{verdict.verdict.replace("_", " ")}</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-neutral-200">{verdict.summary}</p>
              <p className="mt-1.5 font-mono text-[10px] text-neutral-500">Basis: {verdict.basisClaimIds.length} claim(s)</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
