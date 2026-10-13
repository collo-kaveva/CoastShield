import pytest
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

from apps.accounts.models import User
from apps.audit.models import AuditEvent

from .conftest import PASSWORD, make_user

REG = {"name": "Asha Mwinyi", "email": "Asha@Example.com", "password": PASSWORD}
pytestmark = pytest.mark.django_db


def test_register_logs_in_and_never_returns_password(anon):
    r = anon.post("/api/v1/auth/register/", REG, format="json")
    assert r.status_code == 201
    assert r.json()["email"] == "asha@example.com"
    assert "password" not in r.content.decode().lower()
    assert anon.get("/api/v1/auth/me/").json()["user"]["email"] == "asha@example.com"
    u = User.objects.get(email="asha@example.com")
    assert u.password != PASSWORD and u.password.startswith("pbkdf2_")  # hashed by Django


def test_register_validation(anon):
    r = anon.post("/api/v1/auth/register/", {"name": "A", "email": "bad", "password": "123"}, format="json")
    assert r.status_code == 422
    body = r.json()["error"]
    assert body["code"] == "validation_error" and {"name", "email", "password"} <= set(body["fields"])
    anon.post("/api/v1/auth/register/", REG, format="json")
    dup = APIClient().post("/api/v1/auth/register/", REG, format="json")
    assert dup.status_code == 422 and "email" in dup.json()["error"]["fields"]


def test_weak_and_common_passwords_rejected(anon):
    r = anon.post("/api/v1/auth/register/", {**REG, "password": "password123"}, format="json")
    assert r.status_code == 422 and "password" in r.json()["error"]["fields"]


def test_login_logout_and_me(owner):
    c = APIClient()
    assert c.get("/api/v1/auth/me/").json() == {"user": None}
    assert c.post("/api/v1/auth/login/", {"email": "OWNER@example.com", "password": PASSWORD}, format="json").status_code == 200
    assert c.get("/api/v1/auth/me/").json()["user"]["name"] == "Test Owner"
    assert c.post("/api/v1/auth/logout/").status_code == 204
    assert c.get("/api/v1/auth/me/").json() == {"user": None}


def test_bad_credentials_get_one_generic_message(owner):
    c = APIClient()
    wrong_pw = c.post("/api/v1/auth/login/", {"email": "owner@example.com", "password": "wrong-password"}, format="json")
    unknown = c.post("/api/v1/auth/login/", {"email": "nobody@example.com", "password": "wrong-password"}, format="json")
    assert wrong_pw.status_code == unknown.status_code == 401
    assert wrong_pw.json()["error"]["message"] == unknown.json()["error"]["message"] == "Incorrect email or password."


def test_inactive_user_cannot_log_in(owner):
    owner.is_active = False
    owner.save()
    r = APIClient().post("/api/v1/auth/login/", {"email": owner.email, "password": PASSWORD}, format="json")
    assert r.status_code == 401


def test_private_endpoints_require_login(anon):
    for url in ["/api/v1/business/me/", "/api/v1/catalog/items/", "/api/v1/orders/", "/api/v1/security/checklist/", "/api/v1/dashboard/summary/", "/api/v1/audit/events/"]:
        r = anon.get(url)
        assert r.status_code in (401, 403), url
        assert r.json()["error"]["code"] in ("not_authenticated", "forbidden")


def test_login_is_rate_limited(owner, monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "login", "3/min")
    c = APIClient()
    codes = [c.post("/api/v1/auth/login/", {"email": owner.email, "password": "nope-nope-nope"}, format="json").status_code for _ in range(5)]
    assert codes[:3] == [401, 401, 401] and codes[3:] == [429, 429]
    assert c.post("/api/v1/auth/login/", {"email": owner.email, "password": "x"}, format="json").json()["error"]["code"] == "throttled"


def test_csrf_enforced_on_login_when_checks_enabled(owner):
    c = APIClient(enforce_csrf_checks=True)
    r = c.post("/api/v1/auth/login/", {"email": owner.email, "password": PASSWORD}, format="json")
    assert r.status_code == 403 and r.json()["error"]["code"] == "csrf_failed"
    token = c.get("/api/v1/auth/csrf/").json()["csrfToken"]
    ok = c.post("/api/v1/auth/login/", {"email": owner.email, "password": PASSWORD}, format="json", HTTP_X_CSRFTOKEN=token)
    assert ok.status_code == 200


def test_csrf_enforced_on_authenticated_writes(owner):
    c = APIClient(enforce_csrf_checks=True)
    token = c.get("/api/v1/auth/csrf/").json()["csrfToken"]
    c.post("/api/v1/auth/login/", {"email": owner.email, "password": PASSWORD}, format="json", HTTP_X_CSRFTOKEN=token)
    assert c.patch("/api/v1/auth/me/", {"name": "New Name"}, format="json").status_code == 403
    token = c.get("/api/v1/auth/csrf/").json()["csrfToken"]
    assert c.patch("/api/v1/auth/me/", {"name": "New Name"}, format="json", HTTP_X_CSRFTOKEN=token).status_code == 200


def test_password_reset_does_not_reveal_accounts(owner, anon):
    a = anon.post("/api/v1/auth/password-reset/", {"email": owner.email}, format="json")
    b = anon.post("/api/v1/auth/password-reset/", {"email": "ghost@example.com"}, format="json")
    assert a.status_code == b.status_code == 204


def test_audit_records_auth_events_without_credentials(owner):
    c = APIClient()
    c.post("/api/v1/auth/login/", {"email": owner.email, "password": "Wrong-Password-1"}, format="json")
    c.post("/api/v1/auth/login/", {"email": owner.email, "password": PASSWORD}, format="json")
    actions = list(AuditEvent.objects.values_list("action", flat=True))
    assert "LOGIN_FAILURE" in actions and "LOGIN_SUCCESS" in actions
    blob = " ".join(str(e.metadata) + e.ip_hash for e in AuditEvent.objects.all())
    assert PASSWORD not in blob and "Wrong-Password-1" not in blob and owner.email not in blob
    assert "127.0.0.1" not in blob


def test_error_responses_hide_internals(anon, monkeypatch):
    r = anon.get("/api/v1/nonexistent/")
    assert r.status_code == 404
    r = anon.post("/api/v1/auth/login/", "not json", content_type="application/json")
    assert r.status_code == 400
    assert "Traceback" not in r.content.decode()


def test_health_endpoint(anon):
    r = anon.get("/api/v1/health/")
    assert r.status_code == 200 and r.json() == {"status": "ok", "database": "ok"}
