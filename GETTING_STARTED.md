# Getting Started

How to run ProjectH locally and try it out. All commands below assume you're
starting from the repo root unless noted otherwise.

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for
  Postgres + Redis)
- Python 3.12+
- Node.js 18+ and npm

## 1. Start Postgres and Redis

```bash
docker compose up -d
```

This starts Postgres on `localhost:5433` and Redis on `localhost:6380`
(see `docker-compose.yml`). Wait for Postgres to report healthy before
continuing:

```bash
docker inspect --format='{{.State.Health.Status}}' projecth-postgres-1
```

## 2. Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
copy .env.example .env          # Windows: copy; macOS/Linux: cp
```

The defaults in `.env.example` already match `docker-compose.yml` (DB name/
user/password, ports), so you shouldn't need to edit anything to run
locally.

Apply migrations, then seed clearly-synthetic demo data (1 state, 3
districts, 10 PHCs, one demo user per role):

```bash
python manage.py migrate
python manage.py seed_data
```

Compute an initial forecast/risk/alert pass (this also generates
redistribution recommendations for any PHC that's short on a medicine) —
this is the synchronous equivalent of the Celery task that would otherwise
run hourly:

```bash
python manage.py recompute_risk
```

Run the backend:

```bash
python manage.py runserver 8000
```

This serves both the REST API and the WebSocket endpoint
(`ws://localhost:8000/ws/notifications/`) — `daphne` (in `INSTALLED_APPS`)
makes `runserver` ASGI-aware, so no separate process is needed for local
development.

### Optional: Celery worker + beat

Not required to try the app locally — `seed_data` and `recompute_risk`
already put the system in a fully-populated state without a running
worker. If you want to see the actual scheduled/async path:

```bash
celery -A projecth worker -l info
celery -A projecth beat -l info      # in a second terminal
```

### Optional: enable Gemini (AI summaries)

Off by default — every AI endpoint returns `{"available": false}` and the
rest of the app is completely unaffected. To turn it on, set in `.env`:

```
GEMINI_API_KEY=your-key-here
```

## 3. Frontend setup

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api` and `/ws` to
`localhost:8000` (see `vite.config.ts`), so the backend must already be
running.

## 4. Log in

Use the **dev-only role switcher** on the login page — it logs you straight
into a seeded demo user for whichever role you click, no password needed:

- **PHC staff** → `demo_phc` (assigned to the first seeded PHC)
- **District officer** → `demo_district`
- **State admin** → `demo_state`

(This switcher only renders in dev builds and its backend endpoint 404s
outright when `DEBUG` is off.)

## 5. Try the full workflow

1. As **PHC staff**, look at the Alerts banner and the stock table's Days
   of Cover/risk column.
2. As **District officer**, open "Redistribution recommendations" and
   expand "Why this recommendation?" to see the full explainability panel.
   If there's a pending approval, click **Approve**.
3. Switch back to **PHC staff** (the donor or recipient PHC) and watch the
   transfer status update live — no page reload needed, it arrives over
   the WebSocket. Use **Mark dispatched** / **Mark received** to walk it
   through to completion; receiving writes the actual inventory ledger
   entries.
4. As **State admin**, see the cross-district health grid, redistribution
   activity counts, and outcome tracking (did the transfer actually avert
   the shortage?).

## Running the test suites

```bash
# Backend (from backend/, with Postgres/Redis running)
pytest
flake8 .

# Frontend (from frontend/)
npx tsc -b
npx oxlint
npm run build && npm run bundle:check
```

## Load testing (optional)

```bash
cd backend
python manage.py load_test --phcs 50
```

Seeds its own synthetic `LOADTEST`/`LT-*` PHCs and measures the paths
described in [LOAD_TESTING.md](LOAD_TESTING.md). Note: it also creates
throwaway rows in the shared `Medicine` catalog (`Load Test Medicine 0-3`),
which — unlike the PHC/district/state rows — are *not* RBAC-isolated and
will show up on every real PHC's dashboard until removed. Clean up after
running it:

```python
# python manage.py shell
from medicines.models import Medicine
from inventory.models import InventoryTransaction
from forecasting.models import DemandForecast
from alerts.models import Alert

ids = list(Medicine.objects.filter(name__startswith="Load Test Medicine").values_list("id", flat=True))
InventoryTransaction.objects.filter(medicine_id__in=ids).delete()
DemandForecast.objects.filter(medicine_id__in=ids).delete()
Alert.objects.filter(medicine_id__in=ids).delete()
Medicine.objects.filter(id__in=ids).delete()
```

## Troubleshooting

- **Postgres container is `unhealthy` right after starting Docker Desktop**
  — normal after a machine sleep/restart; it's running crash recovery.
  Wait a minute or two and re-check
  `docker inspect --format='{{.State.Health.Status}}' projecth-postgres-1`.
- **WebSocket won't connect** — the app still works via the polling
  fallback (`useRealtime` in the frontend), just with up to ~15s latency
  instead of instant push. Check that the backend is running via
  `manage.py runserver` (not a plain WSGI server) so Channels is active.
