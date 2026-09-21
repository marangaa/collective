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

/** Community ground truth — observations, never verdicts. Demo data is flagged. */
export function ReportList({ reports }: { reports: Report[] }) {
  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No community reports yet. If you know this place, what you see matters.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {reports.map((r) => (
        <li key={r.id} className="rounded-lg border bg-card/60 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">
              {OBSERVED_LABELS[r.observedStatus] ?? r.observedStatus}
            </span>
            <span className="text-[11px] text-muted-foreground">
              observed {fmtDate(r.capturedAt ?? r.submittedAt)}
            </span>
            {r.corroborationState === "corroborated" && (
              <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-400">
                corroborated
              </span>
            )}
            {r.isDemo && (
              <span className="rounded bg-zinc-500/15 px-1.5 py-0.5 text-[11px] text-zinc-400">
                demo submission
              </span>
            )}
          </div>
          {r.comment && <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
