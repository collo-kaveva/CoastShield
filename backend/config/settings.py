"""CoastShield settings. All secrets and environment-specific values come from environment variables."""
from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    DJANGO_CSRF_TRUSTED_ORIGINS=(list, []),
    CORS_ALLOWED_ORIGINS=(list, []),
    DB_HOST=(str, "localhost"),
    DB_PORT=(str, "5432"),
    MAX_UPLOAD_MB=(int, 2),
    RATE_LIMIT_LOGIN=(str, "5/min"),
    RATE_LIMIT_REGISTER=(str, "10/hour"),
    RATE_LIMIT_ORDER_SUBMIT=(str, "10/min"),
    RATE_LIMIT_ORDER_LOOKUP=(str, "10/min"),
    RATE_LIMIT_ANALYSIS=(str, "20/min"),
    RATE_LIMIT_UPLOAD=(str, "20/hour"),
    ANALYSIS_RETENTION_DAYS=(int, 90),
    NUM_PROXIES=(int, 0),
    PAYSTACK_SECRET_KEY=(str, ""),
    PAYSTACK_PUBLIC_KEY=(str, ""),
    PAYSTACK_TEST_MODE=(bool, True),
    PAYSTACK_WEBHOOK_SECRET=(str, ""),
    PLATFORM_COMMISSION_PERCENT=(float, 0),
    DATA_RETENTION_DAYS=(int, 90),
    ACCOUNT_DELETION_GRACE_DAYS=(int, 30),
    EMAIL_FROM=(str, "noreply@coastshield.example.com"),
    EMAIL_BACKEND=(str, "django.core.mail.backends.console.EmailBackend"),
)
# Optional local .env at the repository root (never committed).
environ.Env.read_env(BASE_DIR.parent / ".env")

DEBUG = env("DJANGO_DEBUG")
# No default: the app refuses to start without a secret key.
SECRET_KEY = env("DJANGO_SECRET_KEY")
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set (see .env.example).")
if not DEBUG and (len(SECRET_KEY) < 50 or SECRET_KEY.startswith(("change-me", "dev-only", "django-insecure"))):
    # Fail fast instead of running production with a placeholder or guessable key.
    raise ImproperlyConfigured("DJANGO_SECRET_KEY is a placeholder or too short for production (need 50+ random characters).")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env("DJANGO_CSRF_TRUSTED_ORIGINS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "drf_spectacular",
    "apps.common",
    "apps.accounts",
    "apps.businesses",
    "apps.catalog",
    "apps.orders",
    "apps.cybersecurity",
    "apps.audit",
    "apps.payments",
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

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST"),
        "PORT": env("DB_PORT"),
        "CONN_MAX_AGE": 60,
    }
}

AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
# Django's default PBKDF2 hasher is used. Passwords are never logged or returned by any API.

LANGUAGE_CODE = "en"
TIME_ZONE = "Africa/Nairobi"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ---- Cache: shared by all server processes so rate limits hold with several workers (no Redis needed).
# Create the table once with:  python manage.py createcachetable
CACHES = {"default": {"BACKEND": "django.core.cache.backends.db.DatabaseCache", "LOCATION": "coastshield_cache"}}

# ---- Sessions, CSRF, CORS ----
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SECURE = not DEBUG
SESSION_COOKIE_AGE = 60 * 60 * 24 * 14
CSRF_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_HTTPONLY = False  # the SPA must read it to send the X-CSRFToken header
CORS_ALLOWED_ORIGINS = env("CORS_ALLOWED_ORIGINS")
CORS_ALLOW_CREDENTIALS = True

if not DEBUG:
    SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    # Preloading is effectively irreversible for a domain, so it is an explicit opt-in.
    SECURE_HSTS_PRELOAD = env.bool("DJANGO_HSTS_PRELOAD", default=False)
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SILENCED_SYSTEM_CHECKS = [] if env.bool("DJANGO_HSTS_PRELOAD", default=False) else ["security.W021"]  # preload is a deliberate opt-in
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"

# Security-check history is kept this long (and can be deleted by the user at any time).
ANALYSIS_RETENTION_DAYS = env("ANALYSIS_RETENTION_DAYS")

# ---- Uploads: only business logos, validated and re-encoded in apps/businesses/uploads.py ----
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
MAX_UPLOAD_BYTES = env("MAX_UPLOAD_MB") * 1024 * 1024
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_BYTES
FILE_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_BYTES

# ---- REST framework ----
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.common.auth.SessionAuth"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],  # private by default
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_PAGINATION_CLASS": "apps.common.pagination.StandardPagination",
    "PAGE_SIZE": 50,
    "EXCEPTION_HANDLER": "apps.common.errors.exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # Number of trusted reverse proxies in front of Django. 0 = use the socket address (safe default; X-Forwarded-For is ignored,
    # so clients cannot spoof their IP to dodge rate limits). Set to 1 behind a single proxy such as nginx.
    "NUM_PROXIES": env("NUM_PROXIES"),
    "DEFAULT_THROTTLE_RATES": {
        "login": env("RATE_LIMIT_LOGIN"),
        "register": env("RATE_LIMIT_REGISTER"),
        "order_submit": env("RATE_LIMIT_ORDER_SUBMIT"),
        "order_lookup": env("RATE_LIMIT_ORDER_LOOKUP"),
        "analysis": env("RATE_LIMIT_ANALYSIS"),
        "upload": env("RATE_LIMIT_UPLOAD"),
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "CoastShield API",
    "DESCRIPTION": "REST API for the CoastShield small-business platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": r"/api/v1",
}

# ---- Logging: never log request bodies, passwords, tokens or message contents ----
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False}},
}
