"""
ASGI config for the projecth project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os

from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'projecth.settings')

django_asgi_app = get_asgi_application()

from projecth.routing import websocket_urlpatterns  # noqa: E402 (after django.setup(), above)
from core.channels_auth import TokenAuthMiddleware  # noqa: E402

# No AllowedHostsOriginValidator: auth here is the same bearer token the
# frontend already holds from login (core.channels_auth), not
# cookie/session-based, so origin checking doesn't add meaningful
# protection the way it does for session-authenticated WebSockets.
application = ProtocolTypeRouter(
    {
        "http": django_asgi_app,
        "websocket": TokenAuthMiddleware(URLRouter(websocket_urlpatterns)),
    }
)
