"""
Phase 6's "system remains fully functional with Gemini unreachable"
requirement, verified two ways: (1) the actual dev/test settings have no
GEMINI_API_KEY configured, so these tests exercise the real disabled path,
not a mock standing in for it; (2) a mocked "enabled but the SDK call blows
up" case proves the try/except in core.services.gemini actually degrades
instead of propagating.
"""
import datetime
from unittest.mock import patch

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from accounts.models import Role, User
from core.services import gemini
from forecasting.services import forecast
from inventory.services import record_consumption, record_receipt
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC
from transfers.services import build_recommendation

TODAY = datetime.date(2026, 3, 1)


@pytest.fixture
def recommendation(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    recipient = PHC.objects.create(district=district, name="Recipient", code="R")
    donor = PHC.objects.create(district=district, name="Donor", code="DN")
    medicine = Medicine.objects.create(name="ORS", unit="packets")
    user = User.objects.create_user(
        "r_staff", password="x", role=Role.PHC, phc=recipient, district=district, state=state
    )

    old = TODAY - datetime.timedelta(days=40)
    record_receipt(recipient, medicine, 50, user, transaction_date=old)
    record_receipt(donor, medicine, 2000, user, transaction_date=old)
    for offset in range(1, 31):
        record_consumption(
            recipient, medicine, 10, user, transaction_date=TODAY - datetime.timedelta(days=offset)
        )
        record_consumption(
            donor, medicine, 5, user, transaction_date=TODAY - datetime.timedelta(days=offset)
        )
    forecast(recipient, medicine, as_of=TODAY)
    forecast(donor, medicine, as_of=TODAY)

    rec = build_recommendation(recipient, medicine)
    return rec, user


def test_gemini_disabled_by_default_in_dev_and_test_settings():
    assert gemini.is_enabled() is False
    assert gemini.generate_text("anything") is None


@pytest.mark.django_db
def test_recommendation_summary_endpoint_degrades_gracefully_when_disabled(recommendation):
    rec, user = recommendation
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get(f"/api/transfers/recommendations/{rec.id}/summary/")

    assert response.status_code == 200
    assert response.data == {"available": False, "summary": None}


@pytest.mark.django_db
def test_recommendation_summary_endpoint_degrades_gracefully_on_sdk_failure(recommendation):
    rec, user = recommendation
    client = APIClient()
    client.force_authenticate(user=user)

    with override_settings(GEMINI_API_KEY="fake-key-for-test"):
        with patch("google.genai.Client", side_effect=RuntimeError("network unreachable")):
            response = client.get(f"/api/transfers/recommendations/{rec.id}/summary/")

    assert response.status_code == 200
    assert response.data == {"available": False, "summary": None}


@pytest.mark.django_db
def test_recommendation_summary_endpoint_returns_text_when_gemini_succeeds(recommendation):
    rec, user = recommendation
    client = APIClient()
    client.force_authenticate(user=user)

    with override_settings(GEMINI_API_KEY="fake-key-for-test"):
        with patch(
            "transfers.services.ai_summary.generate_text", return_value="Plain-language summary."
        ):
            response = client.get(f"/api/transfers/recommendations/{rec.id}/summary/")

    assert response.status_code == 200
    assert response.data == {"available": True, "summary": "Plain-language summary."}


@pytest.mark.django_db
def test_core_dashboards_work_with_gemini_completely_disabled(recommendation):
    """The load-bearing assertion for CLAUDE.md's "AI is optional and
    additive, never load-bearing": the recommendation list itself (the
    actual data district officers act on) is unaffected by Gemini being
    off."""
    rec, user = recommendation
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/transfers/recommendations/")

    assert response.status_code == 200
    assert len(response.data) == 1
    assert response.data[0]["recipient_shortage"] is not None
