"""
CLAUDE.md's non-negotiable rule #1 and #2, as a pure function over already
computed inputs — no querying inside here, so this stays trivially testable
and is the one place the formulas live (Phase 4's donor matching reuses
this, not a reimplementation).
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

from core.models import RiskConfig


@dataclass(frozen=True)
class StockRisk:
    phc_id: int
    medicine_id: int
    current_stock: Decimal
    predicted_daily_consumption: Decimal
    predicted_demand: Decimal
    safety_stock: Decimal
    required_stock: Decimal
    shortage: Decimal
    safe_surplus: Decimal
    days_of_cover: Optional[Decimal]  # None when there's no consumption signal to divide by
    risk_level: str  # "critical" | "high" | "medium" | "safe"


def compute_stock_risk(
    phc_id: int,
    medicine_id: int,
    current_stock: int,
    predicted_daily_consumption: Decimal,
    predicted_demand: Decimal,
    config: RiskConfig | None = None,
) -> StockRisk:
    config = config or RiskConfig.objects.current()
    current_stock = Decimal(current_stock)

    safety_stock = predicted_daily_consumption * config.default_safety_stock_days
    required_stock = predicted_demand + safety_stock
    shortage = max(required_stock - current_stock, Decimal("0"))
    safe_surplus = max(current_stock - required_stock, Decimal("0"))

    if predicted_daily_consumption > 0:
        days_of_cover = current_stock / predicted_daily_consumption
    else:
        days_of_cover = None

    risk_level = _risk_level(days_of_cover, config)

    return StockRisk(
        phc_id=phc_id,
        medicine_id=medicine_id,
        current_stock=current_stock,
        predicted_daily_consumption=predicted_daily_consumption,
        predicted_demand=predicted_demand,
        safety_stock=safety_stock,
        required_stock=required_stock,
        shortage=shortage,
        safe_surplus=safe_surplus,
        days_of_cover=days_of_cover,
        risk_level=risk_level,
    )


def _risk_level(days_of_cover: Optional[Decimal], config: RiskConfig) -> str:
    if days_of_cover is None:
        # No recent consumption to measure a drawdown rate against — treat
        # as safe rather than guessing; a nonzero shortage (from safety
        # stock alone) is still visible via StockRisk.shortage.
        return "safe"
    if days_of_cover <= config.critical_risk_days_of_cover:
        return "critical"
    if days_of_cover <= config.high_risk_days_of_cover:
        return "high"
    if days_of_cover <= config.medium_risk_days_of_cover:
        return "medium"
    return "safe"
