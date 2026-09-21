/** Display helpers — plain language verdict semantics, formatting, trust tiers.
 *  Vercel-inspired stark monotone design with surgical status colors. */

export const VERDICT_META = {
  corroborated: {
    label: "Verified",
    dot: "#10b981",
    classes: "bg-emerald-950/20 text-emerald-400 border-emerald-900/60",
    textClass: "text-emerald-400",
    borderClass: "border-emerald-900/60",
  },
  contradicted: {
    label: "Contradicted",
    dot: "#ef4444",
    classes: "bg-red-950/20 text-red-400 border-red-900/60",
    textClass: "text-red-400",
    borderClass: "border-red-900/60",
  },
  unverifiable: {
    label: "Unverifiable",
    dot: "#737373",
    classes: "bg-neutral-900/40 text-neutral-400 border-neutral-800",
    textClass: "text-neutral-400",
    borderClass: "border-neutral-800",
  },
  partially_corroborated: {
    label: "Stalled / Disputed",
    dot: "#f59e0b",
    classes: "bg-amber-950/20 text-amber-400 border-amber-900/60",
    textClass: "text-amber-400",
    borderClass: "border-amber-900/60",
  },
} as const;

export type VerdictValue = keyof typeof VERDICT_META;

export const ASPECT_LABELS: Record<string, string> = {
  budget: "Budget Allocated",
  award: "Contract Awarded",
  payments: "Money Paid",
  delivery: "Work Completed",
  current_state: "Ground Reality",
};

export const STAGE_ORDER = ["planning", "tender", "award", "contract", "implementation", "completion"] as const;

export const STAGE_LABELS: Record<string, string> = {
  planning: "Planning",
  tender: "Tender Advertised",
  award: "Awarded",
  contract: "Contract Signed",
  implementation: "Construction",
  completion: "Completion Claimed",
};

export const TIER_META: Record<string, { label: string; dot: string }> = {
  official: { label: "Official Document", dot: "bg-neutral-200" },
  independent: { label: "Independent Media", dot: "bg-neutral-400" },
  community: { label: "Community Observation", dot: "bg-emerald-400" },
};

export const OBSERVED_LABELS: Record<string, string> = {
  operational: "Open & Operational",
  partially_built: "Partially Built",
  stalled: "Stalled / Abandoned",
  abandoned: "Completely Abandoned",
  not_started: "Never Started",
  unusable: "Unusable Structure",
  unknown: "Unknown / Unclear",
};

export const kes = (n: number | null | undefined) =>
  n == null ? null : `KSh ${n.toLocaleString("en-KE")}`;

export const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "Date unrecorded";
  return new Date(d).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
