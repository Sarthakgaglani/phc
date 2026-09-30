"""
Real-time push (Phase 5): new alert, new recommendation, transfer status
change go out over Channels/Redis to relevant watchers, scoped by the same
state/district/phc hierarchy core.rbac enforces at the query layer — not via
client polling, where practical (CLAUDE.md).

Group design: every connected user joins exactly one group for their own
scope (`phc-{id}` / `district-{id}` / `state-{id}`, see core.consumers).
`broadcast()` fans an event out to the phc/district/state groups that own
each affected PHC, so a PHC user only ever gets their own PHC's events,
while a district/state user's single group membership already covers every
PHC under them — no per-event membership bookkeeping needed.
"""
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


def group_names_for_phc(phc) -> list[str]:
    return [f"phc-{phc.id}", f"district-{phc.district_id}", f"state-{phc.district.state_id}"]


def broadcast(event_type: str, payload: dict, phcs: list) -> None:
    """`phcs` is every PHC this event is relevant to (e.g. both the donor and
    recipient of a transfer) — duplicates across them are harmless since
    group_send is per group name, deduplicated below."""
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return  # Channels not configured (e.g. some test environments) — no-op.

    group_names: set[str] = set()
    for phc in phcs:
        group_names.update(group_names_for_phc(phc))

    message = {"type": "notify", "event_type": event_type, "payload": payload}
    for group_name in group_names:
        async_to_sync(channel_layer.group_send)(group_name, message)
