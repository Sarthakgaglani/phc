import datetime

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from accounts.models import Role, User
from alerts.services import sync_alerts_for
from analytics.models import TransferOutcome
from analytics.services import evaluate_due_followups
from forecasting.services import forecast, get_current_stock_risk
from inventory.services import record_consumption, record_receipt
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC
from transfers.services import build_recommendation, state_machine

TODAY = datetime.date(2026, 3, 1)


@pytest.fixture
def received_transfer(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    recipient = PHC.objects.create(district=district, name="Recipient", code="R")
    donor = PHC.objects.create(district=district, name="Donor", code="DN")
    medicine = Medicine.objects.create(name="ORS", unit="packets")
    user = User.objects.create_user(
        "officer", password="x", role=Role.DISTRICT, district=district, state=state
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

    risk = get_current_stock_risk(recipient, medicine)
    sync_alerts_for(recipient, medicine, risk)

    recommendation = build_recommendation(recipient, medicine)
    [tr] = state_machine.create_requests_for_recommendation(recommendation)
    state_machine.approve(tr.id, user, expected_version=0, idempotency_key="a1")
    state_machine.dispatch(tr.id, user, expected_version=1, idempotency_key="d1")
    tr = state_machine.receive(tr.id, user, expected_version=2, idempotency_key="r1")

    return {"transfer_request": tr, "recipient": recipient, "medicine": medicine, "user": user}


@pytest.mark.django_db
def test_receive_records_an_immediate_outcome(received_transfer):
    tr = received_transfer["transfer_request"]
    outcome = TransferOutcome.objects.get(transfer_request=tr)

    assert outcome.shortage_before > 0
    assert outcome.shortage_after_receipt < outcome.shortage_before
    assert outcome.followup_evaluated_at is None
    assert outcome.shortage_averted is None


@pytest.mark.django_db
def test_followup_marks_averted_when_no_alert_reappears(received_transfer):
    outcome = TransferOutcome.objects.get(transfer_request=received_transfer["transfer_request"])
    outcome.followup_due_at = timezone.now() - datetime.timedelta(seconds=1)
    outcome.save(update_fields=["followup_due_at"])

    # No new consumption since receipt, and the alert was resolved by the
    # improved risk — nothing should re-flag as critical/high.
    risk = get_current_stock_risk(received_transfer["recipient"], received_transfer["medicine"])
    sync_alerts_for(received_transfer["recipient"], received_transfer["medicine"], risk)

    evaluated = evaluate_due_followups()

    outcome.refresh_from_db()
    assert evaluated == 1
    assert outcome.followup_evaluated_at is not None
    assert outcome.shortage_averted is True


@pytest.mark.django_db
def test_followup_marks_not_averted_when_a_critical_alert_reappears(received_transfer):
    recipient = received_transfer["recipient"]
    medicine = received_transfer["medicine"]
    user = received_transfer["user"]
    outcome = TransferOutcome.objects.get(transfer_request=received_transfer["transfer_request"])
    outcome.followup_due_at = timezone.now() - datetime.timedelta(seconds=1)
    outcome.save(update_fields=["followup_due_at"])

    # Heavy consumption after receipt burns through the transferred stock.
    for offset in range(1, 20):
        record_consumption(
            recipient, medicine, 20, user, transaction_date=TODAY + datetime.timedelta(days=offset)
        )
    forecast(recipient, medicine, as_of=TODAY + datetime.timedelta(days=20))
    risk = get_current_stock_risk(recipient, medicine)
    sync_alerts_for(recipient, medicine, risk)
    assert risk.risk_level in ("critical", "high")

    evaluate_due_followups()

    outcome.refresh_from_db()
    assert outcome.shortage_averted is False


@pytest.mark.django_db
def test_outcomes_endpoint_scoped_by_rbac(received_transfer):
    recipient = received_transfer["recipient"]
    other_state = State.objects.create(name="Other", code="OT")
    other_district = District.objects.create(state=other_state, name="OD", code="OD")
    other_phc = PHC.objects.create(district=other_district, name="Unrelated", code="UN")
    unrelated_user = User.objects.create_user(
        "unrelated", password="x", role=Role.PHC, phc=other_phc,
        district=other_district, state=other_state,
    )
    recipient_user = User.objects.create_user(
        "r_staff", password="x", role=Role.PHC, phc=recipient,
        district=recipient.district, state=recipient.district.state,
    )

    client = APIClient()
    client.force_authenticate(user=recipient_user)
    assert len(client.get("/api/analytics/outcomes/").data) == 1

    client.force_authenticate(user=unrelated_user)
    assert len(client.get("/api/analytics/outcomes/").data) == 0
