/**
 * Seed corpus v3 — the Nairobi health facilities case as entities + claims.
 * All assertions are grounded in verbatim excerpts from real public sources
 * (OAG county audits as quoted, The Star, NTV, Willow Health Media, county
 * tender listings). extraction_method 'manual' = human-verified span.
 *
 * Entity model: 4 project entities (the records of works) + 4 site entities
 * (the physical places) linked project→concerns→site. Observations attach to
 * projects (the works' physical output); site-level subject granularity is the
 * scale path.
 */

export const seedSources = [
  { key: "oag", name: "Office of the Auditor-General", publisher: "OAG Kenya", type: "audit", url: "https://www.oagkenya.go.ke/", trustTier: "official" },
  { key: "star", name: "The Star", publisher: "The Star Kenya", type: "news", url: "https://www.the-star.co.ke/", trustTier: "independent" },
  { key: "ntv", name: "NTV Kenya", publisher: "Nation Media Group", type: "news", url: "https://ntvkenya.co.ke/", trustTier: "independent" },
  { key: "willow", name: "Willow Health Media", publisher: "Willow Health Media", type: "news", url: "https://willowhealthmedia.com/", trustTier: "independent" },
  { key: "ncc", name: "Nairobi City County", publisher: "Nairobi City County Government", type: "procurement", url: "https://nairobi.go.ke/", trustTier: "official" },
] as const;

export const seedDocuments = [
  { key: "oag-2223", sourceKey: "oag", title: "Report of the Auditor-General on County Executives FY2022/2023 (Green Book) — Nairobi City County", docType: "green_book", fiscalYear: "2022/2023", url: "https://www.oagkenya.go.ke/wp-content/uploads/2024/04/GREEN-BOOK-COUNTY-EXECUTIVES-VOL-1-2022-2023-1.pdf", publishedAt: "2024-04-15", notes: "Findings quoted verbatim in The Star (2024-04-19) and NTV (2024-08-13)." },
  { key: "star-2024", sourceKey: "star", title: "What development? Shock of Sh12 billion stalled projects in 10 counties", docType: "news_article", url: "https://www.the-star.co.ke/news/realtime/2024-04-23-what-development-shock-of-sh12-billion-stalled-projects-in-10-counties", publishedAt: "2024-04-19", notes: "Quotes the OAG FY2022/23 county reports." },
  { key: "ntv-2024", sourceKey: "ntv", title: "Sh12bn projects stalled, unused in 10 counties", docType: "news_article", url: "https://ntvkenya.co.ke/news/sh12bn-projects-stalled-unused-in-10-counties/", publishedAt: "2024-08-13", notes: "Adds Mama Lucy Kibaki Phase II contract and payment figures." },
  { key: "willow-2026", sourceKey: "willow", title: "Grabbed, stalled, forgotten: How Nairobi is losing its crucial clinics", docType: "news_article", url: "https://willowhealthmedia.com/grabbed-stalled-forgotten-how-nairobi-is-losing-its-crucial-clinics/", publishedAt: "2026-07-03", notes: "Site visits + resident testimony for the Pumwani cluster." },
  { key: "ncc-retender-2025", sourceKey: "ncc", title: "Tender: Proposed construction and completion works at Mama Lucy Kibaki Hospital Phase 2 (multi-year)", docType: "tender_notice", fiscalYear: "2024/2025", url: "https://www.tenders.go.ke/", publishedAt: "2025-01-01", notes: "Published 2025; exact notice date to be confirmed from the tender record." },
] as const;

export const seedCase = {
  key: "case",
  slug: "nairobi-health-facilities",
  title: "Nairobi's stalled health facilities",
  summary:
    "Four Nairobi health projects — three Pumwani facilities awarded as one KSh 869M contract, and Mama Lucy Kibaki Hospital Phase II (KSh 344.1M) awarded to the same contractor despite the earlier failures. Audits, site visits, and a 2025 re-tender tell the story the individual documents never do on their own.",
  county: "Nairobi City",
  sector: "health",
} as const;

/** Entity rows. key → entity; details live in the per-type fields. */
export const seedEntities = [
  { key: "proj-lucky-summer", type: "project", name: "Construction of Lucky Summer Dispensary", county: "Nairobi City", details: { sector: "health" }, siteKey: "site-lucky-summer" },
  { key: "proj-majengo", type: "project", name: "Construction of Pumwani Majengo Health Centre", county: "Nairobi City", details: { sector: "health" }, siteKey: "site-majengo" },
  { key: "proj-gumba", type: "project", name: "Construction of Gumba/Mabatini Dispensary", county: "Nairobi City", details: { sector: "health" }, siteKey: "site-gumba" },
  { key: "proj-mama-lucy", type: "project", name: "Mama Lucy Kibaki Hospital — Phase II", county: "Nairobi City", details: { sector: "health" }, siteKey: "site-mama-lucy" },
  { key: "site-lucky-summer", type: "site", name: "Lucky Summer Dispensary (site)", county: "Nairobi City", details: { ward: "Lucky Summer", subCounty: "Ruaraka", lat: -1.2385, lng: 36.8845, locationNote: "Lucky Summer area, Kasarani/Ruaraka, East Nairobi" } },
  { key: "site-majengo", type: "site", name: "Pumwani Majengo Health Centre (site)", county: "Nairobi City", details: { ward: "Pumwani", subCounty: "Kamukunji", lat: -1.2805, lng: 36.8565, locationNote: "Majengo, Kamukunji, near Pumwani Maternity" } },
  { key: "site-gumba", type: "site", name: "Gumba/Mabatini Dispensary (site)", county: "Nairobi City", details: { ward: "Mabatini", subCounty: "Mathare", lat: -1.2627, lng: 36.8536, locationNote: "Mabatini, Mathare, Nairobi River riparian zone" } },
  { key: "site-mama-lucy", type: "site", name: "Mama Lucy Kibaki Hospital (site)", county: "Nairobi City", details: { ward: "Umoja II", subCounty: "Embakasi West", lat: -1.2880, lng: 36.8980, locationNote: "Kangundo Road, Embakasi West, Nairobi" } },
  { key: "org-contractor-a", type: "organization", name: "Contractor A", details: { role: "contractor", isUnnamed: true } },
  { key: "inst-ncc", type: "institution", name: "Nairobi City County", details: { kind: "county_exec", mandate: "County government responsible for delivering health infrastructure.", atiEligible: true, jurisdiction: "Nairobi City County" } },
  { key: "inst-oag", type: "institution", name: "Office of the Auditor-General", details: { kind: "oversight", mandate: "Audits the use of public funds by national and county governments.", atiEligible: true } },
  { key: "inst-ncca-pac", type: "institution", name: "Nairobi City County Assembly — Public Accounts & Investments Committee", details: { kind: "county_assembly", mandate: "Examines audited county accounts and value-for-money on public projects." } },
  { key: "inst-ppra", type: "institution", name: "Public Procurement Regulatory Authority", details: { kind: "regulator", mandate: "Regulates public procurement; holds tender and contractor records.", atiEligible: true } },
  { key: "inst-eacc", type: "institution", name: "Ethics and Anti-Corruption Commission", details: { kind: "commission", mandate: "Investigates corruption and economic crime in public bodies." } },
  { key: "inst-caj", type: "institution", name: "Commission on Administrative Justice", details: { kind: "commission", mandate: "Enforces the Access to Information Act 2016; handles ATI complaints." } },
  { key: "inst-nta", type: "institution", name: "National Taxpayers Association", details: { kind: "cso", mandate: "Runs citizen audits and public-finance monitoring with ward-level committees." } },
] as const;

/** Aliases — surface forms from sources that entity resolution matches against. */
export const seedAliases = [
  { entityKey: "proj-lucky-summer", alias: "Lucky Summer Dispensary" },
  { entityKey: "proj-lucky-summer", alias: "Pumwani Lucky Summer Dispensary" },
  { entityKey: "site-lucky-summer", alias: "Lucky Summer" },
  { entityKey: "proj-majengo", alias: "Pumwani Majengo Health Centre" },
  { entityKey: "proj-majengo", alias: "Majengo Health Centre" },
  { entityKey: "proj-majengo", alias: "Pumwani Majengo Health Center" },
  { entityKey: "site-majengo", alias: "Majengo" },
  { entityKey: "proj-gumba", alias: "Gumba/Mabatini Dispensary" },
  { entityKey: "proj-gumba", alias: "Gumba Mabatini Dispensary" },
  { entityKey: "site-gumba", alias: "Gumba" },
  { entityKey: "site-gumba", alias: "Mabatini" },
  { entityKey: "proj-mama-lucy", alias: "Mama Lucy Kibaki Hospital Phase II" },
  { entityKey: "proj-mama-lucy", alias: "Mama Lucy Kibaki Hospital Phase 2" },
  { entityKey: "proj-mama-lucy", alias: "Mama Lucy Kibaki Hospital — Phase II" },
  { entityKey: "site-mama-lucy", alias: "Mama Lucy Kibaki Hospital" },
  { entityKey: "org-contractor-a", alias: "same contractor" },
  { entityKey: "org-contractor-a", alias: "Contractor A (unnamed in OAG report)" },
  { entityKey: "inst-ncc", alias: "Nairobi County" },
  { entityKey: "inst-ncc", alias: "County Government of Nairobi" },
] as const;

export const seedRelations = [
  { from: "proj-lucky-summer", to: "site-lucky-summer", relation: "concerns" },
  { from: "proj-majengo", to: "site-majengo", relation: "concerns" },
  { from: "proj-gumba", to: "site-gumba", relation: "concerns" },
  { from: "proj-mama-lucy", to: "site-mama-lucy", relation: "concerns" },
] as const;

/**
 * Claims — subject (project entity) → predicate → object/value, with verbatim
 * excerpts. reviewState approved via seed; dimensions computed by the loop.
 */
export const seedClaimsPumwani = [
  // ── Lucky Summer Dispensary ────────────────────────────────────────────
  { key: "ls-award", subjectKey: "proj-lucky-summer", docKey: "oag-2223", predicate: "contract_awarded_to", objectKey: "org-contractor-a", stage: "award", observedAt: null, assertion: "One contractor was engaged to construct three health facilities — Lucky Summer Dispensary, Pumwani Majengo Health Centre and Gumba/Mabatini Dispensary — at a combined sum of KSh 869,000,000. All three projects stalled.", excerpt: "one contractor was engaged to construct three health facilities at a sum of Sh869 million but all the projects stalled. The projects included the construction and equipping of Pumwani Lucky Summer Dispensary, Pumwani Majengo Health Centre and Gumba/Mabatini Dispensary" },
  { key: "ls-value", subjectKey: "proj-lucky-summer", docKey: "oag-2223", predicate: "contract_value", valueNumeric: 869000000, valueUnit: "KES", stage: "award", observedAt: null, assertion: "The combined contract sum for the three Pumwani facilities was KSh 869,000,000.", excerpt: "one contractor was engaged to construct three health facilities at a sum of Sh869 million" },
  { key: "ls-insp", subjectKey: "proj-lucky-summer", docKey: "oag-2223", predicate: "inspection_finding", valueStatus: "not_started", stage: "implementation", observedAt: "2023-09-28", assertion: "OAG field inspection (28–29 Sept 2023): Lucky Summer Dispensary had barely started and the building is dilapidated.", excerpt: "Field inspection on these projects carried out on September 28 and 29, 2023 revealed they were not complete... the Lucky Summer Dispensary barely started and the building is dilapidated" },
  { key: "ls-star", subjectKey: "proj-lucky-summer", docKey: "star-2024", predicate: "inspection_finding", valueStatus: "not_started", stage: "implementation", observedAt: "2024-04-19", assertion: "The Star, quoting the OAG report: Lucky Summer Dispensary 'barely started and the building is dilapidated'.", excerpt: "the Lucky Summer Dispensary barely started and the building is dilapidated" },
  { key: "ls-willow", subjectKey: "proj-lucky-summer", docKey: "willow-2026", predicate: "delivery_observed", valueStatus: "not_started", stage: "completion", observedAt: "2026-07-03", assertion: "Willow Health Media site reporting (July 2026): Lucky Summer dispensary had barely started — nearly three years after the audit.", excerpt: "Wall at Pumwani Majengo hadn't been built, Lucky Summer dispensary had barely started" },

  // ── Pumwani Majengo ────────────────────────────────────────────────────
  { key: "mj-award", subjectKey: "proj-majengo", docKey: "oag-2223", predicate: "contract_awarded_to", objectKey: "org-contractor-a", stage: "award", observedAt: null, assertion: "Majengo Health Centre was one of the three facilities under the single KSh 869,000,000 contract that stalled.", excerpt: "one contractor was engaged to construct three health facilities at a sum of Sh869 million but all the projects stalled" },
  { key: "mj-value", subjectKey: "proj-majengo", docKey: "oag-2223", predicate: "contract_value", valueNumeric: 869000000, valueUnit: "KES", stage: "award", observedAt: null, assertion: "Majengo's share of the combined KSh 869,000,000 contract.", excerpt: "one contractor was engaged to construct three health facilities at a sum of Sh869 million" },
  { key: "mj-insp", subjectKey: "proj-majengo", docKey: "oag-2223", predicate: "inspection_finding", valueStatus: "stalled", stage: "implementation", observedAt: "2023-09-28", assertion: "OAG field inspection (28–29 Sept 2023): Majengo not complete and not labelled; the perimeter wall was not done.", excerpt: "they were not complete and labelled, the perimeter wall was not done for Pumwani Majengo Health Center" },
  { key: "mj-willow", subjectKey: "proj-majengo", docKey: "willow-2026", predicate: "delivery_observed", valueStatus: "stalled", stage: "completion", observedAt: "2026-07-03", assertion: "Willow Health Media (July 2026): construction at Pumwani Majengo has stalled despite millions allocated; perimeter wall still not built.", excerpt: "Construction at Pumwani Majengo Health Centre has stalled despite millions of shillings allocated for the project" },
] as const;

// ── Gumba/Mabatini Dispensary ─────────────────────────────────────────
export const seedClaimsGumba = [
  { key: "gm-award", subjectKey: "proj-gumba", docKey: "oag-2223", predicate: "contract_awarded_to", objectKey: "org-contractor-a", stage: "award", observedAt: null, assertion: "Gumba/Mabatini Dispensary was one of the three facilities under the single KSh 869,000,000 contract that stalled.", excerpt: "The projects included the construction and equipping of Pumwani Lucky Summer Dispensary, Pumwani Majengo Health Centre and Gumba/Mabatini Dispensary" },
  { key: "gm-value", subjectKey: "proj-gumba", docKey: "oag-2223", predicate: "contract_value", valueNumeric: 869000000, valueUnit: "KES", stage: "award", observedAt: null, assertion: "Gumba/Mabatini's share of the combined KSh 869,000,000 contract.", excerpt: "one contractor was engaged to construct three health facilities at a sum of Sh869 million" },
  { key: "gm-insp", subjectKey: "proj-gumba", docKey: "oag-2223", predicate: "inspection_finding", valueStatus: "stalled", stage: "implementation", observedAt: "2023-09-28", assertion: "OAG field inspection (28–29 Sept 2023): Gumba/Mabatini Dispensary not complete and not labelled.", excerpt: "Field inspection on these projects carried out on September 28 and 29, 2023 revealed they were not complete and labelled" },
  { key: "gm-willow-arc", subjectKey: "proj-gumba", docKey: "willow-2026", predicate: "delivery_observed", valueStatus: "unusable", stage: "completion", observedAt: "2026-07-03", assertion: "Willow (July 2026): the structure was completed but water seeped through the floor, work stopped, and the building stood empty — never opened to the public.", excerpt: "Even after the structure was completed, water seeped through the floor and work stopped. The building stood empty" },
  { key: "gm-willow-end", subjectKey: "proj-gumba", docKey: "willow-2026", predicate: "delivery_observed", valueStatus: "abandoned", stage: "completion", observedAt: "2026-07-03", assertion: "Willow (July 2026): the completed-but-never-used building was demolished during clearance of structures on riparian land. Only boulders remain.", excerpt: "until it was demolished during the recent clearance of structures sitting on riparian land. Only boulders now remain" },
  { key: "gm-willow-voice", subjectKey: "proj-gumba", docKey: "willow-2026", predicate: "delivery_observed", valueStatus: "abandoned", stage: "completion", observedAt: "2026-07-03", assertion: "Resident testimony: the dispensary is 'a reminder of healthcare that his community was promised but never received' — Patrick Mulwa, trader near the site.", excerpt: "For Patrick Mulwa, the unfinished Gumba/Mabatini Dispensary is more than an abandoned project. It is a reminder of healthcare that his community was promised but never received." },
] as const;

// ── Mama Lucy Kibaki Hospital Phase II ────────────────────────────────
export const seedClaimsMamaLucy = [
  { key: "ml-award", subjectKey: "proj-mama-lucy", docKey: "ntv-2024", predicate: "contract_awarded_to", objectKey: "org-contractor-a", stage: "award", observedAt: null, assertion: "Despite the three Pumwani failures, the same contractor was awarded Mama Lucy Kibaki Hospital Phase II at a contract sum of KSh 344,100,000.", excerpt: "Despite the failure to complete the projects, the same contractor was awarded another contract for construction works at Mama Lucy Kibaki Hospital phase II at a contract sum of Sh344,100,000" },
  { key: "ml-value", subjectKey: "proj-mama-lucy", docKey: "ntv-2024", predicate: "contract_value", valueNumeric: 344100000, valueUnit: "KES", stage: "award", observedAt: null, assertion: "Contract sum for Mama Lucy Kibaki Hospital Phase II was KSh 344,100,000.", excerpt: "another contract for construction works at Mama Lucy Kibaki Hospital phase II at a contract sum of Sh344,100,000" },
  { key: "ml-payment", subjectKey: "proj-mama-lucy", docKey: "oag-2223", predicate: "payment_made", valueNumeric: 165099105, valueUnit: "KES", valueStatus: "stalled", stage: "implementation", observedAt: null, assertion: "Mama Lucy Phase II stalled after payment of KSh 165,099,105 — about 48% of the contract sum.", excerpt: "The project also stalled after the payment of Sh165,099,105" },
  { key: "ml-payment-ntv", subjectKey: "proj-mama-lucy", docKey: "ntv-2024", predicate: "payment_made", valueNumeric: 165099105, valueUnit: "KES", valueStatus: "stalled", stage: "implementation", observedAt: "2024-08-13", assertion: "NTV, quoting the OAG: the project stalled after payment of KSh 165,099,105.", excerpt: "The project also stalled after the payment of Sh165,099,105" },
  { key: "ml-retender", subjectKey: "proj-mama-lucy", docKey: "ncc-retender-2025", predicate: "tender_published", stage: "tender", observedAt: "2025-01-01", assertion: "In 2025 the county tendered 'proposed construction and completion works' for Mama Lucy Phase II — the official record implicitly conceding the project was never completed.", excerpt: "PROPOSED CONSTRUCTION AND COMPLETION WORKS AT MAMA LUCY KIBAKI HOSPITAL PHASE 2 (MULTI-YEAR PROJECT)" },
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

export const seedActionItems = [
  {
    subjectKey: "proj-mama-lucy", institutionKey: "inst-ncc", kind: "ati_request", priority: 1,
    title: "Request the Mama Lucy Phase II contract file",
    bodyTemplate:
      "REQUEST UNDER THE ACCESS TO INFORMATION ACT, 2016\n\nTo: Nairobi City County — CECM, Health Services\n\nRe: Mama Lucy Kibaki Hospital Phase II (contract sum KSh 344,100,000)\n\nPursuant to Article 35 of the Constitution and sections 5–8 of the Access to Information Act, 2016, I request certified copies of:\n1. The signed contract and all variations;\n2. All interim payment certificates (the Auditor-General records KSh 165,099,105 paid);\n3. Any completion certificate or notice of termination;\n4. The current contract status and any re-procurement decision, including the 2025 tender for 'construction and completion works'.\n\nI request a response within the statutory 21 days.",
  },
  {
    subjectKey: "proj-mama-lucy", institutionKey: "inst-ncca-pac", kind: "oversight_referral", priority: 2,
    title: "Refer payments-vs-delivery to the County Assembly PAC",
    bodyTemplate:
      "Request to the Public Accounts & Investments Committee: examine payments of KSh 165,099,105 against physical delivery of Mama Lucy Kibaki Hospital Phase II, per the Auditor-General's FY2022/23 findings, and summon the contracting authority to explain the re-tendering of the same works in 2025.",
  },
  {
    subjectKey: "proj-lucky-summer", institutionKey: "inst-ncc", kind: "ati_request", priority: 1,
    title: "Request the status of the KSh 869M three-facility contract",
    bodyTemplate:
      "REQUEST UNDER THE ACCESS TO INFORMATION ACT, 2016\n\nRe: Construction and equipping of Lucky Summer Dispensary, Pumwani Majengo Health Centre and Gumba/Mabatini Dispensary (combined KSh 869,000,000, single contractor)\n\nI request: (1) the contract and award records, including the contractor's identity and PPRA registration; (2) all payments made to date; (3) whether the contract has been terminated, re-awarded or varied; (4) the current delivery plan for each facility.\n\nI request a response within the statutory 21 days.",
  },
  {
    subjectKey: "proj-gumba", institutionKey: "inst-ncc", kind: "ati_request", priority: 1,
    title: "Request disposal records for the demolished dispensary",
    bodyTemplate:
      "REQUEST UNDER THE ACCESS TO INFORMATION ACT, 2016\n\nRe: Gumba/Mabatini Dispensary (completed under the KSh 869M contract; reported demolished during riparian-land clearance — Willow Health Media, July 2026)\n\nI request: (1) the asset register entry and handover records for the completed building; (2) any valuation, condemnation or disposal authorisation preceding demolition; (3) the county's plan for replacement of the facility for Gumba and Mabatini residents.\n\nI request a response within the statutory 21 days.",
  },
  {
    subjectKey: "proj-lucky-summer", institutionKey: "inst-nta", kind: "field_verification", priority: 3,
    title: "Confirm the current state on the ground",
    bodyTemplate:
      "Community verification ask: if you are near Lucky Summer (Pumwani), submit a dated photo and observed status via /report. Two or more independent reports move this project's current-state verdict from 'unverifiable' to 'corroborated'.",
  },
  {
    subjectKey: "proj-majengo", institutionKey: "inst-nta", kind: "field_verification", priority: 3,
    title: "Confirm the current state on the ground",
    bodyTemplate:
      "Community verification ask: if you are near Pumwani Majengo, submit a dated photo and observed status via /report — in particular whether the perimeter wall has now been built.",
  },
] as const;

export const seedReports = [
  { subjectKey: "proj-lucky-summer", observedStatus: "not_started", comment: "Demo submission — site visibly dilapidated, no active works.", capturedAt: "2026-09-15T08:30:00Z" },
  { subjectKey: "proj-mama-lucy", observedStatus: "partially_built", comment: "Demo submission — Phase II structure fenced off; no workers on site.", capturedAt: "2026-09-15T09:10:00Z" },
  { subjectKey: "proj-gumba", observedStatus: "abandoned", comment: "Demo submission — only boulders remain where the dispensary stood.", capturedAt: "2026-09-15T10:05:00Z" },
] as const;



