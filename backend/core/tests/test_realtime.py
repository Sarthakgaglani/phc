"""
Django Channels WebSocket scoping (phase5.md: "Confirm a PHC user does not
receive broadcasts meant for other PHCs or districts"). ORM setup happens in
a plain sync fixture; only the WebSocket connect/receive/broadcast happens
inside the async test body, since Channels consumers are async.
"""
import pytest
from asgiref.sync import sync_to_async
from channels.testing import WebsocketCommunicator
from rest_framework.authtoken.models import Token

from accounts.models import Role, User
from projecth.asgi import application
from core.realtime import broadcast
from locations.models import District, State
from phcs.models import PHC


@pytest.fixture
def two_phcs(db):
    state = State.objects.create(name="S", code="S")
    district = District.objects.create(state=state, name="D", code="D")
    phc_a = PHC.objects.create(district=district, name="A", code="A")
    phc_b = PHC.objects.create(district=district, name="B", code="B")
    user_a = User.objects.create_user("staff_a", password="x", role=Role.PHC, phc=phc_a)
    token_a = Token.objects.create(user=user_a)
    return phc_a, phc_b, token_a


@pytest.mark.django_db(transaction=True)
async def test_phc_user_only_receives_events_for_their_own_phc(two_phcs):
    phc_a, phc_b, token_a = two_phcs

    communicator = WebsocketCommunicator(application, f"/ws/notifications/?token={token_a.key}")
    connected, _ = await communicator.connect()
    assert connected

    await sync_to_async(broadcast)("alert.created", {"id": 1}, phcs=[phc_b])
    assert await communicator.receive_nothing(timeout=0.5)

    await sync_to_async(broadcast)("alert.created", {"id": 2}, phcs=[phc_a])
    event = await communicator.receive_json_from(timeout=2)
    assert event == {"event_type": "alert.created", "payload": {"id": 2}}

    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
async def test_unauthenticated_connection_is_rejected():
    communicator = WebsocketCommunicator(application, "/ws/notifications/")
    connected, _ = await communicator.connect()
    assert connected is False
