import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { CaseMap } from "@/components/case/case-map";
import { ClaimTimeline } from "@/components/case/evidence";
import { NextSteps } from "@/components/case/next-steps";
import { ReportList } from "@/components/case/reports";
import { VerdictStrip } from "@/components/case/verdict-strip";
import { fmtDate } from "@/lib/format";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/case/$slug")({
  component: CaseFilePage,
});

function CaseFilePage() {
  const { slug } = Route.useParams();
  const caseFile = useQuery(trpc.audit.caseFile.queryOptions({ slug }));
  const [activeProject, setActiveProject] = useState<string | null>(null);

  if (caseFile.isLoading) {
    return <div className="container mx-auto max-w-6xl px-4 py-10 text-muted-foreground">Loading the record…</div>;
  }
  if (caseFile.error || !caseFile.data) {
    return <div className="container mx-auto max-w-6xl px-4 py-10">Case not found.</div>;
  }

  const { case: c, projects } = caseFile.data;
  const current = projects.find((p) => p.id === activeProject) ?? projects[0]!;
  const delivery = current.verdicts.find((v) => v.aspect === "delivery");
  const payments = current.verdicts.find((v) => v.aspect === "payments");
  const latestVerify = current.verdicts
    .map((v) => new Date(v.computedAt).getTime())
    .sort((a, b) => b - a)[0];

  return (
    <div className="container mx-auto max-w-6xl px-4 py-6">
      {/* header */}
      <header className="mb-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {c.county} County · {c.sector}
        </div>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{c.title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{c.summary}</p>
        {latestVerify && (
          <p className="mt-1 text-xs text-muted-foreground">
            Record last verified {fmtDate(new Date(latestVerify))}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          {/* project tabs */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p.id)}
                className={`rounded-full border px-3 py-1.5 text-xs ${
                  current.id === p.id ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* verdict strip */}
          <VerdictStrip verdicts={current.verdicts} />

          {/* the tension, in plain language */}
          {(delivery || payments) && (
            <p className="mt-4 rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
              {payments ? `${payments.summary} ` : ""}
              {delivery?.summary ?? ""}
            </p>
          )}

          {/* timeline */}
          <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            The record over time
          </h2>
          <ClaimTimeline claims={current.claims} />

          {/* community reports */}
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What people on the ground report
          </h2>
          <ReportList reports={current.reports} />
          <a
            href={`/report/${current.id}`}
            className="mt-3 inline-block rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Were you there? Add what you saw →
          </a>

          {/* next steps */}
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What can be done next
          </h2>
          <NextSteps steps={current.nextSteps} />
        </div>

        {/* map rail */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <CaseMap
            projects={projects.map((p) => ({
              id: p.id,
              name: p.name,
              lat: p.lat,
              lng: p.lng,
              deliveryVerdict: p.verdicts.find((v) => v.aspect === "delivery")?.verdict,
            }))}
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            Locations approximate. Pin color = delivery verdict. Basemap © OpenFreeMap · © OpenStreetMap contributors.
          </p>
        </aside>
      </div>
    </div>
  );
}
