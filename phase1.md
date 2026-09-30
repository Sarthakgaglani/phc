# Phase 1 — Core Inventory Domain

Use this prompt with Claude Code in this repo. CLAUDE.md governs architecture
and non-negotiable domain logic — treat it as binding. Phase 0 (foundations,
RBAC, design tokens, config models) should already be in place; confirm this
before proceeding, and do not re-do or restructure Phase 0 work without
flagging it first.

## Instruction to Claude Code

We are starting **Phase 1: Core Inventory Domain**. This is the most
important phase to get exactly right — every later calculation (forecasting,
shortage, redistribution) depends on inventory being correct and auditable.
Slow down here. Do not proceed to forecasting, alerts, or transfers in this
phase.

Before writing code, restate your understanding of the ledger design and any
assumptions, per CLAUDE.md's working conventions.

### Backend tasks

1. In `medicines`: a `Medicine` model. Only add `MedicineBatch` now if batch
   tracking is confirmed in scope for this phase — otherwise defer it to
   Phase 4, when FEFO donor selection actually needs it. Ask before adding it
   speculatively.
2. In `inventory`: an `InventoryTransaction` ledger model recording every
   stock movement type: opening balance, receipt, consumption, transfer out,
   transfer in, adjustment, expiry, damage. **This is a ledger, not a
   mutable stock field** — per CLAUDE.md's non-negotiable rule #4, current
   stock must always be derivable/auditable from transactions. Do not add a
   `current_stock` field to any model that gets written to directly.
3. Build a `current_stock(phc, medicine)` service function that derives
   current stock from the transaction history. This becomes the single
   source of truth — forecasting and shortage logic in later phases must
   call this, not reimplement stock queries themselves.
4. Add appropriate indexes on the transaction table (at minimum:
   phc, medicine, date) — this table will be the largest and most-queried
   table in the system as data grows.
5. Build a simple API/admin path for manually recording stock movements
   (receipts, consumption entries) — this is the primary data-entry path
   until any external system integration exists.
6. Unit tests: given a constructed transaction history, verify
   `current_stock()` returns the correct value, and verify there is no code
   path that overwrites stock directly.

### Frontend tasks

1. Build **PHC Dashboard v1**: current inventory per medicine, displayed as
   cards/table using the risk color tokens from Phase 0 — even though real
   risk calculation doesn't exist yet, wire the visual language now against
   placeholder or manually-configured thresholds.
2. Build this dashboard as the **template** for District and State
   dashboards in later phases — favor reusable components (inventory card,
   status badge) over one-off layout code, since Phase 2 and Phase 5 will
   extend this rather than rebuild it.
3. Build a stock-movement entry form (receipt/consumption) with basic
   validation and optimistic UI, since this is the first write-heavy screen
   in the app.

### Explicitly out of scope this phase
- Forecasting, Days of Cover, risk/alerts (Phase 3)
- Redistribution/transfers (Phase 4/5)
- District/State dashboards (Phase 2/5)
- Patient footfall, beds, staffing (Phase 2)

### Definition of done
- Inventory numbers on the PHC dashboard are 100% derived from
  `InventoryTransaction` records and match manual recalculation from the raw
  transaction log.
- No model or code path allows direct stock overwrites.
- Indexes exist on the transaction table appropriate for (phc, medicine,
  date) query patterns.

When done, summarize what was built, any deviations, and any assumptions
made, so we can confirm before moving to Phase 2.
