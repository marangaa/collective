import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { OBSERVED_LABELS } from "@/lib/format";
import { ENV } from "@/env";

export const Route = createFileRoute("/report/$projectId")({
  component: ReportPage,
});

const OPTIONS = ["operational", "partially_built", "stalled", "abandoned", "not_started"] as const;

function ReportPage() {
  const { projectId } = Route.useParams();
  const [status, setStatus] = useState<(typeof OPTIONS)[number] | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState<null | { corroborated: boolean; queued: boolean }>(null);

  const submit = useMutation({
    mutationFn: async (observedStatus: string) => {
      // Outbox v1: queue in localStorage, flush best-effort immediately.
      const clientUuid = crypto.randomUUID();
      const entry = {
        clientUuid,
        projectId,
        observedStatus,
        comment: comment.trim() || undefined,
        capturedAt: new Date().toISOString(),
      };
      const box = JSON.parse(localStorage.getItem("collective.outbox") ?? "[]") as typeof entry[];
      box.push(entry);
      localStorage.setItem("collective.outbox", JSON.stringify(box));

      try {
        const res = await trpcClientReport(entry);
        const rest = box.filter((e) => e.clientUuid !== entry.clientUuid);
        localStorage.setItem("collective.outbox", JSON.stringify(rest));
        return { corroborated: res.corroborated, queued: false };
      } catch {
        return { corroborated: false, queued: true }; // stays in outbox, retried on next visit
      }
    },
    onSuccess: (r) => setDone(r),
  });

  if (done) {
    return (
      <div className="container mx-auto max-w-md px-4 py-16 text-center">
        <div className="text-4xl">{done.queued ? "📥" : "✅"}</div>
        <h1 className="mt-4 text-xl font-semibold">
          {done.queued ? "Saved on your phone" : "Thank you"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {done.queued
            ? "You're offline or the connection dropped. Your report is stored and will send automatically next time you open collective."
            : done.corroborated
              ? "Your report was recorded — and it independently confirms other reports for this site."
              : "Your report was recorded. Independent reports from more people strengthen this site's evidence."}
        </p>
        <a href="/" className="mt-6 inline-block text-sm underline decoration-dotted">
          Back to the case file
        </a>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-10">
      <a href="/" className="text-xs text-muted-foreground">← back</a>
      <h1 className="mt-3 text-xl font-bold">What did you see?</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Anonymous. No name, no phone number. Nothing about you is stored.
      </p>

      <div className="mt-6 grid gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o}
            onClick={() => setStatus(o)}
            className={`rounded-xl border px-4 py-4 text-left text-base font-medium transition ${
              status === o ? "border-foreground bg-muted" : "hover:bg-muted/50"
            }`}
          >
            {OBSERVED_LABELS[o]}
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={500}
        placeholder="Optional — anything else you want the record to know"
        className="mt-4 w-full rounded-lg border bg-transparent p-3 text-sm"
        rows={3}
      />

      <button
        disabled={!status || submit.isPending}
        onClick={() => status && submit.mutate(status)}
        className="mt-4 w-full rounded-xl bg-foreground py-3.5 text-base font-semibold text-background disabled:opacity-40"
      >
        {submit.isPending ? "Sending…" : "Submit report"}
      </button>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">
        Photo capture arrives with evidence sync — text reports already count toward corroboration.
      </p>
    </div>
  );
}

/** Direct tRPC call outside the router hooks — used by the outbox flusher. */
async function trpcClientReport(entry: {
  clientUuid: string;
  projectId: string;
  observedStatus: string;
  comment?: string;
  capturedAt: string;
}) {
  const { createTRPCClient, httpBatchLink } = await import("@trpc/client");
  type AppRouter = import("@collective/api/routers/index").AppRouter;
  const client = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `${ENV.VITE_SERVER_URL.replace(/\/$/, "")}/trpc` })],
  });
  return client.report.submit.mutate({
    ...entry,
    observedStatus: entry.observedStatus as
      | "operational" | "partially_built" | "stalled" | "abandoned"
      | "not_started" | "unusable" | "unknown",
  } as Parameters<typeof client.report.submit.mutate>[0]);
}
