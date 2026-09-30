import datetime
import threading

import pytest
from django.db import connections

from accounts.models import Role, User
from forecasting.services import forecast
from inventory.services import current_stock, record_consumption, record_receipt
from locations.models import District, State
from medicines.models import Medicine
from phcs.models import PHC
from transfers.models import TransferRequestStatus
from transfers.services import build_recommendation
from transfers.services import state_machine
from transfers.services.exceptions import TransferConflict
from transfers.services.state_machine import create_requests_for_recommendation

TODAY = datetime.date(2026, 3, 1)


@pytest.fixture
def scenario(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    recipient = PHC.objects.create(district=district, name="Recipient", code="R")
    donor = PHC.objects.create(district=district, name="Donor", code="DN")
    medicine = Medicine.objects.create(name="ORS", unit="packets")
    seeder = User.objects.create_user("seed", password="x", role=Role.STATE, state=state)

    old = TODAY - datetime.timedelta(days=40)
    record_receipt(recipient, medicine, 50, seeder, transaction_date=old)
    for offset in range(1, 31):
        record_consumption(
            recipient, medicine, 10, seeder,
            transaction_date=TODAY - datetime.timedelta(days=offset),
        )
    record_receipt(donor, medicine, 2000, seeder, transaction_date=old)
    for offset in range(1, 31):
        record_consumption(
            donor, medicine, 5, seeder, transaction_date=TODAY - datetime.timedelta(days=offset)
        )
    forecast(recipient, medicine, as_of=TODAY)
    forecast(donor, medicine, as_of=TODAY)

    recommendation = build_recommendation(recipient, medicine)
    [transfer_request] = create_requests_for_recommendation(recommendation)

    district_officer = User.objects.create_user(
        "officer", password="x", role=Role.DISTRICT, district=district, state=state
    )
    donor_staff = User.objects.create_user(
        "donor_staff", password="x", role=Role.PHC, phc=donor, district=district, state=state
    )
    recipient_staff = User.objects.create_user(
        "recipient_staff", password="x", role=Role.PHC,
        phc=recipient, district=district, state=state,
    )

    return {
        "transfer_request": transfer_request,
        "recipient": recipient,
        "donor": donor,
        "medicine": medicine,
        "district_officer": district_officer,
        "donor_staff": donor_staff,
        "recipient_staff": recipient_staff,
    }


@pytest.mark.django_db
def test_full_cycle_approve_dispatch_receive_updates_ledger(scenario):
    tr = scenario["transfer_request"]
    officer = scenario["district_officer"]

    tr = state_machine.approve(tr.id, officer, expected_version=0, idempotency_key="approve-1")
    assert tr.status == TransferRequestStatus.APPROVED
    assert tr.version == 1

    tr = state_machine.dispatch(
        tr.id, scenario["donor_staff"], expected_version=1, idempotency_key="dispatch-1"
    )
    assert tr.status == TransferRequestStatus.DISPATCHED

    donor_stock_before = current_stock(scenario["donor"], scenario["medicine"])
    recipient_stock_before = current_stock(scenario["recipient"], scenario["medicine"])

    tr = state_machine.receive(
        tr.id, scenario["recipient_staff"], expected_version=2, idempotency_key="receive-1"
    )
    assert tr.status == TransferRequestStatus.RECEIVED

    donor_stock_after = current_stock(scenario["donor"], scenario["medicine"])
    recipient_stock_after = current_stock(scenario["recipient"], scenario["medicine"])
    assert donor_stock_after == donor_stock_before - tr.quantity
    assert recipient_stock_after == recipient_stock_before + tr.quantity


@pytest.mark.django_db
def test_reject_stops_the_workflow(scenario):
    tr = scenario["transfer_request"]
    tr = state_machine.reject(
        tr.id, scenario["district_officer"], expected_version=0,
        idempotency_key="reject-1", reason="Donor needs it too",
    )
    assert tr.status == TransferRequestStatus.REJECTED

    with pytest.raises(TransferConflict):
        state_machine.dispatch(
            tr.id, scenario["donor_staff"],
            expected_version=1, idempotency_key="dispatch-after-reject",
        )


@pytest.mark.django_db
def test_stale_version_is_rejected_as_conflict(scenario):
    tr = scenario["transfer_request"]
    state_machine.approve(
        tr.id, scenario["district_officer"], expected_version=0, idempotency_key="a1"
    )

    with pytest.raises(TransferConflict):
        state_machine.approve(
            tr.id, scenario["district_officer"], expected_version=0, idempotency_key="a2"
        )


@pytest.mark.django_db
def test_retrying_the_same_idempotency_key_does_not_double_apply(scenario):
    tr = scenario["transfer_request"]
    officer = scenario["district_officer"]

    first = state_machine.approve(tr.id, officer, expected_version=0, idempotency_key="same-key")
    second = state_machine.approve(tr.id, officer, expected_version=0, idempotency_key="same-key")

    assert first.status == second.status == TransferRequestStatus.APPROVED
    assert first.version == second.version == 1

    from transfers.models import TransferApproval

    assert TransferApproval.objects.filter(transfer_request=tr).count() == 1


@pytest.mark.django_db(transaction=True)
def test_two_concurrent_approvals_only_one_succeeds(scenario):
    tr = scenario["transfer_request"]
    officer = scenario["district_officer"]
    results = {}

    def attempt(label):
        try:
            state_machine.approve(
                tr.id, officer, expected_version=0, idempotency_key=f"concurrent-{label}"
            )
            results[label] = "success"
        except TransferConflict:
            results[label] = "conflict"
        finally:
            connections.close_all()

    t1 = threading.Thread(target=attempt, args=("t1",))
    t2 = threading.Thread(target=attempt, args=("t2",))
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    outcomes = list(results.values())
    assert outcomes.count("success") == 1
    assert outcomes.count("conflict") == 1

    from transfers.models import TransferRequest

    tr.refresh_from_db()
    assert tr.status == TransferRequestStatus.APPROVED
    assert tr.version == 1
    assert TransferRequest.objects.get(id=tr.id).version == 1
