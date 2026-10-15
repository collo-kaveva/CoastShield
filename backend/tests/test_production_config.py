"""Exercises the REAL settings with DEBUG off in a fresh process, so production-only protections are verified, not assumed."""
import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
PROD_ENV = {"DJANGO_DEBUG": "False", "DJANGO_ALLOWED_HOSTS": "shop.example.org", "DJANGO_CSRF_TRUSTED_ORIGINS": "https://shop.example.org",
            "DJANGO_SECRET_KEY": "x9#Kq2!vL8@pZ4$tR7^wN1&mB6*cD3(hF5)gJ0_yU-eA+sQ=oXiVlTrWnMbCzKdHj"}


def run(args, **env):
    e = {**os.environ, **PROD_ENV, **env}
    return subprocess.run([sys.executable, *args], cwd=BACKEND, env=e, capture_output=True, text=True, timeout=120)


def settings_json(**env):
    code = ("import os,json,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';django.setup();from django.conf import settings as s;"
            "from config import urls;"
            "print(json.dumps({k:getattr(s,k) for k in ['DEBUG','SESSION_COOKIE_SECURE','CSRF_COOKIE_SECURE','SESSION_COOKIE_HTTPONLY','CSRF_COOKIE_HTTPONLY',"
            "'SESSION_COOKIE_SAMESITE','CSRF_COOKIE_SAMESITE','SECURE_SSL_REDIRECT','SECURE_HSTS_SECONDS','SECURE_CONTENT_TYPE_NOSNIFF','X_FRAME_OPTIONS']}|{'urls':len(urls.urlpatterns),'proxies':s.REST_FRAMEWORK['NUM_PROXIES']}))")
    r = run(["-c", code], **env)
    assert r.returncode == 0, r.stderr[-400:]
    return json.loads(r.stdout.strip().splitlines()[-1])


def test_django_deployment_check_has_no_warnings():
    r = run(["manage.py", "check", "--deploy", "--fail-level", "WARNING"])
    assert r.returncode == 0, r.stdout + r.stderr
    assert "no issues" in (r.stdout + r.stderr)


def test_production_flags_are_on_when_debug_is_off():
    s = settings_json()
    assert s["DEBUG"] is False
    assert s["SESSION_COOKIE_SECURE"] and s["CSRF_COOKIE_SECURE"] and s["SECURE_SSL_REDIRECT"]
    assert s["SESSION_COOKIE_HTTPONLY"] is True and s["CSRF_COOKIE_HTTPONLY"] is False  # SPA must read the CSRF cookie
    assert s["SESSION_COOKIE_SAMESITE"] == s["CSRF_COOKIE_SAMESITE"] == "Lax"
    assert s["SECURE_HSTS_SECONDS"] >= 31536000 and s["SECURE_CONTENT_TYPE_NOSNIFF"] and s["X_FRAME_OPTIONS"] == "DENY"


def test_uploaded_media_is_not_served_by_django_in_production():
    assert settings_json()["urls"] == 2  # admin + api only; no static()/media route


def test_proxy_headers_are_ignored_unless_configured():
    assert settings_json()["proxies"] == 0
    assert settings_json(NUM_PROXIES="1")["proxies"] == 1


def test_app_refuses_to_start_without_a_secret_key():
    r = run(["-c", "import os,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';django.setup()"], DJANGO_SECRET_KEY="")
    assert r.returncode != 0 and "SECRET_KEY" in r.stderr


def test_demo_seed_refuses_known_passwords_in_production():
    r = run(["manage.py", "seed_demo"])
    assert r.returncode != 0 and "publicly known passwords" in r.stderr


def test_production_rejects_placeholder_and_short_secret_keys():
    for bad in ("change-me-generate-a-long-random-value", "dev-only-not-a-real-secret-change-me-0123456789abcdef0123456789", "short"):
        r = run(["-c", "import os,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';django.setup()"], DJANGO_SECRET_KEY=bad)
        assert r.returncode != 0 and "placeholder or too short" in r.stderr, bad


def test_development_may_use_a_placeholder_key():
    r = run(["-c", "import os,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';django.setup();print('started')"], DJANGO_DEBUG="True", DJANGO_SECRET_KEY="dev-only-placeholder")
    assert r.returncode == 0 and "started" in r.stdout


def test_unknown_api_urls_return_json_not_html_even_with_debug_off():
    code = ("import os,django;os.environ['DJANGO_SETTINGS_MODULE']='config.settings';django.setup();"
            "from django.test import Client;r=Client(HTTP_HOST='shop.example.org').get('/api/v1/nope/',secure=True);print(r.status_code,r['Content-Type'],r.content.decode())")
    r = run(["-c", code])
    assert r.returncode == 0 and r.stdout.startswith("404 application/json") and "Traceback" not in r.stdout
