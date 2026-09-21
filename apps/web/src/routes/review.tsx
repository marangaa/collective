import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { authClient } from "@/utils/auth";
import { trpcClient } from "@/utils/trpc";

export const Route = createFileRoute("/review")({ component: ReviewPage });

function ReviewPage() {
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => (await authClient.getSession()).data,
  });
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const isReviewer = session.data?.user?.role === "admin" || session.data?.user?.role === "reviewer";
  const candidates = useQuery({
    queryKey: ["review-candidates"],
    queryFn: () => trpcClient.review.listCandidates.query({ limit: 50 }),
    enabled: isReviewer,
  });
  const decide = useMutation({
    mutationFn: (input: { candidateId: string; decision: "approve" | "reject"; decisionNote?: string }) =>
      trpcClient.review.decideCandidate.mutate(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["review-candidates"] }),
  });

  if (session.isLoading) return <Centered>Checking reviewer session…</Centered>;
  if (!isReviewer) {
    return (
      <Centered>
        <div className="w-full max-w-md border border-neutral-800 bg-neutral-950 p-6 font-mono text-xs">
          <Link to="/" className="text-neutral-400 hover:text-white">← Back to case file</Link>
          <h1 className="mt-6 text-base font-bold uppercase text-white">Reviewer access</h1>
          <p className="mt-2 leading-relaxed text-neutral-400">Sign in with an approved reviewer email. Field reporters do not need an account.</p>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="reviewer@example.org"
            className="mt-4 w-full border border-neutral-800 bg-black p-2.5 text-white outline-none focus:border-white"
          />
          <button
            className="mt-3 w-full border border-white bg-white px-3 py-2 font-semibold uppercase text-black disabled:opacity-40"
            disabled={!email || !email.includes("@")}
            onClick={async () => {
              const result = await authClient.signIn.magicLink({ email, callbackURL: "/review" });
              setMessage(result.error ? result.error.message ?? "Could not send sign-in link" : "Check your email for a sign-in link.");
            }}
          >
            Send magic link
          </button>
          {message && <p className="mt-3 text-neutral-400">{message}</p>}
        </div>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 font-sans text-neutral-100 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <Link to="/" className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 hover:text-white">← Case file</Link>
            <h1 className="mt-3 text-xl font-bold uppercase">Claim review queue</h1>
            <p className="mt-1 text-sm text-neutral-400">AI proposes assertions. A reviewer decides what becomes public evidence.</p>
          </div>
          <button className="border border-neutral-700 px-3 py-2 font-mono text-[10px] uppercase text-neutral-300" onClick={() => void authClient.signOut().then(() => session.refetch())}>Sign out</button>
        </div>
        <div className="mt-6 space-y-3">
          {candidates.isLoading && <p className="text-sm text-neutral-400">Loading candidates…</p>}
          {candidates.data?.length === 0 && <p className="border border-neutral-800 p-5 text-sm text-neutral-400">No candidates need review.</p>}
          {candidates.data?.map(({ candidate, document }) => (
            <article key={candidate.id} className="border border-neutral-800 bg-neutral-950 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] uppercase text-neutral-400">
                <span>{candidate.predicate} · {candidate.stage}</span>
                <span>{document?.title ?? "Non-document evidence"}</span>
              </div>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-white">{candidate.assertion}</p>
                  <blockquote className="mt-3 border-l-2 border-neutral-700 bg-black p-3 font-mono text-xs leading-relaxed text-neutral-300">“{String((candidate.span as { excerpt?: unknown }).excerpt ?? "No excerpt") }”</blockquote>
                </div>
                <div className="text-xs text-neutral-400">
                  <p>Subject: <span className="text-neutral-200">{candidate.subjectNameRaw}</span></p>
                  <p className="mt-1">Resolution: <span className="text-neutral-200">{JSON.stringify(candidate.resolution ?? {})}</span></p>
                  <p className="mt-1">Validation: <span className="text-neutral-200">{JSON.stringify(candidate.validation)}</span></p>
                </div>
              </div>
              <div className="mt-4 flex gap-2 border-t border-neutral-900 pt-3">
                <button className="border border-emerald-700 bg-emerald-950/30 px-3 py-1.5 font-mono text-[10px] uppercase text-emerald-400 disabled:opacity-40" disabled={decide.isPending} onClick={() => decide.mutate({ candidateId: candidate.id, decision: "approve" })}>Approve and publish</button>
                <button className="border border-red-900 bg-red-950/30 px-3 py-1.5 font-mono text-[10px] uppercase text-red-400 disabled:opacity-40" disabled={decide.isPending} onClick={() => decide.mutate({ candidateId: candidate.id, decision: "reject" })}>Reject</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-black p-4">{children}</div>;
}
