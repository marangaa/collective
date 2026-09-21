/**
 * Institutions directory (Kenya) + next steps for the Nairobi case.
 * bodyTemplate uses {{project}} / {{facts}} placeholders filled at render time.
 */

export const seedInstitutions = [
  { key: "ncc-health", name: "Nairobi City County — CECM, Health Services", kind: "county_exec", mandate: "County department responsible for delivering health infrastructure.", atiEligible: true },
  { key: "ncca-pac", name: "Nairobi City County Assembly — Public Accounts & Investments Committee", kind: "county_assembly", mandate: "Examines audited county accounts and value-for-money on public projects.", atiEligible: false },
  { key: "oag", name: "Office of the Auditor-General", kind: "oversight", mandate: "Audits the use of public funds by national and county governments.", atiEligible: true },
  { key: "ppra", name: "Public Procurement Regulatory Authority", kind: "regulator", mandate: "Regulates public procurement; holds tender and contractor records.", atiEligible: true },
  { key: "eacc", name: "Ethics and Anti-Corruption Commission", kind: "commission", mandate: "Investigates corruption and economic crime in public bodies.", atiEligible: false },
  { key: "caj", name: "Commission on Administrative Justice", kind: "commission", mandate: "Enforces the Access to Information Act 2016; handles ATI complaints.", atiEligible: false },
  { key: "nta", name: "National Taxpayers Association", kind: "cso", mandate: "Runs citizen audits and public-finance monitoring with ward-level committees.", atiEligible: false },
] as const;

export const seedNextSteps = [
  {
    projectKey: "mama-lucy-2", institutionKey: "ncc-health", kind: "ati_request", priority: 1,
    title: "Request the Mama Lucy Phase II contract file",
    bodyTemplate:
      "REQUEST UNDER THE ACCESS TO INFORMATION ACT, 2016\n\nTo: Nairobi City County — CECM, Health Services\n\nRe: Mama Lucy Kibaki Hospital Phase II (contract sum KSh 344,100,000)\n\nPursuant to Article 35 of the Constitution and sections 5–8 of the Access to Information Act, 2016, I request certified copies of:\n1. The signed contract and all variations;\n2. All interim payment certificates (the Auditor-General records KSh 165,099,105 paid);\n3. Any completion certificate or notice of termination;\n4. The current contract status and any re-procurement decision, including the 2025 tender for 'construction and completion works'.\n\nI request a response within the statutory 21 days.",
  },
  {
    projectKey: "mama-lucy-2", institutionKey: "ncca-pac", kind: "oversight_referral", priority: 2,
    title: "Refer payments-vs-delivery to the County Assembly PAC",
    bodyTemplate:
      "Request to the Public Accounts & Investments Committee: examine payments of KSh 165,099,105 against physical delivery of Mama Lucy Kibaki Hospital Phase II, per the Auditor-General's FY2022/23 findings, and summon the contracting authority to explain the re-tendering of the same works in 2025.",
  },
  {
    projectKey: "lucky-summer", institutionKey: "ncc-health", kind: "ati_request", priority: 1,
    title: "Request the status of the KSh 869M three-facility contract",
    bodyTemplate:
      "REQUEST UNDER THE ACCESS TO INFORMATION ACT, 2016\n\nRe: Construction and equipping of Lucky Summer Dispensary, Pumwani Majengo Health Centre and Gumba/Mabatini Dispensary (combined KSh 869,000,000, single contractor)\n\nI request: (1) the contract and award records, including the contractor's identity and PPRA registration; (2) all payments made to date; (3) whether the contract has been terminated, re-awarded or varied; (4) the current delivery plan for each facility.\n\nI request a response within the statutory 21 days.",
  },
  {
    projectKey: "gumba-mabatini", institutionKey: "ncc-health", kind: "ati_request", priority: 1,
    title: "Request disposal records for the demolished dispensary",
    bodyTemplate:
      "REQUEST UNDER THE ACCESS TO INFORMATION ACT, 2016\n\nRe: Gumba/Mabatini Dispensary (completed under the KSh 869M contract; reported demolished during riparian-land clearance — Willow Health Media, July 2026)\n\nI request: (1) the asset register entry and handover records for the completed building; (2) any valuation, condemnation or disposal authorisation preceding demolition; (3) the county's plan for replacement of the facility for Gumba and Mabatini residents.\n\nI request a response within the statutory 21 days.",
  },
  {
    projectKey: "lucky-summer", institutionKey: "nta", kind: "field_verification", priority: 3,
    title: "Confirm the current state on the ground",
    bodyTemplate:
      "Community verification ask: if you are near Lucky Summer (Pumwani), submit a dated photo and observed status via /report. Two or more independent reports move this project's current-state verdict from 'unverifiable' to 'corroborated'.",
  },
  {
    projectKey: "majengo", institutionKey: "nta", kind: "field_verification", priority: 3,
    title: "Confirm the current state on the ground",
    bodyTemplate:
      "Community verification ask: if you are near Pumwani Majengo, submit a dated photo and observed status via /report — in particular whether the perimeter wall has now been built.",
  },
] as const;
