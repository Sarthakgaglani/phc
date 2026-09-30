# Architecture

Modular monolith. One Django project (`backend/`), one React app (`frontend/`).
See CLAUDE.md for the non-negotiable domain rules — this file is about where
code lives, not what it must compute.

## Backend app boundaries

Every app follows the same internal layout: `models/`, `serializers/`,
`views/`, `services/`, `migrations/`, `tests/`, plus root-level `admin.py`
and `apps.py`. `services/` holds pure-Python domain logic (e.g. the future
`current_stock()`, `forecast()`, donor-matching function) that views call
into — views stay thin, and services are what CLAUDE.md's "swappable
interface" and "pure function" requirements point at.

| App | Owns | Explicitly not |
|---|---|---|
| `core` | `RiskConfig` (never-hard-code parameters), the RBAC queryset mixin (`core/rbac.py`) every other app's models build on, `TimeStampedModel`, the seed data command | Any domain model of its own |
| `accounts` | `User`, `Role`, auth endpoints (login/logout/me, dev-only role switcher) | Location or PHC data |
| `locations` | `State`, `District` | PHC-level data |
| `phcs` | `PHC` | Inventory, staffing, etc. |
| `medicines` | `Medicine` (Phase 1), `MedicineBatch` (Phase 4, only if FEFO needs it) | Stock levels |
| `inventory` | `InventoryTransaction` ledger, `current_stock()` service (Phase 1) | Forecasting |
| `workforce` | `StaffMember`, `StaffAttendance` (Phase 2) | |
| `capacity` | `BedCapacity` (Phase 2) | |
| `patient_activity` | `PatientFootfall` — **aggregate counts only, never patient-level records** (Phase 2) | |
| `forecasting` | `DemandForecast`, the swappable `forecast()` interface (Phase 3) | Risk/alert thresholds (reads them from `core`) |
| `alerts` | `Alert` model + generation (Phase 3) | |
| `transfers` | `TransferRecommendation` (Phase 4), then `TransferRequest`/`TransferApproval`/`TransferDispatch`/`TransferReceipt` state machine (Phase 5) | Writing inventory directly outside the ledger |
| `analytics` | Outcome measurement (Phase 6) | |

## RBAC (`core/rbac.py`)

Every scoped model gets its manager from `role_scoped_manager(state_id_lookup=,
district_id_lookup=, phc_id_lookup=)` — three field-lookup paths from that
model to the state/district/phc that owns a row. Views call
`Model.objects.for_user(request.user)` instead of `.all()`; that single
substitution is the entire enforcement point. See `phcs/models/phc.py` for
the canonical example and `phcs/tests/test_rbac.py` for the proof test.

## District/state aggregation (decision point, Phase 2+)

Not yet needed as of Phase 0. When Phase 2 adds district-level aggregation
endpoints, default to query-time aggregation (fine through roughly 50 PHCs).
Revisit with a denormalized summary table only if profiling shows it's
actually a bottleneck — don't pre-optimize.

## Out of scope for now

- Microservices / separate deployables — modular monolith only, until a
  demonstrated need says otherwise.
- Federated learning implementation — documented in Phase 6, never built.
- Any LLM involvement in stock/shortage/transfer-quantity calculation —
  Gemini (Phase 6) only summarizes structured output that Python already
  computed.
