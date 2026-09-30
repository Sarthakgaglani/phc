PHC Health Resource Platform — Phase-by-Phase Implementation Plan
This plan expands CLAUDE.md's 7 build phases into concrete deliverables, so each phase has a clear "done" definition covering backend, frontend/UX, and scalability concerns together — not sequentially bolted on later.

Rule for every phase: don't close it until the domain-logic checklist for that phase passes, even if the UI is unpolished. Don't polish UI for data shapes that haven't stabilized yet.

Phase 0 — Foundations
Goal: a skeleton that already encodes the platform's real constraints (RBAC, config-driven design, design tokens) so nothing later has to be retrofitted.

Backend
Django project with modular app layout: accounts, locations, phcs, medicines, inventory, workforce, capacity, patient_activity, forecasting, alerts, transfers, analytics (create empty apps now, populate as needed later — don't build models speculatively).
accounts + locations: User, Role (PHC / District / State), State, District, PHC — minimal fields only.
RBAC at the queryset layer, not the view layer: a base manager/mixin that scopes PHC.objects.for_user(user) from day one. Every future model that needs role-scoping reuses this pattern.
Config app or core.config models for parameters that must never be hard-coded later: safety stock defaults, min Days of Cover, risk thresholds — even if only one row of defaults exists right now. Empty tables are fine; hard-coded constants are not.
PostgreSQL + environment-based settings, kept in a single projecth/settings.py (the Django project package, named after the project) with a DJANGO_DEBUG-driven dev/prod branch rather than separate settings modules.
CI: linting + a smoke test that boots the app.
Frontend / UX
One React + TypeScript app, routing skeleton with three role-based route groups (/phc/*, /district/*, /state/*) behind a single auth guard — not three separate apps.
Design tokens first: color scale (with the 4-level risk palette — critical/high/medium/safe — fixed now, since it will be reused everywhere), spacing scale, typography scale. Put these in a shared theme file/CSS variables, not per-component styling.
Basic shell layout (nav, role switcher for dev/testing, empty dashboard placeholders per role).
Bundle budget set now: target <200KB gzipped initial JS. Add a CI check or at least a manual bundle-size log so this doesn't silently balloon.
Scalability groundwork
Module boundaries documented (a short ARCHITECTURE.md: what belongs in each app, what's explicitly out of scope for now).
Seed data command using synthetic data generation (clearly labeled synthetic in code/comments and any UI banner — never presented as real).
Done when
A user can log in, land on the correct role-based empty dashboard, and RBAC scoping is provably enforced (test: PHC user cannot query another PHC's data via API).
Phase 1 — Core Inventory Domain
Goal: the ledger is correct and auditable. This is the phase most worth slowing down for — every later number (forecast, shortage, transfer) depends on it being right.

Backend
medicines: Medicine, MedicineBatch (only if batch/expiry tracking is in scope for this phase — otherwise defer batch to Phase 4 when FEFO matters).
inventory: InventoryTransaction ledger model — opening balance, receipt, consumption, transfer out/in, adjustment, expiry, damage. Current stock is always derived from transactions, never stored as a mutable field.
A current_stock(phc, medicine) calculation function/service — this becomes the single source of truth other modules call, not a query they reimplement.
Admin or simple API for manually recording stock movements (receipts, consumption) — this is your data-entry path until any external integration exists.
Unit tests: given a transaction history, current stock is correctly derived; no code path allows overwriting stock directly.
Frontend / UX
PHC Dashboard v1: current inventory table/cards per medicine, using the risk color tokens from Phase 0 even though risk calculation doesn't exist yet (just wire the visual language now against placeholder/manual thresholds).
Build this dashboard as the template — District and State dashboards in later phases will visually and structurally extend this, not reinvent it.
Simple stock-movement entry form (receipt/consumption) with basic validation and optimistic UI (since this is the first write-heavy screen).
Scalability groundwork
Index the ledger table on (phc, medicine, date) — this table will be the largest and most-queried table in the system; get the indexing right before data volume grows.
Keep the current_stock service as a clean function signature — forecasting and shortage calculations in later phases will call this rather than querying transactions directly.
Done when
Inventory numbers on the PHC dashboard are 100% derived from transactions and match manual recalculation.
Phase 2 — Operational Signals
Goal: bring in the other operational data types and give District officers their first real cross-PHC view.

Backend
patient_activity: PatientFootfall (aggregated counts, not patient-level records — memory file explicitly flags this as a privacy boundary).
capacity: BedCapacity.
workforce: StaffMember, StaffAttendance.
Basic aggregation endpoints per district (counts/averages across PHCs) — this is the first place query performance matters at all, since a district endpoint touches N PHCs' data.
Frontend / UX
District Dashboard v1: PHC list/overview grid reusing the PHC dashboard's card components and risk color tokens (consistency requirement from CLAUDE.md's UI/UX section).
Patient-load and bed-pressure visual indicators — simple, no forecasting yet, just current-state comparison across PHCs.
Confirm the shared design system actually holds up once a second dashboard is built: if District needed new tokens/components, backport them to Phase 0's shared theme rather than forking styles.
Scalability groundwork
Decide now whether district aggregation is computed on read (query-time aggregation) or on write (denormalized summary table updated via signal/Celery task). For 20–50 PHCs this can stay query-time; document the threshold at which you'd switch, so it's a deliberate future decision, not a surprise.
Done when
A district officer can see footfall, beds, and staffing across all PHCs in their district, correctly scoped by RBAC.
Phase 3 — Forecasting & Risk
Goal: deterministic forecasting and Days of Cover, with the forecasting interface built swappable from day one.

Backend
forecasting: DemandForecast model + a service interface, e.g. forecast(phc, medicine, horizon) -> DemandForecast, implemented first with a simple method (moving average or weighted moving average per memory file). The interface, not the algorithm, is what matters here — this is what lets you swap in real ML later without touching callers.
StockRisk calculation: Required Stock = Predicted Demand + Safety Stock; Shortage; Days of Cover — all built on top of Phase 1's current_stock service and Phase 3's forecast service.
alerts: Alert model + generation logic (critical/high stock-out risk, below safety threshold, expiring stock if batch tracking is active). Thresholds pulled from Phase 0's config models — never hard-coded.
Celery task to periodically recompute forecasts/risk/alerts (this is the first genuinely async, scheduled piece of the system).
Frontend / UX
Days of Cover and stock-out risk now show real numbers on the PHC dashboard (Phase 1 built the slot; now it's live).
Alert list/banner component, using the same risk color coding everywhere it appears (dashboard, alert list, later recommendation cards) — CLAUDE.md is explicit that this consistency is a UX requirement, not a nice-to-have.
District dashboard: surface high-risk PHCs prominently (this is the first real "signal-forward" view for officers).
Scalability groundwork
Forecast recomputation should run per-PHC-per-medicine as independent Celery tasks (not one giant batch job) so it scales roughly linearly with PHC count and can be parallelized.
Log forecast inputs/outputs somewhere queryable — you'll need this for explainability in Phase 4 and for evaluating forecast accuracy later.
Done when
Every PHC has a live forecast, Days of Cover, and correctly triggered alerts, all configurable and none hard-coded.
Phase 4 — Redistribution Engine
Goal: the actual value proposition — safe donor matching — plus the explainability payload as a first-class, reusable output.

Backend
transfers: TransferRecommendation model.
Matching algorithm: for a PHC with a shortage, find donor(s) with Safe Surplus, respecting minimum Days of Cover post-transfer, splitting across multiple donors if needed (never force a donor beyond its safe surplus — this is the non-negotiable rule from both memory and CLAUDE.md).
Donor ranking considers: safe surplus, predicted future demand, distance/transport time (can start as a static distance table or simple lat/long calc), expiry (FEFO preference if batch data exists), resulting Days of Cover.
Explainability payload: every TransferRecommendation carries structured data — recipient shortfall math, donor's predicted demand, donor's Days of Cover after transfer, why this donor was picked — as data, not just a UI string, so it can be rendered consistently anywhere and later summarized by Gemini in Phase 6 without re-deriving numbers.
Frontend / UX
Build the explainability component now, once, as reusable: an expandable "why this recommendation" panel. This gets used in Phase 4 (recommendations), Phase 5 (approval screen), and any alert detail view. Building it as a one-off inside a single screen is the mistake to avoid here.
District dashboard: recommendation list with the explainability panel inline/expandable (not a separate report page, per CLAUDE.md).
Scalability groundwork
Matching runs as a Celery task per shortage event, not synchronously in a request — this keeps the dashboard responsive as PHC count grows.
Keep the matching algorithm as a pure function over (shortages, surpluses, config) so it's independently testable and swappable later (e.g., replaced by a proper optimization solver without touching the surrounding workflow code).
Done when
Given a seeded shortage/surplus scenario, the system produces a correct, explainable, safety-respecting recommendation — verified against the worked examples in the memory file (PHC A/B/C scenarios).
Phase 5 — Approval Workflow
Goal: turn recommendations into tracked, human-approved transfers, correctly under concurrent multi-user access.

Backend
TransferRequest, TransferApproval, TransferDispatch, TransferReceipt — state machine: Recommendation → Review → Approve/Reject → Dispatch → Receive → Inventory update.
Optimistic locking / row versioning on TransferRequest so two officers can't double-approve the same recommendation.
Idempotent state transitions — approve/dispatch/receive endpoints must safely handle retries from flaky rural connections without double-applying.
On receipt confirmation, write the corresponding InventoryTransaction (transfer out at donor, transfer in at recipient) — this is the one place the ledger from Phase 1 gets written by the system itself rather than manual entry.
Django Channels + Redis: push transfer status changes and new alerts/recommendations to relevant watchers (PHC, district, state) in real time; degrade to polling if a client can't hold a WebSocket.
Frontend / UX
Approval screen for district officers with the explainability panel from Phase 4 inline.
Skeleton/optimistic UI specifically for approval actions — build this now, not retrofitted, since perceived speed on slow rural connections is a stated UX requirement.
Live status updates on PHC dashboards (incoming/outgoing transfers) via the Channels connection, with graceful polling fallback.
State Dashboard v1 can start here too: aggregated view across districts, redistribution trends, pending approvals — reusing components from District dashboard, same as District reused PHC's.
Scalability groundwork
Test the concurrency guarantees explicitly: simulate two simultaneous approval requests in a test and confirm only one succeeds.
Confirm Channels/Redis fan-out is scoped correctly by role (a PHC user shouldn't receive every district's broadcast) — this is both a scalability and a security concern.
Done when
A full recommendation-to-inventory-update cycle works end-to-end with a second officer correctly blocked from double-approving, and status updates arrive live.
Phase 6 — Polish, Scale, Optional AI
Goal: harden what exists; add Gemini as strictly additive; document (not build) federated learning.

Backend
Load-test the highest-traffic paths: district/state aggregation queries, forecast recomputation at 50-PHC scale, Channels fan-out under concurrent connections.
Gemini integration for: natural-language recommendation summaries, multilingual explanations, district situation summaries, natural-language querying — all consuming the explainability payload from Phase 4 as structured input, never generating the numbers themselves. Verify the system remains fully functional with the Gemini API unreachable (feature-flag or graceful fallback to the structured/explainability UI).
analytics app: outcome measurement — did recommended transfers actually prevent stock-outs? This closes the loop described in CLAUDE.md's final design goal (Observe → ... → Measure Outcome).
Federated learning: write the documentation only — how states could train local models, how updates could be aggregated without sharing raw data. No implementation.
Frontend / UX
Full design-system consistency pass across all three dashboards (this is the natural point to catch any drift that crept in phase-by-phase).
Bundle-size and low-bandwidth audit against the Phase 0 budget; add graceful degradation where needed (image-light, WebSocket-optional).
Any Gemini-generated content in the UI clearly presented as a summary/explanation layer, not as new authoritative data.
Done when
The full chain (Observe → Forecast → Detect Risk → Recommend → Approve → Transfer → Track → Update Inventory → Measure Outcome) runs end-to-end at MVP scale, works with Gemini disabled, and federated learning is documented as a future path rather than attempted.
Cross-Phase Checklist (revisit at the end of every phase)
 No new hard-coded business parameter was introduced (safety stock, thresholds, horizons, distances).
 No donor was left below its Required Stock or configured minimum Days of Cover in any test scenario.
 Inventory numbers are still fully derivable from InventoryTransaction — nothing writes to a stock field directly.
 RBAC scoping still holds for any new model/endpoint added this phase.
 Any new UI component reuses Phase 0 design tokens rather than introducing one-off styles.
 Synthetic data is still clearly labeled as synthetic anywhere it's visible.
 New requirements that came up this phase were sorted into MVP / nice-to-have / future rather than silently absorbed into current scope.