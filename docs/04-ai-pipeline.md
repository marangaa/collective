# 04 — AI pipeline

## Why an LLM pipeline exists here at all

Because **the public record is prose, and reconciliation needs structure.**

The Auditor-General does not publish rows; she publishes a 500-page PDF containing sentences
like *"the contractor had not been on site since March 2023"*. A tender award is an HTML
table from 2016. A completion claim is a speech. A database cannot compare sentences — it can
only compare **typed values**: amounts, dates, statuses, parties.

So the LLM has exactly one job: **unstructured document → typed claims, each bolted to a
verbatim evidence span.** It is the universal adapter between how governments publish and how
evidence must be structured to be cross-examined.

Just as important is what the LLM **never** does:

- It never decides a verdict. Reconciliation is deterministic rules over claims.
- It never writes to the public case file. A human review gate publishes.
- It never asserts beyond the span. No span → the candidate is discarded.
- It never sees field-reporter data (no PII in prompts, ever).

This division is the product's epistemics made architectural: **AI proposes, rules reconcile,
humans approve.** In a tool whose subject is trust, that sentence is the whole game.

## What exactly we ingest (taxonomy)

| Source type | Examples (Kenya) | Format | What we extract |
| --- | --- | --- | --- |
| Official audits | OAG Green Books (county executives, FY22/23→FY24/25) | PDF, ~500pp | inspection findings, stalled/abandoned status, amounts, dates |
| Budget docs | County budget estimates; OCOB implementation reports | PDF | allocations per project, execution %, fiscal year |
| Procurement | tenders.go.ke notices/awards; county tender pages | HTML/PDF | tender no., contractor, award amount, dates |
| Official claims | County press releases, project dashboards, speeches | HTML/PDF | completion claims, milestone announcements |
| Independent media | The Star, NTV, Willow Health Media, Eastleigh Voice | HTML | site-visit findings, photos, contradictions |
| Community | Field reports from the PWA | structured | **bypasses LLM entirely** — already typed |

Reference data (institutions directory, ward/county boundaries) is curated, not extracted.

## Pipeline stages

1. **Fetch & vault.** Download → SHA-256 → immutable raw object (R2 / local `corpus/`).
   Re-fetch with a new hash = new document version (`supersedes_id`).
2. **Read.** Gemini document understanding (native-vision PDF, ≤1000 pages / 50MB,
   ~258 tokens/page; scanned pages work via vision — no separate OCR stack). Files API for
   large docs; inline for small ones. Chunk by chapter/page-range; page anchors preserved.
3. **Extract.** AI SDK v6: `generateText` + `Output.object({ schema })` (zod). One call per
   chunk returns claim candidates: `kind, stage, assertion, amountKes, eventDate,
   partyLabel, span{page, excerpt}`. Flash-class model for bulk; Pro-class for hard pages.
   Bulk corpora can go through the Gemini Batch API (cheaper, 24h) — ingestion is not
   latency-sensitive.
4. **Validate (programmatic, no LLM).** For every candidate: the excerpt must fuzzy-match
   the stated page's text; the page must exist; amounts/dates must parse. One repair retry,
   else quarantine. Everything logged to `extraction_runs` (model, prompt version, tokens,
   cost) — our own AI audit trail, reused verbatim in the hackathon written summary.
5. **Resolve entities.** Match candidates to projects/parties: deterministic keys first
   (tender numbers, facility names), LLM-merge proposals second, human confirms.
6. **Review gate.** Reviewer console: candidate ↔ source page side by side;
   approve / edit / reject. Only `approved` claims are public.
7. **Reconcile & snapshot.** Deterministic engine → verdicts + gaps (append-only).

## Where else AI appears in the product

- **Plain-language & Swahili summaries** of approved claims (display layer; originals always
  one tap away — translation can never become the only copy).
- **ATI letter drafting**: template + LLM polish, with the cited gaps embedded. Human sends.
- **Contradiction candidacy**: LLM flags candidate claim pairs; rules confirm; humans see the
  reasoning. Speeds up linking, never decides it.
- Stretch: **"ask this case file"** Q&A constrained to approved claims with mandatory citation
  chips. Cut first if time tightens.

## Quality & cost discipline

- **Gold set**: ~30 hand-verified claims from the FY22/23 Nairobi chapter; measure
  precision/recall on kind, amount, date, span validity per prompt version. Prompts are
  versioned (`prompt_version` on every run).
- **Cost reality**: the demo corpus is ~4 large PDFs + ~10 articles ≈ a few hundred thousand
  tokens — comfortably inside the Gemini free tier (per-project RPM/RPD). `extraction_runs`
  proves it with real numbers.
- **Failure posture**: a failed extraction leaves the document vaulted and marked `failed`;
  the case file simply shows "not yet processed". The system degrades honestly.
