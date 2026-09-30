"""RBAC + the manual stock-movement entry API."""
import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from inventory.services import current_stock
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC


@pytest.fixture
def setup(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc_a = PHC.objects.create(district=district, name="PA", code="PA")
    phc_b = PHC.objects.create(district=district, name="PB", code="PB")
    medicine = Medicine.objects.create(name="Paracetamol", unit="tablets")
    user_a = User.objects.create_user(
        "staff_a", password="x", role=Role.PHC, state=state, district=district, phc=phc_a
    )
    return phc_a, phc_b, medicine, user_a


@pytest.mark.django_db
def test_phc_user_can_record_receipt_for_own_phc(setup):
    phc_a, _phc_b, medicine, user_a = setup
    client = APIClient()
    client.force_authenticate(user=user_a)

    response = client.post(
        "/api/inventory/movements/",
        {"phc": phc_a.id, "medicine": medicine.id, "movement_type": "RECEIPT", "quantity": 100},
        format="json",
    )

    assert response.status_code == 201
    assert current_stock(phc_a, medicine) == 100


@pytest.mark.django_db
def test_phc_user_cannot_record_movement_for_other_phc(setup):
    _phc_a, phc_b, medicine, user_a = setup
    client = APIClient()
    client.force_authenticate(user=user_a)

    response = client.post(
        "/api/inventory/movements/",
        {"phc": phc_b.id, "medicine": medicine.id, "movement_type": "RECEIPT", "quantity": 100},
        format="json",
    )

    assert response.status_code == 400
    assert current_stock(phc_b, medicine) == 0


@pytest.mark.django_db
def test_current_stock_endpoint_scoped_to_own_phc(setup):
    phc_a, phc_b, medicine, user_a = setup
    client = APIClient()
    client.force_authenticate(user=user_a)

    response = client.get(f"/api/inventory/stock/?phc={phc_b.id}")
    assert response.status_code == 403

    response = client.get(f"/api/inventory/stock/?phc={phc_a.id}")
    assert response.status_code == 200
    assert response.data[0]["medicine_name"] == medicine.name
    assert response.data[0]["current_stock"] == 0
