"""
CLAUDE.md's non-negotiable rules #1-#3 and #5, as a pure function over
already-computed inputs — no querying inside here (mirrors
forecasting.services.stock_risk.compute_stock_risk), so it's independently
testable and swappable for a real optimization solver later without
touching transfers.services.matching's I/O glue.

Ranking order (phase4.md lists the factors without a strict order, so this
documents the assumption made): closer donors first (lower transport
risk/time), then larger safe surplus (fewer donors needed to cover a
shortage), then lower predicted daily consumption (safer long-term to draw
from), then FEFO as the final tie-break among otherwise-equal donors, then
PHC id for determinism. FEFO is a no-op today since no batch/expiry model
exists yet (phase3.md: "if batch data exists") — every candidate gets the
same `expiry_priority`, so it never actually changes ordering until batch
tracking is built; the field is kept so wiring it in later doesn't require
touching the sort itself.
"""
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


@dataclass(frozen=True)
class SurplusCandidate:
    phc_id: int
    safe_surplus: Decimal
    current_stock: Decimal
    predicted_daily_consumption: Decimal
    required_stock: Decimal
    days_of_cover: Optional[Decimal]
    distance_km: Optional[Decimal] = None
    expiry_priority: int = 0  # lower sorts first; equal for every candidate until batch data exists


@dataclass(frozen=True)
class DonorAllocation:
    donor_phc_id: int
    quantity: Decimal
    days_of_cover_before: Optional[Decimal]
    days_of_cover_after: Optional[Decimal]
    rank: int


@dataclass(frozen=True)
class MatchResult:
    allocations: list[DonorAllocation]
    unresolved_shortage: Decimal


def _sort_key(candidate: SurplusCandidate):
    # None distance sorts after every known distance rather than first/last
    # arbitrarily — an unmeasured donor shouldn't be preferred over a known-
    # close one, but also shouldn't be excluded outright.
    distance = candidate.distance_km if candidate.distance_km is not None else Decimal("Infinity")
    return (
        distance,
        -candidate.safe_surplus,
        candidate.predicted_daily_consumption,
        candidate.expiry_priority,
        candidate.phc_id,
    )


def _donor_cap(candidate: SurplusCandidate, min_days_of_cover: Decimal) -> Decimal:
    """
    The most this donor can safely give: the smaller of its safe surplus
    (rule #1) and however much it can give while staying at/above the
    configured minimum Days of Cover (rule #2) — two independent hard
    constraints, not the same thing (a config with an unusually high
    min_days_of_cover or low safety-stock/horizon could make rule #2 the
    tighter limit even though safe surplus already accounts for safety
    stock in the common case).
    """
    if candidate.predicted_daily_consumption > 0:
        floor_for_min_cover = min_days_of_cover * candidate.predicted_daily_consumption
        cap_from_min_cover = max(candidate.current_stock - floor_for_min_cover, Decimal("0"))
    else:
        # No consumption signal to divide by — Days of Cover is undefined,
        # so this constraint can't bind; fall back to the surplus cap alone.
        cap_from_min_cover = candidate.safe_surplus
    return min(candidate.safe_surplus, cap_from_min_cover)


def match_donors(
    shortage_qty: Decimal,
    candidates: list[SurplusCandidate],
    min_days_of_cover: Decimal,
) -> MatchResult:
    remaining = shortage_qty
    allocations: list[DonorAllocation] = []

    for candidate in sorted(candidates, key=_sort_key):
        if remaining <= 0:
            break
        cap = _donor_cap(candidate, min_days_of_cover)
        if cap <= 0:
            continue

        quantity = min(remaining, cap)
        days_of_cover_after = (
            (candidate.current_stock - quantity) / candidate.predicted_daily_consumption
            if candidate.predicted_daily_consumption > 0
            else None
        )
        allocations.append(
            DonorAllocation(
                donor_phc_id=candidate.phc_id,
                quantity=quantity,
                days_of_cover_before=candidate.days_of_cover,
                days_of_cover_after=days_of_cover_after,
                rank=len(allocations) + 1,
            )
        )
        remaining -= quantity

    return MatchResult(allocations=allocations, unresolved_shortage=max(remaining, Decimal("0")))
