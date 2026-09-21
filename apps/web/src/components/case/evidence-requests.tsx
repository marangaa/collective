type EvidenceRequest = {
  id: string;
  kind: string;
  question: string;
  rationale: string;
  priority: number;
  aspect: string | null;
};

const KIND_LABELS: Record<string, string> = {
  document: "Public document",
  observation: "Ground observation",
  expert: "Expert review",
  official_confirmation: "Official confirmation",
};

export function EvidenceRequests({ requests }: { requests: EvidenceRequest[] }) {
  if (requests.length === 0) {
    return <div className="border border-neutral-900 bg-neutral-950/40 p-4 text-xs text-neutral-400">No unresolved evidence requests for this project.</div>;
  }

  return (
    <div className="space-y-2">
      {[...requests].sort((a, b) => a.priority - b.priority).map((request) => (
        <div key={request.id} className="border border-neutral-800 bg-black p-3">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            <span className="border border-amber-900/60 bg-amber-950/20 px-1.5 py-0.5 text-amber-400">{KIND_LABELS[request.kind] ?? request.kind}</span>
            {request.aspect && <span>{request.aspect.replace("_", " ")}</span>}
            <span className="text-neutral-600">Priority {request.priority}</span>
          </div>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-white">{request.question}</p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">{request.rationale}</p>
        </div>
      ))}
    </div>
  );
}
