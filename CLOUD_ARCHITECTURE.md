# Cloud Architecture — ProjectH

How ProjectH integrates Google Cloud services and the Gemini API.

---

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                              │
│                                                                     │
│   PHC Staff          District Officer       State / National Admin  │
│   /phc               /district              /state  /national       │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  HTTPS
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    VERCEL  (Frontend)                                │
│                                                                     │
│   React + TypeScript (Vite build)                                   │
│   • Role-based routing  (PHC / District / State / National)         │
│   • WebSocket client    (live transfer status updates)              │
│   • Zero server-side logic — pure static SPA                        │
│                                                                     │
│   Env var:  VITE_API_BASE_URL = https://backend.cloudrun.app/api    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  REST API + WebSocket (WSS)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  GOOGLE CLOUD RUN  (Backend)                        │
│                                                                     │
│   Django 5 + Django REST Framework + Daphne (ASGI)                 │
│                                                                     │
│   ┌─────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│   │  REST API   │  │  WebSocket   │  │   Management Commands    │  │
│   │  /api/...   │  │  /ws/notif.. │  │   seed_data              │  │
│   │             │  │  (Channels)  │  │   recompute_risk         │  │
│   └──────┬──────┘  └──────┬───────┘  └──────────────────────────┘  │
│          │                │                                         │
│   ┌──────▼────────────────▼──────────────────────────────────────┐  │
│   │                  Django Apps (Modular Monolith)               │  │
│   │                                                               │  │
│   │  inventory → forecasting → alerts → transfers → analytics    │  │
│   │                                                               │  │
│   │  accounts  locations  phcs  medicines  workforce  capacity   │  │
│   └───────────────────────┬──────────────────────────────────────┘  │
│                           │                                         │
│        ┌──────────────────┼──────────────────┐                      │
│        ▼                  ▼                  ▼                      │
│  ┌──────────┐      ┌────────────┐    ┌──────────────────────────┐   │
│  │ Cloud    │      │  Cloud     │    │   Gemini API             │   │
│  │ SQL      │      │  Memstore  │    │   (Google AI Studio)     │   │
│  │(Postgres)│      │  (Redis)   │    │                          │   │
│  └──────────┘      └────────────┘    │  core/services/gemini.py │   │
│                                      │  • summarize_district()  │   │
│  ┌──────────────────────────────┐    │  • answer_question()     │   │
│  │  Cloud Scheduler (optional)  │    │  • summarize_transfer()  │   │
│  │  → triggers recompute_risk   │    │                          │   │
│  │    every hour via Cloud Run  │    │  NEVER calculates stock  │   │
│  └──────────────────────────────┘    │  NEVER queries database  │   │
│                                      │  Only narrates computed  │   │
└──────────────────────────────────────┴──────────────────────────────┘
```

---

## Service Roles

| Service | Role | Why this service |
|---|---|---|
| **Vercel** | Hosts the React frontend (static SPA) | Zero-config deploys from GitHub, global CDN, free tier |
| **Google Cloud Run** | Hosts the Django backend | Scales to zero, supports WebSockets via min-instances, no VM management |
| **Google Cloud SQL (PostgreSQL)** | Primary database — append-only inventory ledger, all domain data | Managed Postgres with automated backups, private VPC connectivity to Cloud Run |
| **Google Cloud Memorystore (Redis)** | Celery task queue + Django Channels layer for WebSocket push | Same VPC as Cloud Run, no public exposure needed |
| **Google Cloud Scheduler** | Triggers `recompute_risk` on a schedule (default: every hour) | Fires a Cloud Run job to run the Forecast → Risk → Alert → Recommendation pipeline |
| **Gemini API** | Optional AI narration layer | Summarises already-computed shortage data in plain language |

---

## How Gemini Is Integrated

Gemini is **additive, never load-bearing**. The entire system works with zero Gemini calls. It is only invoked to turn already-computed numbers into plain-language text.

```
Python computes:                    Gemini narrates:
─────────────────                   ──────────────────────────────────────
Shortage = 307 units          →     "Gonda PHC has critically low ORS
Days of Cover = 0.5d                 packets — less than 1 day of stock
Donor: Kaimganj (274u)               remaining. A redistribution from
Unresolved: 0                        Kaimganj PHC has been recommended."
```

### Code path (`backend/core/services/gemini.py`)

```python
def generate_text(prompt: str) -> str | None:
    if not is_enabled():   # No API key → returns None immediately
        return None
    # Calls Gemini with already-computed structured context
    # Any failure (network, quota, error) → returns None, never raises
    # The calling endpoint returns {"available": false} — UI shows fallback
```

### Three call sites

| Where | What Gemini is given | What it returns |
|---|---|---|
| `GET /api/analytics/situation-summary/` | Active alerts + open recommendations (already computed) | 3–4 sentence plain-language district brief |
| `GET /api/transfers/recommendations/{id}/summary/` | Snapshotted explainability data (pre-computed at recommendation time) | Why this donor was chosen, in plain English |
| `POST /api/analytics/ai-query/` | Same alerts + recommendations context | Answer to a natural-language question |

### Safety guarantees

- Gemini **never** has access to the database — it receives a pre-formatted string of already-computed rows
- Gemini **never** computes stock, shortage, Days of Cover, or transfer quantities — Python does all of that
- The context passed to Gemini is **RBAC-scoped** — a PHC user's question cannot leak another PHC's data
- If `GEMINI_API_KEY` is not set, every AI endpoint returns `{"available": false}` — no errors, no broken UI

---

## Environment Variables Required for Production

```bash
# Django
DJANGO_SECRET_KEY=<strong-random-key>
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=backend.cloudrun.app

# Database (Cloud SQL)
POSTGRES_DB=projecth
POSTGRES_USER=projecth
POSTGRES_PASSWORD=<secret>
POSTGRES_HOST=/cloudsql/<project>:<region>:<instance>   # Unix socket for Cloud Run
POSTGRES_PORT=5432

# Redis (Cloud Memorystore)
REDIS_URL=redis://<memorystore-ip>:6379/0

# CORS (Vercel frontend URL)
CORS_ALLOWED_ORIGINS=https://projecth.vercel.app

# Gemini (optional — system works without this)
GEMINI_API_KEY=<your-google-ai-studio-key>
GEMINI_MODEL=gemini-2.0-flash
```

---

## Data Flow: A Transfer from PHC A → PHC B

```
1. PHC B's stock drops → Cloud Scheduler fires recompute_risk
2. Forecast engine (pure Python) → shortage detected
3. Donor matching (pure Python, no DB inside) → Kaimganj PHC selected
4. TransferRecommendation written to Cloud SQL
5. Cloud Run → WebSocket push via Redis (Channels) → District officer's browser
6. District officer clicks Approve → Cloud Run → Cloud SQL (optimistic lock)
7. [Optional] Gemini API called → plain-language summary rendered
8. Donor PHC marks Dispatched → Recipient marks Received
9. Cloud SQL: atomic TRANSFER_OUT + TRANSFER_IN written in single transaction
10. Outcome recorded → State dashboard updated via WebSocket
```

---

## Local Development vs Production

| Component | Local | Production |
|---|---|---|
| Frontend | `npm run dev` (Vite dev server, port 5173) | Vercel (static build) |
| Backend | `python manage.py runserver` (Daphne ASGI) | Google Cloud Run |
| Database | Docker Compose PostgreSQL (port 5433) | Google Cloud SQL |
| Redis | Docker Compose Redis (port 6380) | Google Cloud Memorystore |
| Scheduler | `python manage.py recompute_risk` (manual) | Google Cloud Scheduler (hourly) |
| Gemini | Off by default (set `GEMINI_API_KEY` in `.env`) | Set as Cloud Run secret |
