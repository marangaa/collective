import { useState } from "react";

const KIND_LABELS: Record<string, string> = {
  ati_request: "Ask for public information",
  oversight_referral: "Ask the county to review",
  evidence_needed: "Find the missing record",
  field_verification: "Visit the site",
};

type Step = {
  id: string;
  kind: string;
  title: string;
  bodyTemplate: string;
  priority: number;
  institution: { name: string; kind?: string | null; mandate?: string | null } | null;
};

/** Action layer: 1-click copyable formal requests to public bodies. Zero rounded corners. */
export function NextSteps({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<string | null>(steps[0]?.id ?? null);
  const [copied, setCopied] = useState<string | null>(null);

  const sorted = [...steps].sort((a, b) => a.priority - b.priority);

  if (sorted.length === 0) {
    return (
      <div className="border border-neutral-900 bg-neutral-950/40 p-4 text-xs font-mono text-neutral-400">
        No next steps have been suggested for this site yet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="border border-neutral-800 bg-black">
            <button
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-neutral-950 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400">
                  <span>{KIND_LABELS[s.kind] ?? s.kind}</span>
                  {s.institution && (
                    <>
                      <span>→</span>
                      <span className="text-neutral-300 font-semibold">{s.institution.name}</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-xs font-semibold text-white">{s.title}</div>
              </div>
              <span className="font-mono text-xs text-neutral-400 shrink-0">
                {isOpen ? "Hide" : "View details"}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-neutral-900 p-3 bg-neutral-950/60">
                {s.institution?.mandate && (
                  <p className="mb-2.5 text-[11px] text-neutral-400 italic">
                    Why this matters: {s.institution.mandate}
                  </p>
                )}

                <div className="relative">
                  <pre className="whitespace-pre-wrap border border-neutral-800 bg-black p-3.5 font-mono text-[11px] leading-relaxed text-neutral-300 overflow-x-auto">
                    {s.bodyTemplate}
                  </pre>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(s.bodyTemplate);
                      setCopied(s.id);
                      setTimeout(() => setCopied(null), 2000);
                    }}
                    className="border border-white bg-white px-3 py-1.5 text-xs font-semibold text-black hover:bg-neutral-200 transition-colors"
                  >
                    {copied === s.id ? "Copied ✓" : "Copy request text"}
                  </button>
                  <span className="font-mono text-[10px] text-neutral-400">
                    You can edit this before sending
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
