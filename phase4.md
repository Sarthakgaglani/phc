# Phase 4 — Redistribution Engine

Use this prompt with Claude Code in this repo. CLAUDE.md governs architecture
and non-negotiable domain logic — the rules in this phase are the actual
safety property of the whole system, so treat them as hard constraints, not
guidelines. Phases 0–3 (foundations, inventory ledger, operational signals,
forecasting/risk/alerts) should already be complete — confirm this before
proceeding.

## Instruction to Claude Code

We are starting **Phase 4: Redistribution Engine**. This is the platform's
core value proposition: recommending safe donor-to-recipient transfers
without ever creating a shortage at the donor. Do not build the approval
workflow yet (Phase 5) — this phase only produces recommendations.

Before writing code, restate your understanding of the matching logic and
any assumptions, per CLAUDE.md's working conventions.

### Non-negotiable rules for this phase (from CLAUDE.md)

- Only **Safe Surplus** (`max(Current Stock - Required Stock, 0)`) is ever
  transferable. Never transfer because a PHC merely "has more."
- A transfer must never drop the donor below its configured minimum **Days
  of Cover**.
- A single shortage may be split across multiple donors — never force one
  donor to supply more than its own safe surplus.
- Prefer **FEFO** (First Expiry, First Out) when donors are otherwise
  equally safe to select from.

Verify your implementation against the worked examples in the project
memory/brief (PHC A/B/C shortage and surplus scenario) before considering
this phase done.

### Backend tasks

1. In `transfers`: a `TransferRecommendation` model.
2. Build the donor-matching algorithm as a **pure function** over
   (shortages, surpluses, config) so it's independently testable and
   swappable later (e.g. replaceable by a proper optimization solver
   without touching the surrounding workflow code). It should:
   - Identify PHCs with a shortage (from Phase 3's `StockRisk`).
   - Identify eligible donors with safe surplus.
   - Rank/select donors considering: safe surplus amount, donor's own
     predicted future demand, distance/transport time (a static distance
     table or simple lat/long calculation is fine for MVP), expiry/FEFO if
     batch data exists, and resulting Days of Cover after transfer.
   - Split a shortage across multiple donors when no single donor can
     safely cover it alone.
3. Build the **explainability payload** as structured data on every
   `TransferRecommendation` — not just a rendered string. Include: the
   recipient's shortfall math, the donor's predicted demand, the donor's
   Days of Cover after transfer, and why this donor was chosen
   (surplus/distance/expiry). This structured data will be reused directly
   by the UI in this phase and Phase 5, and by Gemini summarization in
   Phase 6 — it should not need to be re-derived later.
4. Run matching as a Celery task triggered per shortage event (from Phase
   3's alert generation), not synchronously inside a request/response
   cycle.

### Frontend tasks

1. Build the **explainability panel as a single reusable component** —
   this is the most important reuse decision in the whole project, since
   it will also be used in Phase 5's approval screen and any alert detail
   view. Do not build it as a one-off inside a single screen.
2. On the District dashboard, add a recommendation list with this
   explainability panel inline/expandable on each recommendation card — per
   CLAUDE.md, this must be inline/expandable, not a separate report page.

### Explicitly out of scope this phase
- Approval workflow, transfer state machine, dispatch/receipt (Phase 5)
- Real-time push of recommendations (Phase 5)
- State dashboard (Phase 5)
- Any Gemini/LLM summarization (Phase 6)

### Definition of done
- Given the seeded PHC A/B/C shortage/surplus test scenario, the system
  produces the correct split recommendation, matching the worked example in
  the project brief exactly.
- No test scenario allows a donor to be recommended below its own required
  stock or configured minimum Days of Cover.
- The explainability panel is a single reusable component, not duplicated
  per screen.

When done, summarize what was built, any deviations, and any assumptions
made, so we can confirm before moving to Phase 5.
