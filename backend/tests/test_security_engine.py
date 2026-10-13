"""Rule engine tests. Pure Python: no database. The shared corpus is also run against the TypeScript engine."""
import json
import socket
import time
from pathlib import Path

import pytest

from apps.cybersecurity.services import MAX_MESSAGE_LENGTH, analyze_message, analyze_url, classify

CASES = json.loads((Path(__file__).resolve().parents[2] / "shared" / "security_cases.json").read_text())["cases"]
ids = lambda r: [i["id"] for i in r["indicators"]]


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Any attempt to resolve or connect during analysis fails the test: proves URLs are never fetched."""
    def boom(*a, **k):
        raise AssertionError("network access attempted during analysis")
    for name in ("getaddrinfo", "gethostbyname", "create_connection"):
        monkeypatch.setattr(socket, name, boom)
    monkeypatch.setattr(socket.socket, "connect", boom)


@pytest.mark.parametrize("case", CASES, ids=[c["id"] for c in CASES])
def test_parity_with_typescript_reference(case):
    r = analyze_message(case["input"]) if case["kind"] == "message" else analyze_url(case["input"])
    assert r["risk"] == case["expected"]["risk"]
    assert ids(r) == case["expected"]["indicators"]
    if case["kind"] == "url":
        assert r["valid"] == case["expected"]["valid"]


def test_every_result_has_explanations_recommendations_and_disclaimer():
    for c in CASES:
        r = analyze_message(c["input"]) if c["kind"] == "message" else analyze_url(c["input"])
        assert r["recommendations"] and "preliminary" in r["disclaimer"]
        for i in r["indicators"]:
            assert len(i["explanation"]) > 10 and i["severity"] in ("low", "medium", "high")


def test_one_indicator_never_means_high():
    for c in CASES:
        r = analyze_message(c["input"]) if c["kind"] == "message" else analyze_url(c["input"])
        if len(r["indicators"]) == 1:
            assert r["risk"] != "HIGH"
    assert classify([{"severity": "high"}]) == "CAUTION"


def test_false_positive_guards():
    assert analyze_message("Never share your M-PESA PIN with anyone.")["indicators"] == []
    assert analyze_message("Your OTP is 123456. Do not share it with anyone.")["indicators"] == []
    assert "brand_lookalike" not in ids(analyze_url("https://www.safaricom.co.ke"))
    assert "brand_lookalike" in ids(analyze_url("https://safaricom.co.ke.evil.top"))
    assert analyze_message("mail me at a@gmail.com")["urlsFound"] == []


def test_ip_forms_are_normalised_like_a_browser():
    for u in ("http://2130706433/", "http://0x7f.1/", "http://127.1/", "http://0177.0.0.1/"):
        r = analyze_url(u)
        assert r["hostname"] == "127.0.0.1" and "ip_host" in ids(r), u
    assert analyze_url("http://999.1.1.1/")["valid"] is False
    assert analyze_url("http://1.2.3.4.5/")["valid"] is False


def test_internal_and_metadata_addresses_are_only_flagged_never_contacted():
    for u in ("http://169.254.169.254/latest/meta-data/", "http://10.0.0.5/", "http://[::1]/", "http://localhost/"):
        r = analyze_url(u)  # no_network fixture would raise if anything were resolved or fetched
        assert r["risk"] in ("CAUTION", "LOW")
    assert "ip_host" in ids(analyze_url("http://169.254.169.254/"))


@pytest.mark.parametrize("bad", [None, 123, [], {}, b"bytes", object()])
def test_non_string_input_is_safe(bad):
    assert analyze_message(bad)["risk"] == "LOW"
    assert analyze_url(bad)["valid"] is False


HOSTILE = [
    "\x00\x01\x02 send your pin now", "<script>alert(1)</script>", "'; DROP TABLE users;--", "{{7*7}} ${jndi:ldap://x}",
    "😀" * 500, "a" * MAX_MESSAGE_LENGTH, "pin " * 500, "http://" + "a." * 1000 + "com", "(" * 3000, "!" * 5000,
    "word " * 400 + "install " * 100, "‮reversed‬ text", "https://xn--" + "a" * 300 + ".com",
]


@pytest.mark.parametrize("text", HOSTILE)
def test_hostile_input_never_raises_and_stays_fast(text):
    t = time.perf_counter()
    for fn in (analyze_message, analyze_url):
        r = fn(text)
        assert r["risk"] in ("LOW", "CAUTION", "HIGH") and isinstance(r["summary"], str)
    assert time.perf_counter() - t < 1.0  # guards against catastrophic regex backtracking


def test_worst_case_regex_inputs_are_linear_enough():
    nasty = ("account " + "x" * 59 + " ") * 30  # pushes bounded gaps to their limits
    t = time.perf_counter()
    analyze_message(nasty[:MAX_MESSAGE_LENGTH])
    assert time.perf_counter() - t < 0.5


def test_message_longer_than_limit_is_truncated_not_trusted():
    r = analyze_message("hello " * 400 + " send your PIN")
    assert "credentials" not in ids(r)  # content after the limit is ignored
