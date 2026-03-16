# Touchpoints & Cadence Intelligence

One-liner: Touchpoints & Cadence Intelligence turns outreach activity into measurable, repeatable commercial intelligence.

Summary
-------
This module captures every contact attempt in a structured format, builds a per-lead touchpoint timeline, calculates journey summaries, and aggregates cadence-level insights to help SDRs, sales reps and managers understand which channels and sequences convert best.

Why it matters
--------------
- Converts free-form outreach history into analyzable signals.
- Measures how many contacts are needed to book and which sequences work.
- Enables operational recommendations and future recommendation engines.

What this PR includes
---------------------
- Full PRD YAML at `docs/prd/touchpoints-cadence-intelligence.yml`.
- Human-readable summary at `docs/prd/touchpoints-cadence-intelligence.md`.

Next steps
----------
1. Review data model and map to Prisma schema changes.
2. Add APIs: create/list touchpoints, lead journey summary endpoint, cadence insights endpoints.
3. Implement background recalculation on `touchpoint_created` events.
4. Add UI components: lead timeline and fast touchpoint modal.

Related
-------
- Related backend fixes: Redis auth improvements and PRR calculation fixes (see branches `fix/redis-auth` and PRR scripts).
