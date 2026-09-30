# Phase 2 — Operational Signals

Use this prompt with Claude Code in this repo. CLAUDE.md governs architecture
and domain logic. Phase 0 (foundations/RBAC/tokens) and Phase 1 (inventory
ledger, PHC dashboard v1) should already be complete and verified — confirm
this before proceeding.

## Instruction to Claude Code

We are starting **Phase 2: Operational Signals**. This phase adds the
remaining operational data types (footfall, beds, staffing) and produces the
first cross-PHC view for district officers. Do not build forecasting, risk
scoring, or redistribution logic in this phase — that's Phase 3/4.

Before writing code, restate your understanding of scope and any
assumptions, per CLAUDE.md's working conventions.

### Backend tasks

1. In `patient_activity`: a `PatientFootfall` model tracking **aggregated
   counts only** (e.g. daily visit counts per PHC) — not patient-level
   records. This is an explicit privacy boundary from the project brief;
   do not add any patient-identifying fields.
2. In `capacity`: a `BedCapacity` model (total beds, occupied beds, or
   equivalent) per PHC.
3. In `workforce`: `StaffMember` and `StaffAttendance` models.
4. Build district-level aggregation endpoints (counts/averages across the
   PHCs in a district) scoped correctly through the RBAC layer built in
   Phase 0.
5. Decide and document (in code comments or an ARCHITECTURE note) whether
   district aggregation is computed at query-time or via a denormalized
   summary table updated asynchronously. At current MVP scale (20–50 PHCs)
   query-time aggregation is likely sufficient — document the threshold at
   which this should be revisited rather than switching pre-emptively.

### Frontend tasks

1. Build **District Dashboard v1**: an overview grid of PHCs in the
   district, reusing the card/status components built for the PHC dashboard
   in Phase 1 rather than creating new ones. If new visual patterns are
   genuinely needed, add them to the shared design system/theme from Phase
   0 rather than styling one-off.
2. Add simple visual indicators for patient load and bed pressure across
   PHCs — current-state comparison only, no forecasting or trend
   prediction yet.
3. Explicitly check whether the Phase 0 design tokens/components held up
   for a second, denser dashboard. If gaps appeared (e.g. a comparison-table
   pattern wasn't anticipated), backport the fix into the shared system
   rather than working around it locally.

### Explicitly out of scope this phase
- Forecasting, Days of Cover, alerts (Phase 3)
- Redistribution/transfers (Phase 4/5)
- State dashboard (Phase 5)
- Any patient-level identifying data

### Definition of done
- A district officer can see footfall, bed, and staffing data across all
  PHCs in their district, correctly scoped by RBAC (a district officer from
  a different district cannot see this data).
- District dashboard visually and structurally reuses Phase 1's components.

When done, summarize what was built, any deviations, and any assumptions
made, so we can confirm before moving to Phase 3.
