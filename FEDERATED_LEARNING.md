# Federated Learning — Design Notes (Not Implemented)

This is documentation only, per Phase 6 of PHASES.md: how federated learning
*could* work for this platform's forecasting service, if a future phase
decides it's actually needed. Nothing in this document is built. The current
forecasting service (`forecasting.services.forecast_engine`) is a
deterministic weighted moving average, and stays that way until there is a
concrete, demonstrated need for something more sophisticated.

## Why federated at all

CLAUDE.md treats federation as "a data-model concern for now, not an ML
concern" — the schema already keeps state/district boundaries explicit
(`State` → `District` → `PHC`), so a state's consumption data is already
structurally separable. If a future phase wants each state to improve its
own forecasting model using patterns learned across *other* states, without
any state's raw consumption ledger ever leaving its own infrastructure,
federated learning is the natural fit: it trains local models on local data
and shares only model updates, not the underlying records.

## What would change, and what wouldn't

- The **forecasting interface stays the same**: `forecast(phc, medicine,
  horizon) -> DemandForecast`. Federation is an internal detail of how the
  model behind that function gets better over time, never a change to what
  callers see. This is exactly why phase3.md required the interface to be
  swappable in the first place.
- Nothing about **StockRisk, Alert, TransferRecommendation, or the approval
  workflow changes** — they all consume `DemandForecast` output, never the
  training process behind it.
- The **InventoryTransaction ledger is never transmitted** anywhere outside
  its own state's database in this design. Only derived, aggregated model
  parameters would ever cross a state boundary.

## Sketch of the mechanism

1. **Local training.** Each state periodically trains a local forecasting
   model (e.g. a per-medicine time-series model) against its own PHCs'
   consumption history — the same `InventoryTransaction` rows already
   available today, just used to fit a model instead of a simple weighted
   average.
2. **Local model update, not raw data, is what's shared.** After a local
   training round, the state computes a model *update* (e.g. gradient
   deltas or updated weights) and sends only that update to an aggregation
   service — never the underlying consumption records, PHC identities, or
   any patient-adjacent data.
3. **Secure aggregation.** The aggregation step should use a technique like
   **federated averaging (FedAvg)** combined with **secure aggregation**
   (e.g. via secure multi-party computation or at minimum encrypted
   transport with an aggregator that only ever sees combined updates, never
   any single state's individual contribution in isolation) — so that even
   the central aggregator cannot reconstruct one state's local update, only
   the combined result across all participating states.
4. **Differential privacy (optional hardening).** If stronger guarantees are
   needed, each state could add calibrated noise to its update before
   sharing (differentially private FedAvg), trading a small amount of model
   accuracy for a formal privacy bound — worth evaluating once there's a
   concrete regulatory or trust requirement driving it, not before.
5. **Distribution.** The aggregated global model (or a per-state
   fine-tuned variant of it) is distributed back to each state, and
   `forecast()`'s implementation swaps in this model's prediction in place
   of (or blended with) the weighted-moving-average baseline.
6. **Fallback.** The deterministic baseline forecasting method stays in the
   codebase permanently as the fallback path — federated learning is an
   optional accuracy improvement, never a required dependency, matching
   CLAUDE.md's rule that the core system works with zero LLM/ML-service
   calls.

## Infrastructure implications (future work, not now)

- A federation coordinator service (could be a Celery-scheduled job talking
  to a lightweight aggregation endpoint) is a new, separate deployable
  component — this alone is a good reason not to build it until there's a
  real multi-state deployment with actual model-quality problems to solve.
- Each state's Django deployment would need a scheduled local-training task
  and a secure channel to submit/receive model updates.
- Model versioning: `DemandForecast.method` already records which
  algorithm produced a given forecast (`"weighted_moving_average"` today);
  a federated model would just be a new value here (e.g.
  `"federated_v1"`), preserving the existing audit trail.

## What this explicitly does not do

- It does not transmit any PHC-identifiable or patient-adjacent data across
  state boundaries.
- It does not replace the deterministic core logic for Stock, Shortage, Safe
  Surplus, Days of Cover, or transfer quantities — CLAUDE.md's non-negotiable
  rule that these are always computed in plain Python applies identically
  whether the demand forecast feeding into them came from a simple average
  or a federated model.
- It is not implemented anywhere in this codebase today.
