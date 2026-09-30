"""
DRF's TokenAuthentication doesn't apply to Channels (no HTTP Authorization
header on a WebSocket handshake in the browser) — this middleware resolves
the same auth token from a `?token=` query param instead, so the frontend
reuses the exact token it already holds from login rather than a second
auth mechanism.
"""
from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser


@database_sync_to_async
def _get_user_from_token(token_key):
    from rest_framework.authtoken.models import Token

    try:
        return Token.objects.select_related("user").get(key=token_key).user
    except Token.DoesNotExist:
        return AnonymousUser()


class TokenAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        query_params = parse_qs((scope.get("query_string") or b"").decode())
        token_key = query_params.get("token", [None])[0]
        scope["user"] = await _get_user_from_token(token_key) if token_key else AnonymousUser()
        return await super().__call__(scope, receive, send)
