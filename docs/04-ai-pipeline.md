# 04, AI pipeline

## Why a model is involved at all

Because the public record is written in prose, and comparing claims needs structure.

The Auditor-General does not publish tidy rows. She publishes a 500 page PDF with sentences like "the contractor had not been on site since March 2023". A tender award is an old HTML table. A completion claim is something someone said at an event. A database cannot compare sentences. It can only compare typed values: amounts, dates, statuses, names.

So the model has exactly one job: turn an unstructured document into typed claims, each tied to an exact quote. It bridges how governments publish and how evidence has to look before you can cross-examine it.

What the model never does matters more:

- It never decides a verdict. Verdicts come from plain rules run over claims.
- It never writes to the public case file. A person publishes.
- It never claims more than its quote supports. No quote, no candidate.
- It never sees reporter data. No personal details go into prompts, ever.

AI proposes, rules reconcile, people approve. For a tool about trust, that sentence carries the whole design.

## What we take in

- Official audits: the OAG Green Books for county executives, FY22/23 onward. PDFs, around 500 pages. We pull inspection findings, stalled or abandoned status, amounts, dates.
- Budget documents: county estimates and controller of budget reports. PDFs. Allocations per project, spend percentages, financial year.
- Procurement: tender notices and awards from the tender portal and county pages. HTML and PDF. Tender numbers, contractors, award amounts, dates.
- Official claims: county press releases, project dashboards, speeches. HTML and PDF. Completion claims and milestone announcements.
- Independent media: The Star, NTV, Willow Health Media, Eastleigh Voice. Web pages. Site visits, photos, contradictions.
- Community: field reports from the app. These skip the model completely because they arrive structured already.

Reference data like the office directory and ward boundaries is curated by hand, not extracted.

## The stages

1. Fetch and store. Download the file, hash it, keep the raw copy (R2, or the local `corpus/` folder during development). If the same URL changes and the hash differs, that is a new document version pointing back at the old one.
2. Read. Gemini reads the PDF as a document (up to 1000 pages or 50MB, about 258 tokens a page; scanned pages work through vision, so no separate OCR setup). Big files go through the Files API, small ones inline. We chunk by chapter or page range and keep page numbers.
3. Extract. One call per chunk through the AI SDK returns claim candidates: kind, stage, the assertion in words, amount in KSh, date, party name, and the quote with its page. A fast model handles bulk; a stronger one handles hard pages. Big backfills can use the Batch API, which is cheaper and takes up to a day, since ingestion is never urgent.
4. Check with code, not with the model. Each candidate's quote must match the stated page's text closely, the page must exist, amounts and dates must parse. One repair try, then quarantine. Every run is logged (model, prompt version, tokens, cost). That log is our own audit trail for the AI, and the hackathon writeup quotes it directly.
5. Match names. Candidates are matched to projects and parties, exact keys first (tender numbers, facility names), model suggestions second, a person confirms.
6. Review. A reviewer sees the candidate next to the source page and approves, edits, or rejects. Only approved claims go public.
7. Reconcile and snapshot. The plain engine turns approved claims into verdicts and open gaps, stored as new rows.

## Where else the model shows up

- Plain language and Swahili summaries of approved claims. The original is always one tap away. A translation is never the only copy.
- Drafting access to information letters: a template plus model polish, with the cited gaps baked in. A person sends it.
- Spotting possible contradictions: the model suggests claim pairs, rules confirm, people see the reasoning. It speeds up linking without deciding anything.
- Later, maybe: asking the case file questions, answered only from approved claims with quote chips attached. First thing to cut if time runs short.

## Quality and cost

- A gold set of about 30 hand checked claims from the FY22/23 Nairobi chapter measures each prompt version on kind, amount, date, and quote validity. Prompts carry version numbers on every run.
- The demo set is around 4 big PDFs plus 10 articles, a few hundred thousand tokens, inside the Gemini free tier. The run log shows the real numbers.
- If extraction fails, the document stays stored and marked failed, and the case file says "not yet processed". The system degrades by telling the truth.
