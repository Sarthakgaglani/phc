# Phase 3 — Forecasting & Risk

Use this prompt with Claude Code in this repo. CLAUDE.md governs architecture
and non-negotiable domain logic. Phases 0–2 (foundations, inventory ledger,
PHC dashboard, operational signals, district dashboard) should already be
complete — confirm this before proceeding.

## Instruction to Claude Code

We are starting **Phase 3: Forecasting & Risk**. This phase introduces
deterministic demand forecasting, Days of Cover, and alerts. Do not build
redistribution/transfer logic yet — that's Phase 4. Do not introduce any LLM
usage here; per CLAUDE.md, LLMs never do deterministic calculation.

Before writing code, restate your understanding of scope and any
assumptions, per CLAUDE.md's working conventions.

### Backend tasks

1. In `forecasting`: a `DemandForecast` model, and a forecasting **service
   interface** — e.g. `forecast(phc, medicine, horizon) -> DemandForecast`.
   Implement it first with a simple deterministic method (moving average or
   weighted moving average over historical consumption from Phase 1's
   ledger). The interface must be swappable — later replacement with a
   better model or ML approach should not require changing any caller.
2. Build the `StockRisk` calculation, layered on top of Phase 1's
   `current_stock()` and this phase's forecast service:
   ```
   Required Stock = Predicted Demand + Safety Stock
   Shortage       = max(Required Stock - Current Stock, 0)
   Days of Cover  = Current Stock / Predicted Daily Consumption
   ```
   Safety stock and any thresholds must be pulled from the Phase 0 config
   models — never hard-coded.
3. In `alerts`: an `Alert` model and generation logic covering at least:
   critical stock-out risk, high stock-out risk, below safety threshold, and
   (if batch data exists) expiring stock. Thresholds are configurable, per
   CLAUDE.md.
4. Introduce Celery + Redis now (first genuinely async piece of the system):
   a periodic task that recomputes forecasts/risk/alerts. Structure this as
   independent per-PHC-per-medicine tasks rather than one large batch job,
   so it scales roughly linearly with PHC count.
5. Log forecast inputs and outputs somewhere queryable (e.g. store them on
   `DemandForecast` itself) — this will be needed for the explainability
   payload in Phase 4 and for evaluating forecast accuracy later.

### Frontend tasks

1. Wire real Days of Cover and stock-out risk values into the PHC dashboard
   slots built in Phase 1 — this is the first time those numbers are live
   rather than placeholder.
2. Build an alert list/banner component using the same risk color coding
   established in Phase 0 — this component will be reused for
   recommendations in Phase 4, so build it generically now.
3. On the District dashboard, surface high-risk PHCs prominently (e.g. a
   sorted/filtered "needs attention" section) — this is the first
   signal-forward view for officers.

### Explicitly out of scope this phase
- Redistribution/donor matching (Phase 4)
- Approval workflow (Phase 5)
- Any Gemini/LLM usage (Phase 6, and never for the numbers above)

### Definition of done
- Every PHC has a live forecast, Days of Cover figure, and correctly
  triggered alerts based on configurable (not hard-coded) thresholds.
- Forecast recomputation runs as independent async tasks per PHC/medicine.
- Alert and risk color coding matches the Phase 0 design tokens exactly.

When done, summarize what was built, any deviations, and any assumptions
made, so we can confirm before moving to Phase 4.
