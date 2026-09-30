# ProjectH — Pitch Deck
### GDG Code for Communities — Edition 2
**Theme: Resilience + Cooperation**

---

## Slide 1 — Title

**ProjectH**
*Predicting Medicine Shortages Before They Happen*

Federated-ready health supply-chain intelligence for India's Primary Health Centres

> Built for GDG Code for Communities — Edition 2
> Team: [Your Name(s)]
> Track: Resilience + Cooperation

---

## Slide 2 — The Problem (Make It Real)

**Every day across rural India:**

- 📍 **1,50,000+ PHCs** serve India's 900 million rural citizens
- 💊 A child arrives for ORS packets — the shelf is empty
- 🚚 5 km away, another PHC has 300 surplus packets expiring next month
- 📋 Nobody knows. No system connects them.

**The result:**
- Preventable deaths from stock-outs of essential medicines
- Simultaneous shortage at one PHC + wasteful expiry at the next
- District officers making redistribution decisions on WhatsApp and gut feel

> *"The problem isn't that medicines don't exist. The problem is that nobody knows where they are."*

---

## Slide 3 — Our Solution

**ProjectH detects shortages before they happen and recommends safe redistribution — without ever creating a new shortage at the donor.**

### The 8-step cycle (runs automatically):

```
Observe → Forecast → Detect Risk → Recommend → Approve → Transfer → Update → Measure
```

1. PHC staff record stock movements
2. System forecasts demand (weighted moving average, no LLM)
3. Alerts fire when Days of Cover drops below threshold
4. Algorithm finds the safest donor PHC within range
5. District officer reviews and approves (human always in the loop)
6. Donor dispatches, recipient confirms receipt
7. Inventory ledger updates atomically
8. System measures: did the transfer actually avert the stock-out?

---

## Slide 4 — What Makes This Different

| Other approaches | ProjectH |
|---|---|
| Spreadsheets + WhatsApp | Real-time dashboard, WebSocket push |
| AI guesses stock levels | Python computes everything, AI only narrates |
| Central stock database | Append-only ledger — full audit trail forever |
| One PHC gives too much | Safety math: donor never drops below minimum Days of Cover |
| Single point of approval | RBAC: PHC staff → District officer → State admin hierarchy |

### The core safety guarantee:
> **A donor PHC can never be left short by a transfer it approved.**
> The algorithm enforces this mathematically — not by trusting human judgment.

---

## Slide 5 — Gemini Integration

**Gemini is additive, never load-bearing.**
The system works completely offline without a single AI call.

### What Gemini does:
```
Python computes:                 Gemini narrates (in any language):
────────────────                 ──────────────────────────────────
Shortage = 307 units       →     "Gonda PHC has critically low ORS
Days of Cover = 0.5 days          packets — less than 1 day remaining.
Donor matched: Kaimganj           Redistribution from Kaimganj PHC
Unresolved: 0 units               has been recommended and is awaiting
                                  district officer approval."
```

### Three Gemini use cases:
1. **District situation brief** — 3-4 sentence summary of current alerts for a district officer
2. **Transfer explanation** — plain-language "why this donor?" for non-technical officers
3. **Natural language Q&A** — "Which PHC has the most critical shortage right now?"

### Why this design is safe for government use:
- Gemini never sees raw patient data — only pre-aggregated stock numbers
- All context is RBAC-scoped — a PHC user's question can't leak another PHC's data
- If Gemini is unavailable, every endpoint returns a graceful fallback — no broken UI

---

## Slide 6 — Architecture (One Slide)

```
[ Browser ]  →  Vercel (React SPA, role-based routing)
                  ↓ REST API + WebSocket
             Google Cloud Run (Django + Daphne)
                  ↓                    ↓
         Cloud SQL (PostgreSQL)    Gemini API
         append-only ledger        narration only
                  ↓
         Cloud Memorystore (Redis)
         Celery tasks + WebSocket push
                  ↑
         Cloud Scheduler
         hourly recompute_risk
```

**4 roles, 4 dashboards:**
- PHC Staff → stock levels, record movements, track transfers
- District Officer → approve/reject transfers (with full explainability)
- State Admin → cross-district surveillance, user management
- National Admin → all states, all districts, all PHCs, all users

---

## Slide 7 — Real-World Community Impact

### Who uses this, and how:

| User | Before ProjectH | With ProjectH |
|---|---|---|
| **PHC pharmacist** | Manually counts stock, calls district on phone | Opens dashboard, sees Days of Cover, records movement in 10 seconds |
| **District officer** | Gets calls from multiple PHCs, manually decides redistribution | Sees algorithm recommendation with full safety math, one-click approve |
| **State health officer** | Monthly reports, no real-time visibility | Live cross-district grid, transfer pipeline, outcome tracking |
| **National admin** | No unified view across states | Single dashboard: all states, all PHCs, all users |

### Scale this was designed for:
- **MVP validated:** 10–50 PHCs, tested with load testing
- **Architecture ready for:** 500+ PHCs per state, multiple states
- **Federated learning path:** documented in `FEDERATED_LEARNING.md` for per-state ML models

---

## Slide 8 — Why It Works Without Internet

India's rural PHCs have **unreliable connectivity**. ProjectH is designed for this:

- ✅ Core logic is pure Python — no AI required for any critical function
- ✅ WebSocket degrades to 15-second polling automatically if connection drops
- ✅ Optimistic UI — stock movements show instantly, roll back if server fails
- ✅ Idempotency keys — retried requests from flaky connections never double-apply
- ✅ Offline-safe: Gemini returning `null` = graceful fallback, not a crash

---

## Slide 9 — What We Built (Technical Proof)

| Feature | Status |
|---|---|
| Append-only inventory ledger | ✅ Full audit trail, never overwrites |
| Weighted moving average demand forecast | ✅ Deterministic, explainable, zero LLM |
| Risk detection (Days of Cover, shortage) | ✅ Config-driven thresholds, not hardcoded |
| Safe donor matching (pure function) | ✅ Capped at safe surplus + min Days of Cover |
| Transfer state machine | ✅ PENDING → APPROVED → DISPATCHED → RECEIVED |
| Optimistic locking (no double-approvals) | ✅ Version column, 409 on conflict |
| Real-time WebSocket push | ✅ Django Channels + Redis, polling fallback |
| RBAC at query layer | ✅ `Model.objects.for_user()` — single enforcement point |
| Gemini AI summaries | ✅ Additive only, graceful fallback |
| National admin dashboard | ✅ Cross-state management, 4 roles |
| Outcome measurement | ✅ Did the transfer actually avert the stock-out? |

---

## Slide 10 — The Path to Production

### Phase 1 (hackathon — done):
- Full pipeline working end-to-end with synthetic data
- All 4 roles, all dashboards, Gemini integration

### Phase 2 (real deployment):
- PHC staff enter real opening balances via existing stock movement form
- District admin creates real PHC/user accounts via Admin Control Panel
- `seed_data` opening balances replaced by CSV import from government stock registers

### Phase 3 (scale):
- Deploy to Google Cloud Run + Cloud SQL + Cloud Scheduler
- Connect to state drug supply authority APIs for automated receipt data
- Per-district RiskConfig overrides for local safety-stock policies
- Federated demand forecasting (per-state ML, no central patient data)

---

## Slide 11 — Team + Ask

**Team:** [Your Name(s)] | [Institution/Organization]

**Built at:** GDG Code for Communities — Edition 2

**Repository:** [Your GitHub URL]

**Live Demo:** [Your Vercel URL]

---

### What we're asking for:
- Feedback on the safety-first transfer algorithm design
- Connections to district health officers willing to pilot with real data
- Guidance on integration with NHM / HMIS supply chain APIs

---

> *"The algorithm's job is not to move medicines. Its job is to make the decision safe enough that a human will approve it."*

---

## Appendix — Key Numbers

| Metric | Value |
|---|---|
| PHCs in the demo system | 12 (1 critical shortage, 10 active donors) |
| Medicines tracked | 4 essential medicines |
| Transfer requests created | 5 (all PENDING_REVIEW, ready to demo) |
| Days of Cover at Gonda Emergency PHC | 0.5 days (CRITICAL) |
| Lines of Python backend code | ~4,500 |
| Lines of TypeScript frontend code | ~6,000 |
| Test coverage (backend) | pytest + factory-boy |
| Build time | 416ms (Vite production build) |
