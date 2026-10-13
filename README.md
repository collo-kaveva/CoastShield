# CoastShield

Secure digital business platform for small businesses in coastal Kenya: a simple storefront, lightweight order requests, and practical cybersecurity guidance.

> **Status: Phase 3 of 4 complete.** The backend, authentication, business and order logic, and the explainable cybersecurity engine all work end to end against PostgreSQL. All sample data is fictional and labelled.

| Phase | Status |
|---|---|
| 1. Interactive frontend (mock services) | ✅ complete |
| 2. Backend, database, authentication, business logic | ✅ complete (see gaps in `docs/implementation-plan.md`) |
| 3. Cybersecurity engine and security integration | ✅ complete (see gaps in `docs/implementation-plan.md`) |
| 4. End-to-end hardening and demo | ⬜ not started |

## Prerequisites
Python 3.12+, Node.js 20+, PostgreSQL 15+ (no Docker).

## Run with the real backend
```bash
cp .env.example .env                 # then set DJANGO_SECRET_KEY and DB_PASSWORD
./scripts/setup-db.sh                # creates the PostgreSQL role + database from .env (needs a postgres superuser)
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo           # optional: SAMPLE businesses + demo account
.venv/bin/python manage.py runserver           # http://localhost:8000  (API docs: /api/v1/docs/)

cd ../frontend && cp .env.example .env         # set VITE_DATA_MODE=api (and VITE_SHOW_SAMPLE_LOGIN=true if seeded)
npm install && npm run dev                     # http://localhost:5173 (Vite proxies /api to Django)
```
Open the frontend on `localhost:5173`; that origin is listed in `DJANGO_CSRF_TRUSTED_ORIGINS`.
`seed_demo` creates a demo owner (`fatuma@example.com` / `demo-password`, **sample only**); `seed_demo --reset` reloads it and `--remove-only` deletes it.

## Run frontend-only (no backend, demo mode)
`cd frontend && npm install && npm run dev` with `VITE_DATA_MODE=demo` (the default). Data stays in the browser and sign-in is simulated and **not secure**.

## Tests
```bash
cd backend && .venv/bin/python -m pytest          # 207 tests, needs the PostgreSQL database (a test_ database is created)
cd frontend && npm test && npm run typecheck      # 138 tests (includes the shared security corpus)
# Browser integration (needs: pip install playwright && playwright install chromium; Django on :8000; API-mode build served on :4180)
python scripts/e2e_phase2.py && python scripts/e2e_phase3.py
```

## Cybersecurity assistant (Phase 3)
Paste a suspicious message or link; the server returns a LOW/CAUTION/HIGH level, the specific warning signs found with explanations, safe next steps and a disclaimer. It is rule-based (no paid AI), never opens links, and does not store what you paste: only the outcome is kept in a history you can clear. Other Phase 3 pieces: five incident guides served by the API, per-user checklist, rate limits, a validated logo upload (JPEG/PNG/WebP, re-encoded, metadata stripped), and a daily-retention command (`python manage.py purge_analyses`).

## What works against the real backend
Registration, login/logout (sessions + CSRF), owner-scoped business profile with draft/publish, public storefronts and discovery, catalog CRUD with server-side validation, customer order/enquiry submission with server-set prices, owner order management with enforced status transitions and manual payment records, per-user security checklist, dashboard computed from the database, audit events (admin-only), rate limiting on login, registration, order submission and lookup.

## Limitations
- Analysis is preliminary: it can miss threats (well-written scams, other languages) and flag genuine messages. CoastShield does not verify payments, senders or links, and cannot guarantee protection from fraud.
- Password reset sends no email; no email verification; no account lockout beyond IP throttling; throttling uses a per-process cache.
- Uploaded logos are served by Django only in DEBUG (production needs the web server to serve `MEDIA_ROOT`); no customer-facing order-status page yet (the `/orders/lookup/` API exists); no frontend admin screen (Django admin is read-only for audit events).
- Tested in Chromium only; no automated accessibility audit; production HTTPS settings are configured but untested behind real TLS.
See `docs/security-model.md` for the full list.

## Docs
`docs/`: architecture, database schema, API reference, security model, implementation plan, testing plan.
