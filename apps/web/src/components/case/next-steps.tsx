import { useState } from "react";

const KIND_LABELS: Record<string, string> = {
  ati_request: "Access to Information request",
  oversight_referral: "Oversight referral",
  evidence_needed: "Evidence needed",
  field_verification: "Field verification",
};

type Step = {
  id: string;
  kind: string;
  title: string;
  bodyTemplate: string;
  priority: number;
  institution: { name: string; kind: string; mandate: string | null } | null;
};

/** The action layer: every gap in the record resolves into a concrete next step. */
export function NextSteps({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const sorted = [...steps].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-2">
      {sorted.map((s) => {
        const isOpen = open === s.id;
        return (
          <div key={s.id} className="rounded-lg border bg-card/60">
            <button
              onClick={() => setOpen(isOpen ? null : s.id)}
              className="flex w-full items-center justify-between gap-2 p-3 text-left"
            >
              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  {KIND_LABELS[s.kind] ?? s.kind}
                  {s.institution ? ` → ${s.institution.name}` : ""}
                </div>
                <div className="text-sm font-medium">{s.title}</div>
              </div>
              <span className="text-xs text-muted-foreground">{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div className="border-t p-3">
                {s.institution?.mandate && (
                  <p className="mb-2 text-xs text-muted-foreground">{s.institution.mandate}</p>
                )}
                <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                  {s.bodyTemplate}
                </pre>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(s.bodyTemplate);
                    setCopied(s.id);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  className="mt-2 rounded-md border px-3 py-1.5 text-xs hover:bg-muted"
                >
                  {copied === s.id ? "Copied ✓" : "Copy request text"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
