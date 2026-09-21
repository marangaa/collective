import { ASPECT_LABELS, VERDICT_META, type VerdictValue } from "@/lib/format";

type Verdict = {
  aspect: string;
  verdict: string;
  summary: string;
  gaps?: unknown;
  computedAt?: string | Date;
};

/** The five-aspect verdict strip — the case's epistemic status at a glance.
 *  Colors are semantic here and decorative nowhere else. */
export function VerdictStrip({ verdicts }: { verdicts: Verdict[] }) {
  const order = ["budget", "award", "payments", "delivery", "current_state"];
  const sorted = [...verdicts].sort((a, b) => order.indexOf(a.aspect) - order.indexOf(b.aspect));

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {sorted.map((v) => {
        const meta = VERDICT_META[v.verdict as VerdictValue] ?? VERDICT_META.unverifiable;
        const gaps = Array.isArray(v.gaps) ? (v.gaps as string[]) : [];
        return (
          <div
            key={v.aspect}
            title={`${v.summary}${gaps.length ? `\nMissing: ${gaps.join(", ")}` : ""}`}
            className={`rounded-lg border px-3 py-2 ${meta.classes}`}
          >
            <div className="text-[11px] uppercase tracking-wide opacity-70">
              {ASPECT_LABELS[v.aspect] ?? v.aspect}
            </div>
            <div className="text-sm font-semibold">{meta.label}</div>
            {gaps.length > 0 && (
              <div className="mt-0.5 text-[11px] opacity-70">missing: {gaps.length}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
