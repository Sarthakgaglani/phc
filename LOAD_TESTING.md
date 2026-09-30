# Phase 6 Load Test — Results at MVP Scale

Per phase6.md: "load-test the highest-traffic paths at roughly MVP scale
(20-50 PHCs)." Run via `python manage.py load_test --phcs 50` (see
`backend/core/management/commands/load_test.py`), which seeds its own
throwaway, clearly-synthetic data (`LOADTEST`/`LT-*` codes, safe to re-run)
and measures the three paths phase6.md names.

**Environment caveat:** this run was against Postgres/Redis in Docker
Desktop on Windows, which has known network-virtualization overhead (WSL2/
Hyper-V) well above a native Linux production deployment. Treat the
*absolute* millisecond numbers below as an upper bound for this dev
environment, not a production estimate — the *relative* comparison between
paths (which one dominates) is the useful signal.

## Results (50 PHCs, 4 medicines = 200 PHC/medicine pairs)

| Path | Result |
|---|---|
| Forecast + risk + alert recompute | 200 pairs in 55.6s (278ms/pair) |
| District dashboard aggregation | 19.7ms, 4 queries (50 PHCs) |
| State dashboard aggregation | 15.7ms, 4 queries (50 PHCs) |
| Channels fan-out (`broadcast()`) | 50 calls in 1.81s (36ms/call, Redis publish only) |

## Findings, sorted per CLAUDE.md (MVP / nice-to-have / future)

**MVP — no action needed:**
- District and state dashboard aggregation are fast and flat (4 queries
  each, independent of PHC count within this range) — the RBAC-scoped
  querysets aren't doing anything N+1-shaped. Fine as-is at 20-50 PHCs.
- Channels fan-out's per-broadcast cost (~36ms, dominated by the Docker
  Desktop network overhead noted above) is irrelevant at this event
  frequency — alerts/recommendations/status changes are occasional events,
  not a request-per-second hot path.

**Nice-to-have — worth watching, not urgent:**
- Forecast recompute is the one path with real per-unit cost (278ms/pair).
  This is already mitigated by design: phase3.md deliberately made this
  "independent per-PHC-per-medicine Celery tasks rather than one large
  batch job" specifically so it parallelizes across workers instead of
  running as one 55-second block. With even 2-4 concurrent Celery workers,
  an hourly recompute of 200 pairs finishes in well under a minute of
  wall-clock time — comfortable margin against the hourly beat schedule.
  Re-measure this if forecast logic grows more complex (e.g. a real ML
  model replacing the weighted moving average) or if medicine count grows
  well past today's catalog size.

**Future — defer until there's a concrete need:**
- If PHC count grows from tens into the hundreds/thousands (a full-state or
  multi-state rollout), forecast recompute's linear-per-pair cost would
  need either more Celery workers, batching each PHC's medicines into fewer
  DB round trips, or simply a production Postgres instance (removing the
  Docker-Desktop-on-Windows overhead this measurement includes).
- Channels fan-out to a *large number of simultaneously connected clients
  within one group* (e.g. hundreds of district/state officers watching
  live) was not measured here — this run only measured the publish side
  with zero connected consumers. `channels_redis` is designed to scale via
  Redis pub/sub, but that claim should be load-tested for real once there's
  a concrete concurrent-connection count to test against.
