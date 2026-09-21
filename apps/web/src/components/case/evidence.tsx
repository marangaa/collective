import { useState } from "react";

import { STAGE_LABELS, TIER_META, fmtDate, kes } from "@/lib/format";

export type CaseClaim = {
  id: string;
  stage: string;
  kind: string;
  assertion: string;
  amountKes: number | null;
  eventDate: string | null;
  observedStatus: string | null;
  span?: unknown;
  document: { title: string; publishedAt: string | null; url: string | null; retrievedAt: string | Date };
  source: { name: string; trustTier: string };
};

/** Individual evidence record — source of truth verification. Zero rounded corners. */
export function EvidenceCard({ claim }: { claim: CaseClaim }) {
  const tier = TIER_META[claim.source.trustTier] ?? TIER_META.official!;
  const span = (claim.span ?? {}) as { page?: number | null; excerpt?: string };

  return (
    <div className="border border-neutral-800 bg-black p-3.5 text-xs text-neutral-200">
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-relaxed text-neutral-100">{claim.assertion}</p>
        {claim.amountKes != null && (
          <span className="shrink-0 font-mono text-xs font-semibold text-white bg-neutral-900 px-2 py-0.5 border border-neutral-800">
            {kes(claim.amountKes)}
          </span>
        )}
      </div>

      {span.excerpt && (
        <blockquote className="mt-2.5 border-l-2 border-neutral-700 bg-neutral-950/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-neutral-300">
          “{span.excerpt}”
          {span.page != null && (
            <span className="block mt-1 text-[10px] text-neutral-400">— page {span.page}</span>
          )}
        </blockquote>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-neutral-900 pt-2 font-mono text-[10px] text-neutral-400">
        <span className="flex items-center gap-1.5 text-neutral-300">
          <span className={`h-1.5 w-1.5 ${tier.dot}`} />
          {tier.label}
        </span>
        <span className="opacity-30">/</span>
        <span className="text-neutral-300">{claim.source.name}</span>
        <span className="opacity-30">/</span>
        <a
          href={claim.document.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="text-neutral-300 underline decoration-neutral-700 hover:text-white"
        >
          {claim.document.title}
        </a>
        {claim.document.publishedAt && (
          <>
            <span className="opacity-30">/</span>
            <span>Published {fmtDate(claim.document.publishedAt)}</span>
          </>
        )}
      </div>
    </div>
  );
}

/** Chronological timeline of dated claims and audit reports. */
export function ClaimTimeline({ claims }: { claims: CaseClaim[] }) {
  const dated = claims
    .filter((c) => c.eventDate)
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));
  const [open, setOpen] = useState<string | null>(null);

  if (dated.length === 0) {
    return (
      <div className="border border-neutral-900 bg-neutral-950/50 p-4 text-xs font-mono text-neutral-400">
        There are no dated events in the public record for this facility yet.
      </div>
    );
  }

  return (
    <div className="relative border-l border-neutral-800 ml-2 space-y-2.5 pl-4">
      {dated.map((c) => {
        const isOpen = open === c.id;
        return (
          <div key={c.id} className="relative group">
            {/* Timeline point */}
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 border border-neutral-600 bg-black group-hover:border-white transition-colors" />

            <button
              onClick={() => setOpen(isOpen ? null : c.id)}
              className="w-full text-left focus:outline-none"
            >
              <div className="flex flex-wrap items-baseline gap-2 font-mono text-[11px]">
                <time className="font-semibold text-neutral-300">{fmtDate(c.eventDate)}</time>
                <span className="border border-neutral-800 bg-neutral-900/60 px-1.5 py-0.5 text-[10px] text-neutral-400">
                  {STAGE_LABELS[c.stage] ?? c.stage}
                </span>
                {c.amountKes != null && (
                  <span className="text-white font-semibold">{kes(c.amountKes)}</span>
                )}
                <span className="text-[10px] text-neutral-400 ml-auto">{isOpen ? "Hide source" : "See source"}</span>
              </div>
              <p className="mt-1 text-xs text-neutral-200 group-hover:text-white transition-colors leading-relaxed">
                {c.assertion}
              </p>
            </button>

            {isOpen && (
              <div className="mt-2.5">
                <EvidenceCard claim={c} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
