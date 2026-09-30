"""
Django settings for the whole project, in one file. Environment differences
(dev vs prod) are handled by the `DEBUG` branch at the bottom rather than
separate settings modules — set `DJANGO_DEBUG=False` (and the other
`DJANGO_*`/prod env vars) in production.
"""
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-secret-key-change-me")

INSTALLED_APPS = [
    "daphne",  # first, per Channels' docs — makes `runserver` ASGI/WS-aware
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third-party
    "rest_framework",
    "rest_framework.authtoken",
    "corsheaders",
    "channels",
    # project apps
    "core",
    "accounts",
    "locations",
    "phcs",
    "medicines",
    "inventory",
    "workforce",
    "capacity",
    "patient_activity",
    "forecasting",
    "alerts",
    "transfers",
    "analytics",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "projecth.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "projecth.wsgi.application"
ASGI_APPLICATION = "projecth.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB", default="projecth"),
        "USER": env("POSTGRES_USER", default="projecth"),
        "PASSWORD": env("POSTGRES_PASSWORD", default="projecth"),
        "HOST": env("POSTGRES_HOST", default="localhost"),
        "PORT": env("POSTGRES_PORT", default="5432"),
    }
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS", default=["http://localhost:5173"]
)

# Celery — first introduced in Phase 3 for forecast/risk/alert recomputation.
REDIS_URL = env("REDIS_URL", default="redis://localhost:6380/0")
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_SERIALIZER = "json"
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TIMEZONE = TIME_ZONE

# Gemini (Phase 6) — strictly additive: natural-language summaries over
# already-computed structured data, never used for the numbers themselves
# (CLAUDE.md). Unset in dev/test by default, so the system is exercised in
# its "API unreachable" fallback path unless a real key is provided.
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
GEMINI_MODEL = env("GEMINI_MODEL", default="gemini-2.0-flash")

DEBUG = env.bool("DJANGO_DEBUG", default=True)

# Channels — Phase 5 real-time push (new alert/recommendation/transfer status
# change) to relevant PHC/district/state watchers.
# Uses InMemoryChannelLayer in local dev unless Redis URL or backend is specified.
REDIS_CHANNELS_URL = env("REDIS_URL_CHANNELS", default="")

if REDIS_CHANNELS_URL:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [REDIS_CHANNELS_URL]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer" if DEBUG else "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [env("REDIS_URL", default="redis://localhost:6380/1")]} if not DEBUG else {},
        }
    }

# --- Environment split (dev vs prod) ---

# Python 3.14 compatibility: patch Django 5.1 BaseContext.__copy__ bug with copy(super())
try:
    import copy
    from django.template.context import BaseContext

    def _base_context_copy(self):
        obj = object.__new__(self.__class__)
        obj.dicts = [d.copy() if hasattr(d, "copy") else d for d in self.dicts]
        return obj

    BaseContext.__copy__ = _base_context_copy
except Exception:
    pass
