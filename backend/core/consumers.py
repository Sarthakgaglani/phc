from channels.generic.websocket import AsyncJsonWebsocketConsumer

from accounts.models import Role


class NotificationsConsumer(AsyncJsonWebsocketConsumer):
    """
    One group per connection, chosen by the authenticated user's own RBAC
    scope (see core.realtime for the matching fan-out side). Rejects the
    connection outright for an unauthenticated or role-less user rather than
    silently joining nothing, so a broken auth token fails loudly.
    """

    async def connect(self):
        user = self.scope["user"]
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        if user.role == Role.PHC and user.phc_id:
            self.group_name = f"phc-{user.phc_id}"
        elif user.role == Role.DISTRICT and user.district_id:
            self.group_name = f"district-{user.district_id}"
        elif user.role == Role.STATE and user.state_id:
            self.group_name = f"state-{user.state_id}"
        else:
            await self.close(code=4403)
            return

        try:
            await self.channel_layer.group_add(self.group_name, self.channel_name)
        except Exception:
            pass

        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            try:
                await self.channel_layer.group_discard(self.group_name, self.channel_name)
            except Exception:
                pass

    async def notify(self, event):
        await self.send_json({"event_type": event["event_type"], "payload": event["payload"]})
