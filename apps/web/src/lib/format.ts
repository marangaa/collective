/** Display helpers — verdict semantics, formatting, trust tiers. */

export const VERDICT_META = {
  corroborated: { label: "Corroborated", classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  contradicted: { label: "Contradicted", classes: "bg-red-500/15 text-red-400 border-red-500/30" },
  unverifiable: { label: "Unverifiable", classes: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  partially_corroborated: { label: "Partially corroborated", classes: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
} as const;

export type VerdictValue = keyof typeof VERDICT_META;

export const ASPECT_LABELS: Record<string, string> = {
  budget: "Budget",
  award: "Award",
  payments: "Payments",
  delivery: "Delivery",
  current_state: "Current state",
};

export const STAGE_ORDER = ["planning", "tender", "award", "contract", "implementation", "completion"] as const;

export const STAGE_LABELS: Record<string, string> = {
  planning: "Planned",
  tender: "Tendered",
  award: "Awarded",
  contract: "Contracted",
  implementation: "Implemented",
  completion: "Completed",
};

export const TIER_META: Record<string, { label: string; dot: string }> = {
  official: { label: "Official record", dot: "bg-sky-400" },
  independent: { label: "Independent media", dot: "bg-amber-400" },
  community: { label: "Community report", dot: "bg-emerald-400" },
};

export const OBSERVED_LABELS: Record<string, string> = {
  operational: "Operational",
  partially_built: "Partially built",
  stalled: "Stalled",
  abandoned: "Abandoned",
  not_started: "Never started",
  unusable: "Unusable",
  unknown: "Unknown",
};

export const kes = (n: number | null) =>
  n == null ? null : `KSh ${n.toLocaleString("en-KE")}`;

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "date not in record";
  return new Date(d).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
