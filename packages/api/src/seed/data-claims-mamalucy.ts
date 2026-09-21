/**
 * Claims for the Nairobi case (part 2: Mama Lucy Kibaki Hospital Phase II)
 * plus the cross-document claim links.
 */

export const seedClaimsMamaLucy = [
  { key: "ml-award", projectKey: "mama-lucy-2", docKey: "ntv-2024", partyKey: "contractor-a", stage: "award", kind: "award_made", amountKes: 344_100_000, eventDate: null, observedStatus: null, assertion: "Despite the three Pumwani failures, the same contractor was awarded Mama Lucy Kibaki Hospital Phase II at a contract sum of KSh 344,100,000.", excerpt: "Despite the failure to complete the projects, the same contractor was awarded another contract for construction works at Mama Lucy Kibaki Hospital phase II at a contract sum of Sh344,100,000" },
  { key: "ml-payment", projectKey: "mama-lucy-2", docKey: "oag-2223", stage: "implementation", kind: "payment_made", amountKes: 165_099_105, eventDate: null, observedStatus: "stalled", assertion: "Mama Lucy Phase II stalled after payment of KSh 165,099,105 — about 48% of the contract sum.", excerpt: "The project also stalled after the payment of Sh165,099,105" },
  { key: "ml-payment-ntv", projectKey: "mama-lucy-2", docKey: "ntv-2024", stage: "implementation", kind: "payment_made", amountKes: 165_099_105, eventDate: "2024-08-13", observedStatus: "stalled", assertion: "NTV, quoting the OAG: the project stalled after payment of KSh 165,099,105.", excerpt: "The project also stalled after the payment of Sh165,099,105" },
  { key: "ml-retender", projectKey: "mama-lucy-2", docKey: "ncc-retender-2025", stage: "tender", kind: "tender_published", amountKes: null, eventDate: "2025-01-01", observedStatus: null, assertion: "In 2025 the county tendered 'proposed construction and completion works' for Mama Lucy Phase II — the official record implicitly conceding the project was never completed. (Notice year 2025; exact date to be confirmed from the tender record.)", excerpt: "PROPOSED CONSTRUCTION AND COMPLETION WORKS AT MAMA LUCY KIBAKI HOSPITAL PHASE 2 (MULTI-YEAR PROJECT)" },
] as const;

export const seedClaimLinks = [
  { from: "ls-star", to: "ls-insp", relation: "same_finding", rationale: "The Star republishes the OAG inspection finding verbatim." },
  { from: "ml-payment-ntv", to: "ml-payment", relation: "same_finding", rationale: "NTV republishes the OAG payment finding verbatim." },
  { from: "ls-willow", to: "ls-insp", relation: "updates", rationale: "July 2026 site visit: still not built, ~3 years after the audit." },
  { from: "mj-willow", to: "mj-insp", relation: "updates", rationale: "July 2026: construction remains stalled, wall still missing." },
  { from: "gm-willow-arc", to: "gm-insp", relation: "updates", rationale: "Later completed but never functional; supersedes the 2023 'incomplete' state." },
  { from: "gm-willow-end", to: "gm-willow-arc", relation: "updates", rationale: "The empty building was later demolished; only boulders remain." },
  { from: "ml-retender", to: "ml-award", relation: "updates", rationale: "A 2025 tender for 'completion works' concedes the original contract never delivered." },
  { from: "ml-retender", to: "ml-payment", relation: "contradicts", rationale: "KSh 165.1M already paid, yet the county re-tenders the same works — payment without delivery." },
  { from: "ml-award", to: "ls-award", relation: "contradicts", rationale: "The same contractor was re-awarded after the documented failure of the first contract." },
] as const;
