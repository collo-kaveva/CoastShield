from rest_framework.authentication import SessionAuthentication


class SessionAuth(SessionAuthentication):
    """Session auth that answers unauthenticated requests with 401 (DRF would otherwise send 403)."""
    def authenticate_header(self, request):
        return "Session"


class CsrfAlwaysSessionAuth(SessionAuth):
    """DRF only checks CSRF for logged-in users. For login/register we check it for everyone (login CSRF)."""
    def authenticate(self, request):
        self.enforce_csrf(request)
        return super().authenticate(request)
