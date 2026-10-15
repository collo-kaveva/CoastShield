"""OpenAPI helpers: tells the schema generator how our session authentication works."""
from drf_spectacular.extensions import OpenApiAuthenticationExtension


class _SessionScheme(OpenApiAuthenticationExtension):
    target_class = "apps.common.auth.SessionAuth"
    name = "sessionAuth"
    priority = 1

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": "sessionid",
                "description": "Session cookie. State-changing requests must also send the X-CSRFToken header (see GET /auth/csrf/)."}


class _CsrfSessionScheme(_SessionScheme):
    target_class = "apps.common.auth.CsrfAlwaysSessionAuth"
    name = "sessionAuthWithCsrf"  # distinct name: this class also enforces CSRF for anonymous callers
