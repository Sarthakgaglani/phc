# Phase 5 — Approval Workflow

Use this prompt with Claude Code in this repo. CLAUDE.md governs architecture
and non-negotiable domain logic. Phases 0–4 (foundations through the
redistribution engine and explainability payload) should already be complete
and verified — confirm this before proceeding.

## Instruction to Claude Code

We are starting **Phase 5: Approval Workflow**. This phase turns
recommendations into tracked, human-approved transfers, and is the first
place true multi-user concurrency matters — treat concurrency correctness as
domain correctness, per CLAUDE.md, not as a secondary concern.

Before writing code, restate your understanding of the state machine and any
assumptions, per CLAUDE.md's working conventions.

### Backend tasks

1. In `transfers`: `TransferRequest`, `TransferApproval`,
   `TransferDispatch`, `TransferReceipt` models implementing the state
   machine: `Recommendation → Review → Approve/Reject → Dispatch → Receive →
   Inventory update`. No transfer moves stock without passing through human
   approval — no autonomous transfers in MVP.
2. Add **optimistic locking / row versioning** on `TransferRequest` so two
   district officers cannot both approve the same recommendation and
   double-commit stock. Write a test that simulates two concurrent approval
   requests and confirms exactly one succeeds.
3. Make every state transition endpoint (approve, dispatch, receive)
   **idempotent** — a retried request from a flaky rural connection must not
   double-apply. Write tests for this explicitly.
4. On receipt confirmation, write the corresponding `InventoryTransaction`
   records (transfer out at the donor, transfer in at the recipient) via
   Phase 1's ledger — this is the one place the system itself writes to the
   ledger rather than manual entry.
5. Set up Django Channels + Redis to push real-time updates (new alert, new
   recommendation, transfer status change) to relevant watchers — PHC,
   district, and state users scoped correctly by the Phase 0 RBAC layer.
   Confirm a PHC user does not receive broadcasts meant for other PHCs or
   districts. Provide a polling fallback for clients that can't hold a
   WebSocket connection.

### Frontend tasks

1. Build the approval screen for district officers, embedding the
   explainability panel from Phase 4 inline.
2. Add **skeleton/optimistic UI specifically for approval actions** — build
   this now, not as a later retrofit, since perceived speed on slow rural
   connections is an explicit UX requirement.
3. Show live transfer status (incoming/outgoing) on the PHC dashboard via
   the Channels connection, with graceful fallback to polling.
4. Build **State Dashboard v1**: aggregated view across districts —
   district health status, pending approvals, redistribution trends —
   reusing District dashboard components from Phase 2/4 rather than
   building new ones from scratch.

### Explicitly out of scope this phase
- Gemini/LLM summaries (Phase 6)
- Load testing / scale hardening (Phase 6)
- Federated learning documentation (Phase 6)

### Definition of done
- A full recommendation-to-inventory-update cycle works end-to-end.
- A concurrency test proves two simultaneous approvals on the same
  recommendation cannot both succeed.
- Retried approve/dispatch/receive requests do not double-apply.
- Transfer status updates arrive live via Channels, with polling fallback
  verified.
- State Dashboard v1 is live and correctly scoped by RBAC.

When done, summarize what was built, any deviations, and any assumptions
made, so we can confirm before moving to Phase 6.
