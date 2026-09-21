/**
 * Seed corpus — the Nairobi health facilities case.
 * Every assertion below is grounded in a verbatim excerpt from a real, public
 * source (OAG county audit reports as quoted, The Star, NTV, Willow Health
 * Media, Nairobi City County tender listings). extraction_method: "manual"
 * means a human verified the span against the source.
 */

export const seedSources = [
  { key: "oag", name: "Office of the Auditor-General", publisher: "OAG Kenya", type: "audit", url: "https://www.oagkenya.go.ke/", trustTier: "official", county: null },
  { key: "star", name: "The Star", publisher: "The Star Kenya", type: "news", url: "https://www.the-star.co.ke/", trustTier: "independent", county: null },
  { key: "ntv", name: "NTV Kenya", publisher: "Nation Media Group", type: "news", url: "https://ntvkenya.co.ke/", trustTier: "independent", county: null },
  { key: "willow", name: "Willow Health Media", publisher: "Willow Health Media", type: "news", url: "https://willowhealthmedia.com/", trustTier: "independent", county: "Nairobi City" },
  { key: "ncc", name: "Nairobi City County", publisher: "Nairobi City County Government", type: "procurement", url: "https://nairobi.go.ke/", trustTier: "official", county: "Nairobi City" },
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

export const seedProjects = [
  { key: "lucky-summer", name: "Lucky Summer Dispensary", ward: "Pumwani", subCounty: "Kamukunji", lat: -1.2830, lng: 36.3840, locationNote: "Approximate — Lucky Summer area, Pumwani, Nairobi" },
  { key: "majengo", name: "Pumwani Majengo Health Centre", ward: "Pumwani", subCounty: "Kamukunji", lat: -1.2805, lng: 36.3865, locationNote: "Approximate — Majengo, Pumwani, Nairobi" },
  { key: "gumba-mabatini", name: "Gumba/Mabatini Dispensary", ward: "Mabatini", subCounty: "Mathare", lat: -1.2627, lng: 36.8536, locationNote: "Approximate — Gumba/Mabatini, near Nairobi River" },
  { key: "mama-lucy-2", name: "Mama Lucy Kibaki Hospital — Phase II", ward: "Embakasi", subCounty: "Embakasi West", lat: -1.3147, lng: 36.8944, locationNote: "Mama Lucy Kibaki Hospital grounds, Embakasi" },
] as const;

export const seedParties = [
  { key: "ncc", name: "Nairobi City County", label: "Nairobi City County (contracting authority)", role: "contracting_authority", isUnnamed: false },
  { key: "contractor-a", name: null, label: "Contractor A (unnamed in OAG report)", role: "contractor", isUnnamed: true },
  { key: "oag", name: "Office of the Auditor-General", label: "Auditor-General", role: "auditor", isUnnamed: false },
] as const;

export const seedReports = [
  { projectKey: "lucky-summer", observedStatus: "not_started", comment: "Demo submission — site visibly dilapidated, no active works.", capturedAt: "2026-09-15T08:30:00Z" },
  { projectKey: "mama-lucy-2", observedStatus: "partially_built", comment: "Demo submission — Phase II structure fenced off; no workers on site.", capturedAt: "2026-09-15T09:10:00Z" },
  { projectKey: "gumba-mabatini", observedStatus: "abandoned", comment: "Demo submission — only boulders remain where the dispensary stood.", capturedAt: "2026-09-15T10:05:00Z" },
] as const;
