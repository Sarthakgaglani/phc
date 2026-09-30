# Phase 0 — Foundations

Use this prompt with Claude Code in this repo. CLAUDE.md is already present and
governs all architecture rules, domain logic, and working conventions — treat
it as binding context, not optional background.

## Instruction to Claude Code

We are starting **Phase 0: Foundations** of the PHC platform described in
CLAUDE.md. Do not build anything from later phases (inventory ledger detail,
forecasting, redistribution, approvals, real-time). This phase is about
scaffolding the system so nothing has to be retrofitted later.

Before writing any code, restate your understanding of the phase scope and
any assumptions you're making, per CLAUDE.md's working conventions.

### Backend tasks

1. Set up the Django project with the modular monolith app layout:
   `accounts`, `locations`, `phcs`, `medicines`, `inventory`, `workforce`,
   `capacity`, `patient_activity`, `forecasting`, `alerts`, `transfers`,
   `analytics`. Create these as empty/near-empty Django apps now — do not
   populate models speculatively. Only `accounts`, `locations`, and `phcs`
   get real models this phase.
2. In `locations` and `phcs`: minimal models for State, District, PHC.
3. In `accounts`: User and Role (PHC / District / State), integrated with
   Django's auth system.
4. Build **RBAC at the queryset layer**: a base manager or mixin (e.g.
   `.objects.for_user(user)`) that scopes PHC-level data by the requesting
   user's role and assigned location. This pattern must be reusable by every
   model added in later phases — get the design right now.
5. Add a config app (or `core.config`) with models for parameters that must
   never be hard-coded later: safety stock defaults, minimum Days of Cover,
   risk thresholds. It's fine if only default rows exist — the point is the
   mechanism exists, not constants in code.
6. PostgreSQL setup with dev/prod settings split via environment variables.
7. A seed data management command generating clearly-synthetic sample data
   (1 state, 2–3 districts, a handful of PHCs) — label it synthetic in code
   comments and any admin/UI surface. Never let it look like real government
   data.
8. Basic CI: linting plus a smoke test that boots the app and runs migrations.

### Frontend tasks

1. One React + TypeScript app. Set up role-based route groups: `/phc/*`,
   `/district/*`, `/state/*`, behind a single auth guard. Do not create
   separate apps per role.
2. Build the **design token system first**, before any real dashboard
   screen: a shared theme (CSS variables or equivalent) defining:
   - Spacing scale
   - Typography scale
   - Color palette, including a fixed 4-level risk scale (critical / high /
     medium / safe) that every future dashboard, alert, and recommendation
     card will reuse identically.
3. Build a minimal app shell: nav, a dev-only role switcher for testing, and
   empty dashboard placeholders for each of the three roles.
4. Set an initial bundle-size budget (target: <200KB gzipped initial JS) and
   log the current bundle size so we can track drift from this phase onward.

### Explicitly out of scope this phase
- Inventory ledger / stock models (Phase 1)
- Any forecasting, alerts logic, or transfers logic
- Real dashboard content (placeholders only)
- Celery/Redis/Channels setup (introduce only when Phase 3/5 need it)

### Definition of done
- A user can log in and land on the correct role-based (empty) dashboard.
- A test proves RBAC scoping works: a PHC-role user cannot query another
  PHC's data through the API.
- Design tokens exist and are visibly used in the shell, not just defined.
- Seed command produces clearly-labeled synthetic data.

When done, summarize what was built, any deviations from this plan, and any
assumptions made, so we can confirm before moving to Phase 1.
