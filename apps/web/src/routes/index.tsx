import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const caseList = useQuery(trpc.audit.listCases.queryOptions());

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm uppercase tracking-widest text-muted-foreground">collective</p>
      <h1 className="mt-2 text-3xl font-bold leading-tight sm:text-4xl">
        The county said it was built. <span className="text-muted-foreground">Was it?</span>
      </h1>
      <p className="mt-4 text-base leading-relaxed text-muted-foreground">
        We assemble the public record — audits, budgets, tenders, press claims — and what
        communities can see with their own eyes, into one evidence chain you can check
        yourself. Every claim links to its source. Every gap becomes a next step.
      </p>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Open case files
        </h2>
        {caseList.data?.map((c) => (
          <Link
            key={c.id}
            to="/case/$slug"
            params={{ slug: c.slug }}
            className="block rounded-lg border p-4 hover:bg-muted/50"
          >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              {c.county} County
            </div>
            <div className="mt-0.5 font-semibold">{c.title}</div>
            <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.summary}</div>
          </Link>
        ))}
        {caseList.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-3">
        {[
          ["1 · The record", "Official audits, budgets, tenders and press claims — fetched, hashed, and quoted verbatim. Nothing enters without its source."],
          ["2 · The ground", "Residents report what they actually see — anonymously, offline-capable, photos stripped of hidden location data."],
          ["3 · The next step", "Where the record can't establish delivery, we draft the exact request that resolves it — under the Access to Information Act, 2016."],
        ].map(([t, d]) => (
          <div key={t} className="rounded-lg border p-4">
            <div className="text-sm font-semibold">{t}</div>
            <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</div>
          </div>
        ))}
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        Evidence first. Inference second. An echo is not a source.
      </p>
    </div>
  );
}

