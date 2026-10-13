import json
import re
import socket
from datetime import timedelta

import pytest
from django.core.management import call_command
from django.db import connection
from django.utils import timezone
from rest_framework.throttling import ScopedRateThrottle

from apps.audit.models import AuditEvent
from apps.cybersecurity.models import SecurityAnalysis

from .conftest import client_for, make_user

pytestmark = pytest.mark.django_db
MSG = "/api/v1/security/analyze-message/"
URL = "/api/v1/security/check-url/"
SENTINEL = "ZZSENTINELZZ"
SCAM = f"SAFARICOM ALERT {SENTINEL}: Your M-PESA account will be suspended within 24 hours. Verify now: http://safaricom-verify-account.xyz/login?{SENTINEL}"


def post(c, url, body):
    return c.post(url, body, format="json")


def test_message_analysis_returns_structured_explainable_result(owner_client):
    r = post(owner_client, MSG, {"text": SCAM})
    assert r.status_code == 200
    d = r.json()
    assert d["risk"] == "HIGH" and d["urlsFound"] and "preliminary" in d["disclaimer"] and d["recommendations"]
    assert {i["id"] for i in d["indicators"]} >= {"urgency", "account_problem", "link_warnings"}
    assert all({"id", "label", "severity", "explanation"} <= set(i) for i in d["indicators"])


def test_url_analysis_result(owner_client):
    d = post(owner_client, URL, {"url": "https://safaricom.co.ke@evil.example.com/"}).json()
    assert d["valid"] is True and d["hostname"] == "evil.example.com" and any(i["id"] == "userinfo" for i in d["indicators"])
    bad = post(owner_client, URL, {"url": "javascript:alert(1)"}).json()
    assert bad["valid"] is False and bad["indicators"][0]["id"] == "unsafe_scheme"


def test_analysis_requires_login(anon):
    assert post(anon, MSG, {"text": "hi"}).status_code == 401
    assert post(anon, URL, {"url": "https://a.com"}).status_code == 401
    assert anon.get("/api/v1/security/analyses/").status_code == 401
    assert anon.get("/api/v1/security/incidents/").status_code == 401


@pytest.mark.parametrize("body", [{}, {"text": ""}, {"text": "   \n  "}, {"text": None}, {"text": "a" * 2001}, {"text": ["a"]}, {"text": {"a": 1}},
                                  {"text": True}, {"text": "bad\x00null"}, {"wrong": "field"}])
def test_malformed_message_requests_are_rejected_cleanly(owner_client, body):
    r = post(owner_client, MSG, body)
    assert r.status_code == 422, body
    e = r.json()["error"]
    assert e["code"] == "validation_error" and "text" in e["fields"] and "Traceback" not in r.content.decode()
    assert SecurityAnalysis.objects.count() == 0  # nothing recorded for rejected input


@pytest.mark.parametrize("body", [{}, {"url": ""}, {"url": None}, {"url": "a" * 2049}, {"url": ["x"]}])
def test_malformed_url_requests_are_rejected_cleanly(owner_client, body):
    assert post(owner_client, URL, body).status_code == 422


def test_non_json_and_wrong_content_types(owner_client):
    assert owner_client.post(MSG, "not json", content_type="application/json").status_code == 400
    assert owner_client.post(MSG, "text=hello", content_type="application/x-www-form-urlencoded").status_code == 415
    assert owner_client.get(MSG).status_code == 405


def test_oversized_request_body_is_refused_without_a_server_error(owner_client):
    r = owner_client.post(MSG, json.dumps({"text": "a" * (3 * 1024 * 1024)}), content_type="application/json")
    assert r.status_code in (400, 413), r.status_code
    assert "Traceback" not in r.content.decode()


def test_hostile_text_is_handled_and_never_executed_or_reflected_unsafely(owner_client):
    for text in ["<script>alert(1)</script> send your password now", "'; DROP TABLE accounts_user;--", "{{7*7}} ${jndi:ldap://evil/x}", "😀" * 400]:
        r = post(owner_client, MSG, {"text": text})
        assert r.status_code == 200 and r["Content-Type"].startswith("application/json")
    from apps.accounts.models import User
    assert User.objects.exists()  # the DB is intact


def test_urls_are_never_fetched_even_if_internal(owner_client, monkeypatch):
    def boom(*a, **k):
        raise AssertionError("network access attempted")
    for n in ("getaddrinfo", "gethostbyname", "create_connection"):
        monkeypatch.setattr(socket, n, boom)
    monkeypatch.setattr(socket.socket, "connect", boom)
    for u in ["http://169.254.169.254/latest/meta-data/", "http://localhost:8000/admin/", "http://10.0.0.1/", "http://[::1]/", "http://2130706433/", "https://bit.ly/x"]:
        assert post(owner_client, URL, {"url": u}).status_code == 200
    assert post(owner_client, MSG, {"text": "see http://169.254.169.254/ now"}).status_code == 200


def test_submitted_text_is_never_stored_logged_or_audited(owner_client):
    post(owner_client, MSG, {"text": SCAM})
    post(owner_client, URL, {"url": f"https://evil.example.com/{SENTINEL}"})
    a = SecurityAnalysis.objects.all()
    assert a.count() == 2
    for row in a:
        blob = json.dumps({"k": row.kind, "r": row.risk, "i": row.indicators, "h": row.content_hash})
        assert SENTINEL not in blob and "safaricom-verify" not in blob and "evil.example" not in blob
        assert re.fullmatch(r"[0-9a-f]{64}", row.content_hash) and SCAM not in row.content_hash
        assert all(set(i) == {"id", "label", "severity"} for i in row.indicators)  # no 'matched' snippets
    assert SENTINEL not in " ".join(str(e.metadata) + e.action for e in AuditEvent.objects.all())
    # Sweep every text column of every table: the text is nowhere in the database.
    with connection.cursor() as c:
        c.execute("select table_name, column_name from information_schema.columns where table_schema='public' and data_type in ('text','character varying','jsonb','json')")
        for t, col in c.fetchall():
            c.execute(f'select count(*) from "{t}" where "{col}"::text ilike %s', [f"%{SENTINEL}%"])
            assert c.fetchone()[0] == 0, f"{t}.{col}"


def test_analysis_audit_event_holds_only_kind_and_risk(owner_client):
    post(owner_client, MSG, {"text": SCAM})
    e = AuditEvent.objects.get(action="ANALYSIS_RUN")
    assert e.metadata == {"kind": "MESSAGE", "risk": "HIGH"}


def test_analysis_is_rate_limited_per_user(owner_client, other_client, monkeypatch):
    monkeypatch.setitem(ScopedRateThrottle.THROTTLE_RATES, "analysis", "3/min")
    codes = [post(owner_client, MSG, {"text": f"hello {i}"}).status_code for i in range(5)]
    assert codes == [200, 200, 200, 429, 429]
    assert post(owner_client, URL, {"url": "https://a.com"}).status_code == 429  # shared scope
    assert post(other_client, MSG, {"text": "hello"}).status_code == 200  # other users unaffected
    assert post(owner_client, MSG, {"text": "x"}).json()["error"]["code"] == "throttled"


def test_history_is_own_only_minimal_and_clearable(owner_client, other_client):
    post(owner_client, MSG, {"text": SCAM})
    post(owner_client, URL, {"url": "https://example.com"})
    post(other_client, MSG, {"text": "hello there"})
    h = owner_client.get("/api/v1/security/analyses/").json()
    assert h["count"] == 2 and {x["kind"] for x in h["results"]} == {"MESSAGE", "URL"}
    assert set(h["results"][0]) == {"id", "kind", "risk", "indicators", "createdAt"}
    assert SENTINEL not in json.dumps(h)
    assert other_client.get("/api/v1/security/analyses/").json()["count"] == 1
    assert owner_client.delete("/api/v1/security/analyses/").status_code == 204
    assert owner_client.get("/api/v1/security/analyses/").json()["count"] == 0
    assert other_client.get("/api/v1/security/analyses/").json()["count"] == 1  # untouched
    assert AuditEvent.objects.get(action="ANALYSIS_HISTORY_CLEARED").metadata == {"count": 2}


def test_retention_is_enforced_on_write_and_by_command(owner, owner_client, settings):
    settings.ANALYSIS_RETENTION_DAYS = 30
    old = SecurityAnalysis.objects.create(user=owner, kind="URL", risk="LOW", content_hash="0" * 64)
    SecurityAnalysis.objects.filter(pk=old.pk).update(created_at=timezone.now() - timedelta(days=45))
    post(owner_client, MSG, {"text": "hello"})
    assert not SecurityAnalysis.objects.filter(pk=old.pk).exists()  # purged by the next write
    stale = SecurityAnalysis.objects.create(user=owner, kind="URL", risk="LOW", content_hash="1" * 64)
    SecurityAnalysis.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(days=45))
    call_command("purge_analyses")
    assert not SecurityAnalysis.objects.filter(pk=stale.pk).exists() and SecurityAnalysis.objects.count() == 1


def test_history_is_capped_per_user(owner, owner_client):
    from apps.cybersecurity import history
    SecurityAnalysis.objects.bulk_create([SecurityAnalysis(user=owner, kind="URL", risk="LOW", content_hash="2" * 64) for _ in range(history.MAX_PER_USER + 20)])
    post(owner_client, MSG, {"text": "hello"})
    assert SecurityAnalysis.objects.filter(user=owner).count() == history.MAX_PER_USER


def test_incident_guides_cover_required_scenarios_and_point_to_official_channels(owner_client):
    g = owner_client.get("/api/v1/security/incidents/").json()
    assert {x["id"] for x in g} == {"suspicious-payment", "compromised-account", "lost-phone", "suspicious-link", "customer-scam"}
    assert all(len(x["steps"]) >= 4 for x in g)
    text = json.dumps(g)
    assert "official" in text and not re.search(r"\d{6,}|\+254|0[17]\d{8}", text)  # no phone numbers that could go stale or be spoofed


def test_rules_never_ask_for_secrets_in_any_response_text(owner_client):
    text = json.dumps(owner_client.get("/api/v1/security/incidents/").json()) + json.dumps(post(owner_client, MSG, {"text": SCAM}).json())
    assert not re.search(r"(enter|send|share|provide|type) (your|the) (pin|password|otp)", text, re.I)
