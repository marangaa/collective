# collective design docs

> A case file anyone can check, for public promises. Built for the OSF x Andela "Information you can trust" capstone.

These docs are the source of truth. Code follows them. When a decision changes, the docs change first (see `07-decisions.md`).

- [01, Vision and case](01-vision.md): the problem, the Nairobi case, how we think, track fit, what we are not doing
- [02, System architecture](02-architecture.md): the five stages, the packages, how data moves, where it runs
- [03, Data model](03-data-model.md): the Postgres schema, the rules, how claims become verdicts
- [04, AI pipeline](04-ai-pipeline.md): why a model is involved at all, what we feed it, how we check its work, what it costs
- [05, UX and interface](05-ux.md): who uses this, what the screens do, how offline works
- [06, Infrastructure](06-infrastructure.md): Neon, R2, maps, the PWA, auth, what the free tiers cover
- [07, Decisions](07-decisions.md): each big choice, why we made it, what would change our mind

## Where the submission answers live

The hackathon asks for four things: track, sources, trust and accuracy, and how AI tools were used.

- Track: `01-vision.md`
- Sources: `04-ai-pipeline.md`, the part about what we ingest
- Trust and accuracy: `03-data-model.md` (how evidence is stored) plus `04-ai-pipeline.md` (how it is checked and reviewed)
- AI usage: `04-ai-pipeline.md` plus the repo itself (provider setup, prompt versions, run logs in `extraction_runs`)
