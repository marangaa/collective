import { ASPECT_LABELS, VERDICT_META, type VerdictValue } from "@/lib/format";

type Verdict = {
  aspect: string;
  verdict: string;
  summary: string;
  gaps?: unknown;
  computedAt?: string | Date;
};

/** The 5-aspect status strip — the epistemic reality of the public record at a glance.
 *  Strict monotone layout with surgical status indicators. Zero rounded corners. */
export function VerdictStrip({ verdicts }: { verdicts: Verdict[] }) {
  const order = ["budget", "award", "payments", "delivery", "current_state"];
  const sorted = [...verdicts].sort((a, b) => order.indexOf(a.aspect) - order.indexOf(b.aspect));

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 border border-neutral-800 bg-black divide-x divide-y md:divide-y-0 divide-neutral-800">
      {sorted.map((v) => {
        const meta = VERDICT_META[v.verdict as VerdictValue] ?? VERDICT_META.unverifiable;
        const gaps = Array.isArray(v.gaps) ? (v.gaps as string[]) : [];

        return (
          <div
            key={v.aspect}
            className="flex flex-col justify-between p-3 bg-neutral-950/60 hover:bg-neutral-900/40 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between gap-1 text-[10px] font-mono text-neutral-400">
                <span>{ASPECT_LABELS[v.aspect] ?? v.aspect}</span>
                <span className="h-1.5 w-1.5" style={{ backgroundColor: meta.dot }} />
              </div>

              <div className="mt-2 text-xs font-semibold tracking-tight text-white flex items-center gap-1.5">
                <span style={{ color: meta.dot }}>{meta.label}</span>
              </div>

              <p className="mt-1 text-[11px] leading-relaxed text-neutral-400 line-clamp-2" title={v.summary}>
                {v.summary}
              </p>
            </div>

            {gaps.length > 0 && (
              <div className="mt-2 pt-1.5 border-t border-neutral-900 text-[10px] font-mono text-neutral-400">
                Missing {gaps.length} record{gaps.length === 1 ? "" : "s"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
