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

/** One claim's evidence card — the product's soul: don't trust us, check. */
export function EvidenceCard({ claim }: { claim: CaseClaim }) {
  const tier = TIER_META[claim.source.trustTier] ?? TIER_META.official!;
  const span = (claim.span ?? {}) as { page?: number | null; excerpt?: string };
  return (
    <div className="rounded-lg border bg-card/60 p-3 text-sm">
      <p className="leading-snug">{claim.assertion}</p>
      {claim.amountKes != null && (
        <p className="mt-1 font-mono text-base font-semibold">{kes(claim.amountKes)}</p>
      )}
      <blockquote className="mt-2 border-l-2 border-muted-foreground/40 pl-3 text-xs italic text-muted-foreground">
        “{span.excerpt}”
      </blockquote>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${tier.dot}`} />
          {tier.label}
        </span>
        <a
          href={claim.document.url ?? "#"}
          target="_blank"
          rel="noreferrer"
          className="underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          {claim.document.title}
        </a>
        <span>published {fmtDate(claim.document.publishedAt)}</span>
        <span>retrieved {fmtDate(claim.document.retrievedAt)}</span>
      </div>
    </div>
  );
}

/** Vertical timeline of dated claims, grouped by OCDS stage. */
export function ClaimTimeline({ claims }: { claims: CaseClaim[] }) {
  const dated = claims
    .filter((c) => c.eventDate)
    .sort((a, b) => (a.eventDate ?? "").localeCompare(b.eventDate ?? ""));
  const [open, setOpen] = useState<string | null>(null);

  if (dated.length === 0) {
    return <p className="text-sm text-muted-foreground">No dated events in the record yet.</p>;
  }

  return (
    <ol className="relative ml-2 space-y-3 border-l border-border pl-4">
      {dated.map((c) => {
        const tier = TIER_META[c.source.trustTier] ?? TIER_META.official!;
        const isOpen = open === c.id;
        return (
          <li key={c.id}>
            <button
              onClick={() => setOpen(isOpen ? null : c.id)}
              className="group w-full text-left"
            >
              <div className="flex items-baseline gap-2">
                <span className={`mt-1 -ml-[21px] h-2.5 w-2.5 shrink-0 rounded-full ${tier.dot} ring-4 ring-background`} />
                <time className="shrink-0 font-mono text-xs text-muted-foreground">
                  {fmtDate(c.eventDate)}
                </time>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {STAGE_LABELS[c.stage] ?? c.stage}
                </span>
              </div>
              <p className="mt-1 text-sm leading-snug group-hover:text-foreground/90">
                {c.assertion}
              </p>
            </button>
            {isOpen && (
              <div className="mt-2">
                <EvidenceCard claim={c} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
