# CoastShield

Secure digital business platform for small businesses in coastal Kenya: a simple storefront, lightweight order requests, and practical cybersecurity guidance.

> **Status: structure scaffolded (pre-Phase 1 sign-off). No feature is implemented yet.**

## Implementation status

Legend: ✅ implemented and tested · 🟡 partial · ⬜ planned

| Module | Status |
|---|---|
| 1. Authentication and onboarding | ⬜ |
| 2. Digital Business Builder (profile, slug, QR) | ⬜ |
| 3. Products and services catalog | ⬜ |
| 4. Enquiries and order requests | ⬜ |
| 5. Cybersecurity assistant (messages, URLs, checklist, incidents) | ⬜ |
| 6. Business dashboard | ⬜ |
| 7. Audit and security events | ⬜ |
| 8. Versioned REST API and docs | ⬜ |

Items are marked ✅ only after they are implemented and verified by tests.

## Stack

- **Frontend:** React + Vite, TypeScript, Tailwind, React Router, TanStack Query, React Hook Form + Zod, Lucide, QR library, Recharts (only where useful)
- **Backend:** Python 3.12+, Django, Django REST Framework, PostgreSQL, pytest
- **No Docker required.**

## Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL 15+ (create a database and user matching `.env`)

## Setup 

```bash
cp .env.example .env            # then edit values
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver      # http://localhost:8000

cd ../frontend && cp ../.env.example .env   # keep only VITE_* lines
npm install && npm run dev      # http://localhost:5173
```

## Tests

```bash
cd backend && pytest
cd frontend && npm test
```

## Documentation

See [`docs/`](docs/): architecture, database schema, API reference, implementation plan, security model, testing plan.

## Known limitations

Documented honestly in `docs/security-model.md` and updated per phase.
