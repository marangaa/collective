# collective — design docs

> An inspectable evidence engine for public promises. OSF × Andela "Information you can trust" capstone.

These documents are the design authority for the project. Code follows these docs; when a
decision changes, the docs change first (see `07-decisions.md`).

| Doc | Focus |
| --- | --- |
| [01 — Vision & case](01-vision.md) | The problem, the Nairobi case, design principles, track alignment, non-goals |
| [02 — System architecture](02-architecture.md) | The five-stage pipeline, module/package map, deployment topology |
| [03 — Data model](03-data-model.md) | PostgreSQL schema v3, lifecycle rules, OCDS/FtM alignment, geospatial |
| [04 — AI pipeline](04-ai-pipeline.md) | Why an LLM exists here at all, ingestion taxonomy, extraction, validation, review gate, evals, cost |
| [05 — UX & interface](05-ux.md) | Personas, the case-file interface (map × timeline × evidence), field-report flow, review console, offline behavior |
| [06 — Infrastructure](06-infrastructure.md) | Neon, R2, maps, PWA realities, auth, env vars, free-tier budget |
| [07 — Decisions (ADRs)](07-decisions.md) | Every consequential choice, with rationale and what would change our mind |

## How these map to the hackathon submission

The written summary asks for: track, information sources, trust/accuracy approach, AI-tool usage.

- **Track** → `01-vision.md`
- **Information sources** → `04-ai-pipeline.md` § Ingestion taxonomy
- **Trust & accuracy** → `03-data-model.md` (provenance model) + `04-ai-pipeline.md` (validation/review)
- **AI usage (build + product)** → `04-ai-pipeline.md` + the repository's implementation history and provider configuration
