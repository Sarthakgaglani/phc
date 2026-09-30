from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from accounts.models import Role, User
from alerts.services import sync_alerts_for
from forecasting.services import StockRisk
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC


@pytest.mark.django_db
def test_phc_user_only_sees_own_phc_alerts():
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc_a = PHC.objects.create(district=district, name="PA", code="PA")
    phc_b = PHC.objects.create(district=district, name="PB", code="PB")
    medicine = Medicine.objects.create(name="Paracetamol", unit="tablets")

    for phc in (phc_a, phc_b):
        sync_alerts_for(
            phc,
            medicine,
            StockRisk(
                phc_id=phc.id,
                medicine_id=medicine.id,
                current_stock=Decimal("1"),
                predicted_daily_consumption=Decimal("1"),
                predicted_demand=Decimal("1"),
                safety_stock=Decimal("1"),
                required_stock=Decimal("2"),
                shortage=Decimal("1"),
                safe_surplus=Decimal("0"),
                days_of_cover=Decimal("1"),
                risk_level="critical",
            ),
        )

    user_a = User.objects.create_user(
        "staff_a", password="x", role=Role.PHC, state=state, district=district, phc=phc_a
    )
    client = APIClient()
    client.force_authenticate(user=user_a)

    response = client.get("/api/alerts/")
    assert response.status_code == 200
    phc_ids = {row["phc"] for row in response.data}
    assert phc_ids == {phc_a.id}
