import { OBSERVED_LABELS, fmtDate } from "@/lib/format";

type Report = {
  id: string;
  observedStatus: string;
  comment: string | null;
  capturedAt: string | Date | null;
  submittedAt: string | Date;
  corroborationState: string;
  isDemo: boolean;
  photoKeys?: unknown;
};

/** Community ground observations. Plain language, strict zero-radius styling. */
export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <div className="border border-neutral-900 bg-neutral-950/40 p-4 text-xs text-neutral-400 font-mono">
        No observations yet. If you have visited this site, add what you saw.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <div key={r.id} className="border border-neutral-800 bg-black p-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
            <div className="flex items-center gap-2">
              <span className="border border-neutral-700 bg-neutral-900 px-1.5 py-0.5 text-white font-semibold">
                {OBSERVED_LABELS[r.observedStatus] ?? r.observedStatus}
              </span>
              <span className="text-neutral-400">
                Seen {fmtDate(r.capturedAt ?? r.submittedAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {r.corroborationState === "corroborated" && (
                <span className="border border-emerald-800 bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5">
                  Matches 2+ other observations
                </span>
              )}
              {r.isDemo && (
                <span className="border border-neutral-800 bg-neutral-900 text-neutral-400 px-1.5 py-0.5">
                  Example report
                </span>
              )}
            </div>
          </div>

          {r.comment && (
            <p className="mt-2 text-neutral-200 text-xs leading-relaxed font-sans border-l-2 border-neutral-800 pl-2.5">
              {r.comment}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
