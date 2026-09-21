# 01 — Vision & case

## One sentence

**collective** turns a community's scattered public record — audits, budgets, tenders, press
claims, and what residents can see with their own eyes — into an **inspectable evidence chain**
that anyone can verify and act on.

Not a chatbot. Not a dashboard. An engine that answers one question honestly:

> "The county said it was built. What can the public record actually *establish*?"

## The problem

Citizen audits already exist and already work — OSF has funded them in Kenya and South Africa
for years; the National Taxpayers Association runs ward committees that do this with paper,
site visits, and meetings. What does not exist is the **machinery**:

1. The record is fragmented across audit PDFs, budget books, tender portals, press releases,
   and news investigations — each in a different silo, format, and vocabulary.
2. Reading it requires institutional knowledge (what is a Green Book? who audits counties?
   what does "stalled" mean contractually?).
3. The community's own observations — "that clinic has been fenced off for two years" — have
   no structured place to live alongside the official record.
4. Even when a contradiction is found, nobody knows *what to do next*: which institution,
   which document to demand, which law entitles you to it.

## The case we build against (locked)

**Nairobi County health facilities cluster**, from the Auditor-General's FY2022/23 county
reports (public) and subsequent public record:

- One contractor was engaged to build **three Pumwani health facilities** (Lucky Summer
  Dispensary, Pumwani Majengo Health Centre, Gumba/Mabatini Dispensary) for a combined
  **KSh 869M**. OAG physical inspection (28–29 Sept 2023): incomplete; Lucky Summer "barely
  started... dilapidated"; Majengo missing its perimeter wall.
- The **same contractor** was then awarded **Mama Lucy Kibaki Hospital Phase II** for
  **KSh 344,100,000**. It stalled after **KSh 165,099,105** was paid.
- In **2025 the county re-tendered "construction and completion works"** for Mama Lucy
  Phase II — an official document implicitly conceding non-delivery.
- Media ground truth exists (Willow Health Media's clinic investigation, Eastleigh Voice,
  The Star, NTV). Three fiscal years of OAG reports give us **the same projects observed at
  three points in time** — freshness and versioned claims demonstrated on real documents.

Four projects, one case file, one unnamed-contractor thread the reconciliation engine surfaces.

## Design principles

1. **Evidence before inference.** The system assembles, cross-references, and flags. It never
   declares. Verdicts are three-valued — `corroborated / contradicted / unverifiable` — and
   every one is one click from verbatim source excerpts.
2. **Provenance or it didn't happen.** Every claim carries document + page + verbatim span.
   Every document is content-addressed (SHA-256) with retrieval timestamps.
3. **"Unverifiable" is an answer.** Absence of evidence is a first-class, actionable output —
   it generates the exact next step (which document to demand, from whom, under which law).
4. **Action is the output.** A case file ends in next steps: the institution, the pre-filled
   Access to Information Act (2016) request, the oversight referral. Not a red chart.
5. **Built for the matatu, not the boardroom.** PWA-first, offline-capable field reporting,
   low-bandwidth reads, low-end Android as the reference device.
6. **Anonymous by default.** Field reporters never provide PII (Kenya Data Protection Act
   2019 by design, not by policy page). Pseudonymous corroboration without identity.
7. **Language discipline.** We say "the record shows", "the sources disagree", "this cannot be
   established". Never "corrupt", never "stolen". The system is an evidence interface, not an
   accusation machine.

## Track alignment (brief → design)

| Brief requirement | Our answer |
| --- | --- |
| Transparency & Accountability track | Real-time scrutiny of public projects, not after-the-fact |
| "More than present information… engage with government" | Next-step engine: ATI requests, oversight referrals, institution routing |
| Trust & verification | Content-addressed documents, span-grounded claims, verdict snapshots |
| Low bandwidth | PWA + edge-cached API + small payloads + optional map |
| Privacy & security | Anonymous reporting, EXIF-stripped photos, no PII |
| Multilingual | EN/SW interface shell; claim summaries translatable (Gemini) |
| Local relevance / adaptable | Kenya institutions directory; OCDS-aligned schema swaps countries |
| Clear next steps | The entire stage ⑤ of the pipeline |
| "Not an information website" | The unit of the product is the *case file with actions*, not articles |

## Non-goals (v1)

- Nationwide coverage — one county, one case, done deeply.
- Naming or accusing parties the record itself leaves unnamed.
- Automated corruption detection, scoring, or rankings of officials.
- A general-purpose civic chatbot.
- Production-scale ingestion of every Kenyan source (pipeline is real; corpus is curated).
