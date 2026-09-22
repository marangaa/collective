# 01, Vision and case

## One sentence

collective takes a community's scattered public record, audits, budgets, tenders, press claims, and what residents see themselves, and turns it into an evidence chain anyone can check.

Not a chatbot. Not a dashboard. It answers one question honestly:

> "The county said it was built. What does the public record actually show?"

## The problem

Citizen audits already exist and they work. OSF has funded them in Kenya and South Africa for years. The National Taxpayers Association runs ward committees that do this with paper, site visits, and meetings. What is missing is the machinery around them:

1. The record is split across audit PDFs, budget books, tender portals, press releases, and news stories. Each one has its own format and its own words for the same thing.
2. Reading it takes inside knowledge. What is a Green Book? Who audits counties? What does "stalled" mean in a contract?
3. What residents see, "that clinic has been fenced off for two years", has nowhere structured to sit next to the official record.
4. Even when someone finds a contradiction, nobody knows what to do next. Which office, which document to ask for, which law gives you the right to ask.

## The case we build against

This case is fixed. We are not swapping it out.

Nairobi County health facilities, from the Auditor-General's county reports for FY2022/23 (public) and what came after:

- One contractor was hired to build three Pumwani health facilities (Lucky Summer Dispensary, Pumwani Majengo Health Centre, Gumba/Mabatini Dispensary) for KSh 869M combined. The Auditor-General inspected on 28 and 29 Sept 2023 and found them incomplete. Lucky Summer had barely started and looked run down. Majengo was missing its perimeter wall.
- The same contractor then won Mama Lucy Kibaki Hospital Phase II for KSh 344,100,000. Work stalled after KSh 165,099,105 had been paid.
- In 2025 the county re-tendered "construction and completion works" for Mama Lucy Phase II. That document admits, without saying it, that the work was never delivered.
- Journalists have been on the ground (Willow Health Media, Eastleigh Voice, The Star, NTV). Three years of audit reports cover the same projects at three points in time, which is exactly what you need to show how claims change.

Four projects, one case file, one unnamed contractor running through all of them.

## How we think

1. Evidence before guessing. The system collects, compares, and flags. It never turns a guess into a fact. Every verdict is one of four words, corroborated, partially corroborated, contradicted, or unverifiable, and each one traces back to approved claims and exact quotes.
2. No source, no claim. Every claim points to one of three things: a document plus the exact passage, a photo or recording, or a field report someone filed. We keep the originals. A summary never replaces them.
3. "Unverifiable" counts as an answer. When the evidence is missing, the system says so, and tells you the exact next step: which document to ask for, from whom, under which law.
4. A case file should end in action. The output is the office to contact, a pre-filled request under the Access to Information Act (2016), a referral to an oversight body. Not a red chart.
5. Built for the matatu, not the boardroom. The app works on cheap Android phones, on slow networks, and offline where it matters.
6. Anonymous by default. Reporters give no personal details. Kenya's Data Protection Act (2019) holds because of how the system is built, not because a policy page says so.
7. Careful with words. We say "the record shows", "the sources disagree", "this cannot be established". We never say "corrupt" or "stolen". This is an evidence tool, not an accusation tool.

## How this fits the brief

The hackathon asks for work under Transparency and Accountability, and that is where we sit: scrutiny of public projects while they happen, not years later.

"More than present information" is answered by the next-step engine. Every gap turns into a request or a referral with the right office named.

Trust and verification come from keeping the original documents, quoting exact passages, and snapshotting verdicts so you can see what changed.

Low bandwidth is answered by the PWA, small API responses, cached pages, and a map you can switch off.

Privacy is answered by anonymous reporting and photos stripped of location data before they leave the phone.

Multilingual means the interface shell runs in English and Swahili, and claim summaries can be translated with the original always one tap away.

Local relevance means a real directory of Kenyan offices, real wards, and a schema borrowed from open contracting standards so another country can reuse it.

Clear next steps are simply what the last pipeline stage does.

And it is not an information website. The unit of this product is the case file with actions attached, not articles.

## What we are not doing (v1)

- Covering the whole country. One county, one case, done properly.
- Naming people the record itself does not name.
- Scoring officials or detecting corruption automatically.
- Building a general civic chatbot.
- Ingesting every Kenyan source. The pipeline is real but the starting set of documents is picked by hand.
