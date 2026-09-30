"""
Pure-function tests for transfers.services.donor_matching, independent of
the DB — mirrors forecasting/tests/test_stock_risk.py's style. Includes the
canonical "PHC A/B/C" worked example phase4.md/PHASES.md reference (no such
memory file exists in this repo, so this test *is* that worked example going
forward):

PHC A (recipient) is short 500 units. PHC B has a large safe surplus nearby
(200km) with low own-demand: it should be picked first and asked for as much
as it can safely give. PHC C is farther away (450km) with a smaller surplus:
it should be picked second to cover the remainder. Neither donor should be
asked for more than its own safe surplus, and the leftover shortage neither
donor can safely cover should be reported as unresolved rather than forced
onto either of them.
"""
from decimal import Decimal

from transfers.services.donor_matching import SurplusCandidate, match_donors


def test_single_donor_fully_covers_shortage_from_its_safe_surplus():
    donor = SurplusCandidate(
        phc_id=2,
        safe_surplus=Decimal("800"),
        current_stock=Decimal("1000"),
        predicted_daily_consumption=Decimal("10"),
        required_stock=Decimal("200"),
        days_of_cover=Decimal("100"),
    )
    result = match_donors(Decimal("500"), [donor], min_days_of_cover=Decimal("5"))

    assert result.unresolved_shortage == Decimal("0")
    assert len(result.allocations) == 1
    assert result.allocations[0].quantity == Decimal("500")
    assert result.allocations[0].donor_phc_id == 2
    assert result.allocations[0].rank == 1


def test_phc_a_b_c_worked_example_splits_shortage_by_distance_then_surplus():
    phc_b = SurplusCandidate(
        phc_id=2,  # "PHC B" — close, large surplus
        safe_surplus=Decimal("300"),
        current_stock=Decimal("500"),
        predicted_daily_consumption=Decimal("20"),
        required_stock=Decimal("200"),
        days_of_cover=Decimal("25"),
        distance_km=Decimal("200"),
    )
    phc_c = SurplusCandidate(
        phc_id=3,  # "PHC C" — farther, smaller surplus
        safe_surplus=Decimal("150"),
        current_stock=Decimal("300"),
        predicted_daily_consumption=Decimal("15"),
        required_stock=Decimal("150"),
        days_of_cover=Decimal("20"),
        distance_km=Decimal("450"),
    )

    result = match_donors(
        shortage_qty=Decimal("500"),  # "PHC A" shortage
        candidates=[phc_c, phc_b],  # deliberately out of expected-pick order
        min_days_of_cover=Decimal("5"),
    )

    assert [a.donor_phc_id for a in result.allocations] == [2, 3]
    assert result.allocations[0].quantity == Decimal("300")  # all of B's safe surplus
    assert result.allocations[1].quantity == Decimal("150")  # all of C's safe surplus
    assert result.unresolved_shortage == Decimal("50")  # neither donor can safely cover the rest


def test_donor_never_allocated_more_than_its_safe_surplus():
    donor = SurplusCandidate(
        phc_id=2,
        safe_surplus=Decimal("100"),
        current_stock=Decimal("1000"),
        predicted_daily_consumption=Decimal("5"),
        required_stock=Decimal("900"),
        days_of_cover=Decimal("200"),
    )
    result = match_donors(Decimal("500"), [donor], min_days_of_cover=Decimal("5"))

    assert result.allocations[0].quantity == Decimal("100")
    assert result.unresolved_shortage == Decimal("400")


def test_donor_never_dropped_below_configured_minimum_days_of_cover():
    # Safe surplus alone would allow giving 400, but min_days_of_cover=10
    # caps it at current_stock - 10*daily_consumption = 1000 - 300 = 700...
    # made tighter than surplus here so the min-cover rule is the binding one.
    donor = SurplusCandidate(
        phc_id=2,
        safe_surplus=Decimal("400"),
        current_stock=Decimal("1000"),
        predicted_daily_consumption=Decimal("30"),
        required_stock=Decimal("600"),
        days_of_cover=Decimal("33.33"),
    )
    result = match_donors(Decimal("1000"), [donor], min_days_of_cover=Decimal("20"))

    # Cap from min days of cover: 1000 - 20*30 = 400, same as safe surplus
    # here — tighten further to prove the independent constraint binds.
    result_tight = match_donors(Decimal("1000"), [donor], min_days_of_cover=Decimal("25"))
    # Cap from min days of cover: 1000 - 25*30 = 250 < safe surplus (400).
    assert result_tight.allocations[0].quantity == Decimal("250")
    assert result.allocations[0].quantity == Decimal("400")


def test_donor_with_zero_safe_surplus_is_never_allocated():
    donor = SurplusCandidate(
        phc_id=2,
        safe_surplus=Decimal("0"),
        current_stock=Decimal("500"),
        predicted_daily_consumption=Decimal("10"),
        required_stock=Decimal("500"),
        days_of_cover=Decimal("50"),
    )
    result = match_donors(Decimal("100"), [donor], min_days_of_cover=Decimal("5"))

    assert result.allocations == []
    assert result.unresolved_shortage == Decimal("100")


def test_unknown_distance_does_not_exclude_a_donor():
    unknown_distance_donor = SurplusCandidate(
        phc_id=2,
        safe_surplus=Decimal("100"),
        current_stock=Decimal("500"),
        predicted_daily_consumption=Decimal("5"),
        required_stock=Decimal("400"),
        days_of_cover=Decimal("100"),
        distance_km=None,
    )
    result = match_donors(Decimal("50"), [unknown_distance_donor], min_days_of_cover=Decimal("5"))

    assert result.allocations[0].quantity == Decimal("50")
    assert result.unresolved_shortage == Decimal("0")
