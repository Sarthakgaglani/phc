"""
Phase 1 done-criterion: inventory numbers are 100% derived from
InventoryTransaction and match manual recalculation from the raw ledger.
"""
import pytest
from django.core.exceptions import ValidationError

from accounts.models import Role, User
from inventory.models import InventoryTransaction, TransactionType
from inventory.services import (
    current_stock,
    current_stock_by_medicine,
    record_adjustment,
    record_consumption,
    record_receipt,
)
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc = PHC.objects.create(district=district, name="P", code="P")
    medicine = Medicine.objects.create(name="Paracetamol", unit="tablets")
    user = User.objects.create_user(
        "staff", password="x", role=Role.PHC, state=state, district=district, phc=phc
    )
    return phc, medicine, user


@pytest.mark.django_db
def test_current_stock_matches_manual_sum(setup):
    phc, medicine, user = setup
    record_receipt(phc, medicine, 100, user)
    record_consumption(phc, medicine, 30, user)
    record_receipt(phc, medicine, 50, user)
    record_adjustment(phc, medicine, -5, user)

    manual_total = sum(
        row.quantity
        for row in InventoryTransaction.objects.filter(phc=phc, medicine=medicine)
    )
    assert current_stock(phc, medicine) == manual_total == 115


@pytest.mark.django_db
def test_current_stock_is_zero_with_no_transactions(setup):
    phc, medicine, _ = setup
    assert current_stock(phc, medicine) == 0


@pytest.mark.django_db
def test_current_stock_by_medicine_matches_per_medicine_lookup(setup):
    phc, medicine, user = setup
    other_medicine = Medicine.objects.create(name="ORS", unit="packets")
    record_receipt(phc, medicine, 40, user)
    record_receipt(phc, other_medicine, 15, user)

    by_medicine = current_stock_by_medicine(phc)
    assert by_medicine[medicine.id] == 40
    assert by_medicine[other_medicine.id] == 15


@pytest.mark.django_db
def test_consumption_cannot_be_recorded_as_positive_quantity(setup):
    """The ledger itself rejects a wrong-signed row — you cannot construct
    an InventoryTransaction that would silently inflate stock via a
    CONSUMPTION entry, even bypassing the services layer."""
    phc, medicine, user = setup
    with pytest.raises(ValidationError):
        InventoryTransaction.objects.create(
            phc=phc,
            medicine=medicine,
            transaction_type=TransactionType.CONSUMPTION,
            quantity=10,  # wrong sign
            transaction_date="2026-01-01",
            recorded_by=user,
        )


@pytest.mark.django_db
def test_receipt_cannot_be_recorded_as_negative_quantity(setup):
    phc, medicine, user = setup
    with pytest.raises(ValidationError):
        InventoryTransaction.objects.create(
            phc=phc,
            medicine=medicine,
            transaction_type=TransactionType.RECEIPT,
            quantity=-10,
            transaction_date="2026-01-01",
            recorded_by=user,
        )


def test_inventory_transaction_model_has_no_mutable_stock_field():
    """Structural guard against reintroducing a mutable `current_stock`-style
    field on the ledger model itself."""
    field_names = {f.name for f in InventoryTransaction._meta.get_fields()}
    assert "current_stock" not in field_names
    assert "stock" not in field_names
