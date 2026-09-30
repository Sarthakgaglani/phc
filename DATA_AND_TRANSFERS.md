# Data & Transfer Deep-Dive

This document covers three topics in detail:

1. How the system's **seed data** populates all PHCs
2. How medicine **deduction and transfer** from one PHC to another actually
   works in code
3. How the architecture is designed for **maintainability** — and open
   questions for the future

---

## 1. Seed Data Strategy

### Why seed data?

The system currently has **no live data ingestion** (no integration with
government supply-chain systems, no mobile data-entry by real PHC staff).
Every PHC, medicine, inventory balance, staffing record, bed count, and
patient footfall number in the database comes from the management command:

```bash
python manage.py seed_data
```

This is intentional for the MVP stage — the entire pipeline (forecasting,
risk detection, donor matching, transfers, outcome measurement) can be
demonstrated and tested without external dependencies.

### What gets seeded

| Layer | Details |
|---|---|
| **State** | `UP-SYNTH` — "Uttar Pradesh (synthetic)" |
| **Districts** | 3: Bareilly (6 PHCs), Shahjahanpur (2 PHCs), Pilibhit (2 PHCs) |
| **PHCs** | 10 total, each with deterministic lat/lon coordinates jittered from their district center (~0–15km apart) |
| **Demo users** | `demo_phc` (PHC role, assigned to first PHC), `demo_district` (District role), `demo_state` (State role) — all with password `DemoPass123!` |
| **Medicines** | ORS packets (200 base qty), Paracetamol 500mg (640), Amoxicillin 250mg (310), Iron folic acid (920) |
| **Opening balances** | `base_qty + (index * 37) % 200` per PHC — creates realistic variation so some PHCs naturally have less stock than others |
| **Beds** | `15 + (index * 3) % 20` total beds per PHC, with deterministic occupancy |
| **Patient footfall** | `40 + (index * 23) % 150` visits per PHC |
| **Staff** | 3 roles per PHC (Medical Officer, ANM, Pharmacist), with deterministic attendance |
| **RiskConfig** | One default row: 14-day forecast horizon, 7-day safety stock, 5.0 min Days of Cover, risk thresholds at 3/7/14 days |

### Idempotency guarantee

The seed command uses `get_or_create` for every entity. Re-running it:

- **Never duplicates** existing rows
- **Never overwrites** non-synthetic data
- **Never touches** rows it didn't create

This makes it safe to run repeatedly during development. The command also
back-fills lat/lon coordinates on existing PHCs that were created before
the geo feature was added.

### After seeding

Running `python manage.py recompute_risk` after seeding triggers the full
pipeline:

1. Forecast demand for every PHC/medicine pair
2. Compute stock risk (Days of Cover, shortage/surplus)
3. Generate alerts for at-risk PHCs
4. Auto-generate redistribution recommendations for any PHC with a shortage

This puts the system in a fully demo-ready state where every dashboard has
real (if synthetic) data to display.

---

## 2. How Medicine Deduction Works (PHC A → PHC B)

### Overview

The system **does** implement full medicine deduction. When a transfer is
received, the donor's stock is decremented and the recipient's stock is
incremented, both through the same append-only inventory ledger that tracks
every other stock movement.

### The inventory ledger (source of truth)

Current stock is **never stored as a mutable field**. Instead,
[`InventoryTransaction`](backend/inventory/models/transaction.py) is an
append-only ledger where every row has a signed `quantity`:

| Transaction type | Sign | Example |
|---|---|---|
| `OPENING_BALANCE` | + | Initial stock from seed data |
| `RECEIPT` | + | New stock received from supplier |
| `TRANSFER_IN` | + | Stock received from another PHC |
| `CONSUMPTION` | − | Used for patients |
| `TRANSFER_OUT` | − | Stock sent to another PHC |
| `EXPIRY` | − | Expired medicines removed |
| `DAMAGE` | − | Damaged stock written off |
| `ADJUSTMENT` | ± | Correction (overcount or undercount) |

Current stock = `SUM(quantity)` over all transactions for a PHC/medicine
pair, computed by
[`current_stock()`](backend/inventory/services/stock.py).

### The transfer pipeline

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌────────────┐
│  Shortage    │───▶│ Donor Match  │───▶│  Recommend   │───▶│   Approve    │───▶│  Dispatch   │
│  detected    │    │  (pure fn)   │    │  (persisted) │    │  (human)     │    │  (tracked)  │
└─────────────┘    └──────────────┘    └──────────────┘    └──────────────┘    └──────┬───────┘
                                                                                      │
                                                                                      ▼
                                                                               ┌──────────────┐
                                                                               │   Receive     │
                                                                               │  (writes      │
                                                                               │   ledger)     │
                                                                               └──────────────┘
```

#### Stage 1: Shortage detection

```python
# forecasting/services computes:
required_stock = predicted_demand + safety_stock
shortage = max(required_stock - current_stock, 0)
```

If `shortage > 0`, the matching engine is invoked.

#### Stage 2: Donor matching

[`build_recommendation()`](backend/transfers/services/matching.py)
orchestrates this:

1. Compute `StockRisk` for every active PHC (excluding the recipient).
2. Filter to PHCs with `safe_surplus > 0`.
3. Optionally filter by `max_transfer_distance_km` from `RiskConfig`.
4. Feed candidates to the pure function
   [`match_donors()`](backend/transfers/services/donor_matching.py).

`match_donors()` sorts candidates by `(distance, -surplus,
daily_consumption, expiry_priority, phc_id)` and greedily allocates:

```python
for candidate in sorted(candidates, key=_sort_key):
    cap = min(safe_surplus, min_days_of_cover_cap)  # Two independent limits
    quantity = min(remaining_shortage, cap)
    # ...allocate and reduce remaining_shortage
```

**Safety guarantees (non-negotiable):**

- A donor **never gives more than its safe surplus** (own demand + safety
  stock are always retained).
- A donor **never drops below the configured minimum Days of Cover**.
- A shortage **may be split across multiple donors** — no single donor is
  overloaded.
- The `match_donors` function is a **pure function** over inputs — no
  database queries inside it — making it independently testable and
  swappable for a proper optimization solver later.

#### Stage 3: Human approval

A `TransferRecommendation` is created with a full explainability snapshot
(recipient's math, each donor's stock/surplus/Days of Cover before and
after). A district/state officer reviews and approves or rejects.

**Concurrency protection:** Optimistic locking with a `version` column on
`TransferRequest` ensures two officers cannot both approve the same
recommendation. Idempotency keys ensure retries from flaky rural
connections don't double-apply.

#### Stage 4: Inventory deduction (the actual stock movement)

On **receipt confirmation only**, the
[`receive()`](backend/transfers/services/state_machine.py) function writes
both sides of the transfer **atomically in a single database transaction**:

```python
with transaction.atomic():
    # State transition: DISPATCHED → RECEIVED (optimistic lock)
    _apply_transition(...)

    # Deduct from donor
    record_transfer_out(donor_phc, medicine, quantity, ...)
    # → writes InventoryTransaction(type=TRANSFER_OUT, quantity=-N)

    # Credit to recipient
    record_transfer_in(recipient_phc, medicine, quantity, ...)
    # → writes InventoryTransaction(type=TRANSFER_IN, quantity=+N)

    # Measure: did this actually help?
    record_immediate_outcome(transfer_request, risk_before)
```

This is **the only place the system itself writes to the inventory ledger**
rather than manual entry by PHC staff. Because it's inside
`transaction.atomic()`, either both the deduction and credit succeed, or
neither does — the ledger and transfer status can never disagree.

---

## 3. Maintainability Design

The codebase is explicitly designed for long-term maintainability. Here's
what's already in place and what questions remain open.

### What's already built for maintainability

#### Config-driven, not hard-coded

Every business parameter lives in the
[`RiskConfig`](backend/core/models/config.py) model, editable through
Django Admin:

- Forecast horizon (default: 14 days)
- Safety stock days (default: 7)
- Min Days of Cover for donors (default: 5.0)
- Risk-level thresholds (critical: 3, high: 7, medium: 14 days)
- Max transfer distance (default: unlimited)
- Bed-pressure thresholds
- Outcome follow-up window

Changing any of these **requires zero code changes** — update the row in
Admin and the next risk recompute picks it up.

#### Modular monolith with clean boundaries

Each Django app owns one domain concept and exposes it through services:

| App | Owns | Consumes |
|---|---|---|
| `inventory` | Ledger, `current_stock()` | — |
| `forecasting` | Demand forecast, `StockRisk` | `inventory.current_stock()` |
| `alerts` | Alert generation | `forecasting.StockRisk` |
| `transfers` | Matching, recommendations, state machine | `forecasting.StockRisk`, `inventory.record_transfer_*` |
| `analytics` | Outcome measurement | `transfers`, `forecasting` |

Apps communicate through **service functions**, not by reaching into each
other's models/queries. This means any app can be modified or replaced
without ripple effects, as long as the service interface stays stable.

#### Pure functions for testability

The critical donor-matching logic
([`match_donors()`](backend/transfers/services/donor_matching.py)) is a
**pure function** — it takes structured inputs and returns structured
outputs with no database access inside. This means:

- It can be **unit-tested exhaustively** without a database.
- It can be **swapped for an optimization solver** (LP, MILP) later by
  replacing one function, not rewriting the entire transfer flow.
- It's **deterministic** — same inputs always produce same outputs.

#### RBAC at the query layer

`Model.objects.for_user(request.user)` is the single enforcement point.
Adding a new model or endpoint just requires wiring up the same
`role_scoped_manager` — no per-view permission checks to remember.

#### Append-only ledger (audit trail)

Stock is never overwritten — every movement is a new row. This means:

- Full audit trail of every stock change, forever.
- Current stock can be recalculated from scratch at any time.
- Bugs in stock display never corrupt the underlying data.

#### Idempotent operations

Every transfer state transition checks for existing records by
`idempotency_key` before writing. A retried request from a flaky rural
connection is a no-op, not a double-apply.

### Open questions for future maintainability

These are design questions that will matter as the system scales beyond the
current synthetic-data MVP:

#### How do we transition from seed data to real data?

The seed data pipeline is a management command; real data will need:

- **An ingestion API** for PHC staff to record stock movements through the
  frontend (the stock-movement form already exists in the UI, but it
  currently only adds to the seeded baseline).
- **Bulk import** for initial stock counts from government systems (e.g.
  CSV/Excel upload mapped to `record_opening_balance()`).
- **Integration connectors** for any upstream supply-chain system that
  could push receipt data automatically.

The inventory ledger design already supports this — the movement functions
(`record_receipt`, `record_consumption`, etc.) are the same whether called
by the seed command, a manual form, or a future integration.

#### How do we handle per-medicine or per-district configuration?

`RiskConfig` is currently a single global row. As the system scales:

- Some medicines may need different safety-stock levels (e.g., a rare
  antibiotic vs. ORS packets).
- Different districts may have different risk tolerances or max transfer
  distances.

**Possible approach:** Add optional `medicine`/`district` foreign keys to
`RiskConfig` and fall back to the global row when no specific override
exists. The `RiskConfig.objects.current()` interface would need to become
`current(medicine=..., district=...)` — callers already go through this
single accessor, so the change would be localized.

#### How do we ensure the matching algorithm stays correct as rules evolve?

The pure-function design helps here — add new test cases for each new rule,
and the function either passes or fails without side effects. But as rules
become more complex (per-medicine caps, time-of-day restrictions,
multi-hop transfers), consider:

- **Property-based testing** (e.g., Hypothesis) to assert invariants like
  "no donor ever drops below min Days of Cover" across randomly-generated
  inputs.
- **A formal specification** of the matching rules that can be verified
  independently of the Python implementation.

#### How do we monitor correctness in production?

The outcome-measurement feature (Phase 6) already tracks whether transfers
actually averted stock-outs. Extending this:

- **Forecast accuracy tracking:** Compare predicted demand to actual
  consumption; alert if the forecasting model drifts.
- **Reconciliation checks:** Periodic comparison of `current_stock()` with
  physical stock counts (via `ADJUSTMENT` transactions when discrepancies
  are found).
- **Anomaly detection:** Flag unusual patterns (e.g., a PHC consistently
  consuming 10× its historical average) that might indicate data-entry
  errors.

---

## Summary

| Concern | Current state | Future path |
|---|---|---|
| **Data source** | Synthetic seed data for all 10 PHCs | Real data via ingestion API, bulk import, or integration connectors |
| **Medicine deduction** | ✅ Fully implemented — atomic `TRANSFER_OUT` / `TRANSFER_IN` on receipt | Already production-ready; extend with batch/expiry tracking (FEFO) |
| **Safety guarantees** | ✅ Safe surplus + min Days of Cover caps, split across donors | Add property-based tests as rules grow |
| **Configuration** | Single global `RiskConfig` row | Extend to per-medicine / per-district overrides |
| **Maintainability** | Modular monolith, pure functions, RBAC at query layer, append-only ledger | Formal specification, forecast accuracy monitoring, reconciliation |
