# Phase 6 — Polish, Scale, Optional AI

Use this prompt with Claude Code in this repo. CLAUDE.md governs architecture
and non-negotiable domain logic. Phases 0–5 (the full Observe → Forecast →
Detect Risk → Recommend → Approve → Transfer → Update Inventory chain)
should already be complete and working end-to-end — confirm this before
proceeding.

## Instruction to Claude Code

We are starting **Phase 6: Polish, Scale, Optional AI**. This phase hardens
what already exists, adds Gemini strictly as an additive/optional layer, and
documents (but does not implement) federated learning. Do not introduce any
new core domain logic here — if something looks like it needs new domain
logic, flag it rather than building it in this phase.

Before writing code, restate your understanding of scope and any
assumptions, per CLAUDE.md's working conventions.

### Backend tasks

1. Load-test the highest-traffic paths at roughly MVP scale (20–50 PHCs):
   - District/state aggregation queries
   - Forecast recomputation across all PHCs/medicines
   - Channels fan-out under concurrent connections
   Document any bottlenecks found and whether they need addressing now or
   can be deferred, sorted per CLAUDE.md into MVP / nice-to-have / future.
2. Integrate the Gemini API for:
   - Natural-language recommendation summaries
   - Multilingual explanations
   - District situation summaries
   - Natural-language querying
   All of these must consume the **structured explainability payload** built
   in Phase 4 as input — Gemini explains and summarizes existing numbers, it
   never generates or infers them. Per CLAUDE.md, LLMs never do deterministic
   calculation.
3. Add a feature flag or graceful fallback so the entire system remains
   fully functional with the Gemini API unreachable — verify this with a
   test that disables/mocks the Gemini call and confirms core dashboards,
   recommendations, and approvals still work correctly.
4. In `analytics`: build outcome measurement — did recommended and approved
   transfers actually prevent the predicted stock-out? This closes the loop
   described in the project's final design goal (...→ Update Inventory →
   Measure Outcome).
5. Write documentation (not implementation) for federated learning: how
   individual states could train local forecasting models, and how model
   updates could later be aggregated without sharing raw sensitive data.
   This is explicitly future architecture — do not build it.

### Frontend tasks

1. Do a full design-system consistency pass across all three dashboards
   (PHC/District/State) — this is the natural point to catch any visual
   drift that crept in phase-by-phase. Fix by updating the shared theme,
   not by patching individual screens.
2. Audit bundle size and low-bandwidth behavior against the Phase 0 budget
   (target <200KB gzipped initial JS). Add graceful degradation where
   needed (lighter images, WebSocket-optional fallback confirmed working).
3. Ensure any Gemini-generated content in the UI is visually presented as a
   summary/explanation layer (e.g. a distinct "AI summary" treatment), never
   styled as if it were new authoritative data.

### Explicitly out of scope this phase
- Any actual federated learning implementation
- New core domain logic or new entities not already justified by an
  existing phase's requirements

### Definition of done
- The full chain (Observe → Forecast → Detect Risk → Recommend → Approve →
  Transfer → Track → Update Inventory → Measure Outcome) runs end-to-end at
  MVP scale.
- The system passes its full test suite with the Gemini API disabled.
- Federated learning exists only as documentation, not code.
- Bundle size and dashboard consistency are verified against Phase 0's
  design tokens and budget.

When done, summarize what was built, what was deferred to future work, and
any assumptions made.
