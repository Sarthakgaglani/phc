# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Federated-ready health resource and supply-chain platform for India's Primary
Health Centres (PHCs). Predicts shortages before they happen and recommends
safe, human-approved redistribution between PHCs.

Core value proposition: **detect shortages before they happen, and recommend
safe redistribution without ever creating a shortage at the donor PHC.**

The core application MUST work correctly with zero LLM calls. AI is optional
and additive, never load-bearing.

## Stack

- Frontend: React + TypeScript, one app, role-based routing (PHC / District / State)
- Backend: Django + Django REST Framework
- DB: PostgreSQL
- Async/real-time: Celery + Redis, Django Channels for live push
- Forecasting/optimization: plain Python services inside the backend
- Optional AI: Gemini API (summaries/explanations only — never forecasting)

## Architecture Rules

- **Modular monolith.** Do not create microservices or separate deployable
  services unless there is a demonstrated, current need. Module boundaries
  should be clean enough to extract a service later without a rewrite.
- **One frontend app**, not three. Role-based components/routes/permissions,
  not separate applications per dashboard level.
- **Federation is a data-model concern for now, not an ML concern.** Keep
  state/district boundaries explicit in the schema and keep the forecasting
  service interface swappable. Do not implement federated learning unless
  explicitly asked — document how it *could* work instead.
- Backend modules: `accounts`, `locations`, `phcs`, `medicines`, `inventory`,
  `workforce`, `capacity`, `patient_activity`, `forecasting`, `alerts`,
  `transfers`, `analytics`. Don't create a module (or an entity) speculatively —
  check it's actually needed before adding it.
- The Django project package (the one `django-admin startproject` normally
  names after the project) is `backend/projecth/` — settings, root urls,
  wsgi/asgi entrypoints, and the Celery app all live there.
- Django settings live in one `projecth/settings.py`, not split into
  `settings/base.py`/`dev.py`/`prod.py` modules. Dev vs. prod behavior is a
  single `if DEBUG:` branch at the bottom, driven by the `DJANGO_DEBUG` env
  var — no `DJANGO_SETTINGS_MODULE` switching between environments.

## Non-Negotiable Domain Logic

These rules encode the actual safety property of the system. Any change
touching inventory, forecasting, or transfers must preserve them:

1. **Never transfer stock just because a PHC has more of it.** A donor must
   retain enough for its own predicted demand + safety stock.

   ```
   Required Stock = Predicted Demand + Safety Stock
   Shortage       = max(Required Stock - Current Stock, 0)
   Safe Surplus   = max(Current Stock - Required Stock, 0)
   ```
   Only Safe Surplus is ever transferable.

2. **Days of Cover** = Current Stock / Predicted Daily Consumption. A transfer
   that would drop the donor below the *configured* minimum Days of Cover
   must not be recommended. This threshold is configurable, never hard-coded.

3. **A shortage may be split across multiple donors.** Never force one donor
   to supply more than its safe surplus just to fully resolve a shortfall in
   one transaction.

4. **Inventory is a ledger, not a mutable field.** Current stock must be
   derivable/auditable from `InventoryTransaction` records (opening balance,
   receipt, consumption, transfer out/in, adjustment, expiry, damage). Never
   overwrite a stock value directly.

5. **Prefer FEFO** (First Expiry, First Out) when donors are otherwise
   equally safe to select from.

6. **No autonomous transfers in MVP.** Every transfer follows:
   `Recommendation → District officer review → Approve/Reject → Dispatch →
   Receive → Inventory update`. Nothing moves stock without human approval.

7. **LLMs never do deterministic calculation.** Stock, shortage, safe
   surplus, Days of Cover, risk thresholds, and transfer quantities are
   always computed in Python, never inferred by an LLM. Gemini (if used) is
   for natural-language summaries/explanations/multilingual output only, and
   the system must remain fully functional if that API is unreachable.

## Concurrency & Multi-User Correctness

This system has multiple simultaneous users (PHC staff, district officers,
state admins) acting on shared state — treat concurrency bugs as domain bugs:

- Use optimistic locking / row versioning on `TransferRequest` so two
  officers cannot both approve the same recommendation and double-commit
  stock.
- Transfer state transitions (approve → dispatch → receive) must be
  idempotent — retried requests from flaky rural connections should not
  double-apply.
- Real-time updates (new alert, recommendation, transfer status change) go
  out over Django Channels/Redis to all relevant watchers (PHC, district,
  state), not via client polling, where practical. Degrade gracefully to
  polling if a client can't hold a WebSocket.
- Data access is scoped by role at the query layer: PHC users see only their
  PHC, district officers their district, state users everything in-state.

## Explainability

Every recommendation must be able to show its reasoning, not just its
output: receiving PHC's shortfall math, donor's predicted demand and Days of
Cover after transfer, why this donor was chosen (surplus/distance/expiry),
and the resulting donor state. Treat this as a UI requirement as much as a
backend one — the explanation should be inline/expandable on the
recommendation itself, not a separate report.

## Configurability

Never hard-code: forecasting horizon, safety stock, minimum Days of Cover,
risk/alert thresholds, redistribution limits, max transfer distance,
medicine-specific rules, or approval requirements. These belong in config
models/admin, not constants.

## UI/UX Expectations

- Shared design system (tokens for spacing/color/type) across all three
  dashboards so they read as one product.
- Consistent color-coded risk levels (critical/high/medium/safe) used
  identically in every dashboard, alert, and recommendation card.
- Skeleton/optimistic UI for approval actions — rural network conditions mean
  perceived speed matters.
- Low-bandwidth-friendly: lightweight bundles, graceful fallback without
  WebSocket support.

## Working Conventions

1. Understand existing code before changing it. Make the smallest safe change.
2. Reuse existing architecture and shared components; avoid new dependencies
   unless justified.
3. Don't introduce complexity (new services, new ML models, new abstractions)
   to look sophisticated — justify it against a real current requirement.
4. Keep frontend/backend contracts explicit; call out any cross-side
   dependency introduced by a change.
5. State assumptions explicitly rather than guessing silently.
6. When asked to add an "AI" feature, first ask: *does this actually need
   AI/ML, or does deterministic logic solve it more reliably?* Default to
   deterministic.
7. When reviewing new requirements, sort them into MVP / nice-to-have /
   future — don't silently expand MVP scope.
8. Synthetic/seed data must never be presented or labeled as real
   government data.

## Current Build Phase

Check with the user which phase is active before assuming scope:

0. Foundations — repo, auth/RBAC, design system, seed data
1. Core inventory domain — stock ledger, PHC dashboard v1
2. Operational signals — footfall, beds, staff, district dashboard v1
3. Forecasting & risk — deterministic forecasting, Days of Cover, alerts
4. Redistribution engine — shortage/surplus matching, explainability payload
5. Approval workflow — transfer state machine, live status, state dashboard v1
6. Polish/scale/optional AI — load hardening, Gemini summaries, analytics,
   federated-learning documentation (not implementation)

Do not build ahead of the active phase without checking in.