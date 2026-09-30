from unittest.mock import patch

import pytest
from django.test import override_settings
from rest_framework.test import APIClient

from accounts.models import Role, User
from locations.models import District, State
from phcs.models import PHC


@pytest.fixture
def user(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc = PHC.objects.create(district=district, name="P", code="P")
    return User.objects.create_user(
        "staff", password="x", role=Role.PHC, phc=phc, district=district, state=state
    )


@pytest.mark.django_db
def test_district_summary_degrades_gracefully_when_disabled(user):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.get("/api/analytics/district-summary/")

    assert response.status_code == 200
    assert response.data == {"available": False, "summary": None}


@pytest.mark.django_db
def test_ask_requires_a_question(user):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post("/api/analytics/ask/", {}, format="json")

    assert response.status_code == 400


@pytest.mark.django_db
def test_ask_degrades_gracefully_when_disabled(user):
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post("/api/analytics/ask/", {"question": "What's at risk?"}, format="json")

    assert response.status_code == 200
    assert response.data == {"available": False, "answer": None}


@pytest.mark.django_db
def test_ask_returns_gemini_text_when_enabled(user):
    client = APIClient()
    client.force_authenticate(user=user)

    with override_settings(GEMINI_API_KEY="fake-key"):
        with patch(
            "analytics.services.ai_query.generate_text", return_value="Nothing urgent right now."
        ):
            response = client.post(
                "/api/analytics/ask/", {"question": "What's at risk?"}, format="json"
            )

    assert response.status_code == 200
    assert response.data == {"available": True, "answer": "Nothing urgent right now."}
