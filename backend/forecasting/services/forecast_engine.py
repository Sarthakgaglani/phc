"""
The swappable forecasting interface (phase3.md): `forecast(phc, medicine)`
returns a DemandForecast. Everything downstream (StockRisk, and Phase 4's
donor matching) calls this function and the DemandForecast it returns —
never the algorithm inside it — so swapping in a real ML model later means
changing only this file.

Implementation: a weighted moving average over the last
`input_window_days` of CONSUMPTION ledger entries, more recent days
weighted more heavily. Deterministic, explainable, and zero-LLM, per
CLAUDE.md's non-negotiable rule that forecasting is never inferred by an
LLM.
"""
import datetime
from decimal import ROUND_HALF_UP, Decimal

from core.models import RiskConfig
from forecasting.models import DemandForecast
from inventory.models import InventoryTransaction, TransactionType

INPUT_WINDOW_DAYS = 30


def _weighted_average_daily_consumption(phc, medicine, window_days, as_of):
    start_date = as_of - datetime.timedelta(days=window_days)
    rows = InventoryTransaction.objects.filter(
        phc=phc,
        medicine=medicine,
        transaction_type=TransactionType.CONSUMPTION,
        transaction_date__gte=start_date,
        transaction_date__lt=as_of,
    ).values("transaction_date", "quantity")

    daily_totals: dict[datetime.date, Decimal] = {}
    for row in rows:
        daily_totals[row["transaction_date"]] = daily_totals.get(
            row["transaction_date"], Decimal("0")
        ) + Decimal(-row["quantity"])  # consumption is stored negative; consumed amount is positive

    if not daily_totals:
        return Decimal("0")

    # More recent days get a higher weight (day 1 = oldest day in window).
    weighted_sum = Decimal("0")
    weight_total = Decimal("0")
    for day_offset in range(window_days):
        day = start_date + datetime.timedelta(days=day_offset)
        weight = Decimal(day_offset + 1)
        weighted_sum += daily_totals.get(day, Decimal("0")) * weight
        weight_total += weight

    if weight_total == 0:
        return Decimal("0")
    return (weighted_sum / weight_total).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def forecast(phc, medicine, horizon_days=None, as_of=None) -> DemandForecast:
    """Compute and persist a new DemandForecast row (a fresh log entry, per
    the model's docstring — never overwrites a previous forecast)."""
    config = RiskConfig.objects.current()
    horizon_days = horizon_days or config.forecast_horizon_days
    as_of = as_of or datetime.date.today()

    predicted_daily_consumption = _weighted_average_daily_consumption(
        phc, medicine, INPUT_WINDOW_DAYS, as_of
    )
    predicted_demand = predicted_daily_consumption * horizon_days

    return DemandForecast.objects.create(
        phc=phc,
        medicine=medicine,
        horizon_days=horizon_days,
        predicted_daily_consumption=predicted_daily_consumption,
        predicted_demand=predicted_demand,
        method="weighted_moving_average",
        input_window_days=INPUT_WINDOW_DAYS,
    )


def latest_forecast(phc, medicine) -> DemandForecast | None:
    return (
        DemandForecast.objects.filter(phc=phc, medicine=medicine).order_by("-created_at").first()
    )
