# CoastShield

Secure digital business platform for small businesses in coastal Kenya: a simple storefront, lightweight order requests, and practical cybersecurity guidance.

> **Status: all four phases complete.** A reproducible local MVP with a verified end-to-end demo. It is a **hackathon prototype, not a production deployment**: see [Known limitations](#known-limitations) before using it with real data. All sample data is fictional and labelled.

## What it does
- **Owners** register, build a storefront (profile, hours, products/services, optional logo), publish it, share a link or **QR code**, and manage customer **order requests** through `NEW → ACCEPTED → READY → COMPLETED` (or `CANCELLED`), with a manual payment record.
- **Customers** browse published storefronts, send an enquiry or order request without an account, get a **reference number**, and can **track** it with the reference plus the contact they used.
- **Cybersecurity assistant:** paste a suspicious message or link and get a LOW / CAUTION / HIGH level, the **specific warning signs** with plain-language explanations, safe next steps and a disclaimer. It is rule-based (no paid AI), never opens links, and does not store what you paste. Also a per-user **security checklist** and **incident guides** that point to official channels.
- **Administrators** see a restricted audit-event screen (no access to orders, customers or message text).

## Architecture
React + Vite + TypeScript + Tailwind + React Router + TanStack Query + React Hook Form/Zod (frontend) → versioned REST API (`/api/v1/`) → Django + Django REST Framework → PostgreSQL. Session cookies with CSRF. The frontend talks to data only through one `Api` interface that has two implementations: a browser-only demo mock and the real HTTP client. See [`docs/architecture.md`](docs/architecture.md).

## Prerequisites
Python 3.12+, Node.js 20.19+ (or 22.12+), PostgreSQL 15+. **No Docker.**

## Setup
```bash
# 1. Configuration
cp .env.example .env
#    edit .env: set DB_PASSWORD, and a secret key made with:
#    python3 -c "import secrets; print(secrets.token_urlsafe(64))"

# 2. Database (needs a PostgreSQL superuser; override how psql runs with PSQL="psql -U postgres -h localhost")
./scripts/setup-db.sh

# 3. Backend
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python manage.py migrate
.venv/bin/python manage.py createcachetable          # shared rate-limit counters
.venv/bin/python manage.py seed_demo --with-admin    # optional, development only: sample data + demo accounts
.venv/bin/python manage.py runserver                 # http://localhost:8000  (API docs: /api/v1/docs/)

# 4. Frontend (new terminal)
cd frontend && cp .env.example .env
#    set VITE_DATA_MODE=api   (and VITE_SHOW_SAMPLE_LOGIN=true if you seeded the demo data)
npm install && npm run dev                           # http://localhost:5173 (Vite proxies /api and /media to Django)
```
Open the app on `http://localhost:5173` (that origin is in `DJANGO_CSRF_TRUSTED_ORIGINS`). `./scripts/dev-backend.sh` and `./scripts/dev-frontend.sh` wrap steps 3–4.

**Frontend-only (no backend):** leave `VITE_DATA_MODE=demo`. Data stays in your browser and sign-in is simulated, so it is **not secure**. The admin screen and logo upload need the backend.

**Sample accounts (development only, publicly known passwords):** owner `fatuma@example.com` / `demo-password`; admin `admin@example.com` / `demo-admin-password`. `seed_demo` refuses to create them when `DEBUG` is off.

## Demo
Follow [`docs/demo-script.md`](docs/demo-script.md) (about 8 minutes). Reset between runs with `./scripts/demo-reset.sh`. The demo makes no requests to any external service.

## Tests
```bash
cd backend  && .venv/bin/python -m pytest             # 222 tests on PostgreSQL (creates a test database)
cd frontend && npm test && npm run typecheck          # 143 tests
# Browser scripts (pip install playwright && playwright install chromium; backend + API-mode frontend running):
python scripts/e2e_demo.py       # the demo scenario, dead links, responsive sweep, no external requests
python scripts/a11y_audit.py     # axe-core WCAG audit + keyboard/focus checks
python scripts/e2e_phase2.py && python scripts/e2e_phase3.py
```
What each covers, and the results, are in [`docs/testing-plan.md`](docs/testing-plan.md).

## Documentation
[`docs/`](docs/): [architecture](docs/architecture.md) · [database schema](docs/database-schema.md) · [API reference](docs/api-reference.md) · [security model](docs/security-model.md) · [implementation plan and checklist](docs/implementation-plan.md) · [testing plan](docs/testing-plan.md) · [demo script](docs/demo-script.md)

## Security considerations (summary)
Ownership enforced on the server for every private resource (other owners' ids return 404); drafts are indistinguishable from missing storefronts; order prices, status and payment are set only by the server/owner; CSRF, secure cookies, HSTS and a fail-fast secret key in production; rate limits shared across processes; uploads decoded, resized, stripped of metadata and re-encoded; submitted URLs are **never fetched**; checked text is **never stored**; audit log excludes credentials and personal data; dependencies audited. Full detail and the remaining risks: [`docs/security-model.md`](docs/security-model.md).

## Known limitations
- **Not deployment-ready.** Not tested behind real TLS, a reverse proxy or a production host. No deployment guide, no pinned production WSGI server, no static-file setup for the Django admin, and uploaded logos must be served by your web server (Django serves them only in development). Set `NUM_PROXIES` correctly behind a proxy.
- **Detection is preliminary.** Rule-based and explainable, but it can miss real scams (well-written messages, voice scams, other languages) and flag genuine ones. CoastShield cannot verify payments or senders, and cannot guarantee protection from fraud.
- **Payments:** none by design; the owner records payment manually. Nothing verifies mobile-money payments (that would need an authorized provider integration).
- **Accounts and data:** password reset sends no email; no email verification or multi-factor sign-in; no self-service account deletion or data export; customer contact details are kept indefinitely (security-check history is kept 90 days).
- **No notifications:** owners must open the app to see new requests.
- **Scope:** one business per owner, no staff accounts, no product images, stock is not decremented by orders, English only.
- **Testing gaps:** Chromium only; accessibility checked with automated tools and keyboard tests, not with screen readers; no load or penetration testing.
- **Build tooling:** 7 accepted advisories in the Tailwind 3 build chain (development only, never shipped); `npm audit --omit=dev` is clean.

## Future improvements
SMS/WhatsApp/email notifications for owners; email delivery for password reset plus verification and multi-factor sign-in; account deletion, data export and a customer-data retention policy; Swahili localization; product images; staff accounts; a production deployment guide with a hardened web-server setup and Redis for rate limiting; an authorized mobile-money integration for payment *verification*; a larger, community-maintained rule and brand list with feedback loops; a Tailwind 4 migration; manual screen-reader and cross-browser testing.
