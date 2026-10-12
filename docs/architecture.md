# Architecture

## Overview
Two independently runnable apps communicating over versioned REST (`/api/v1/`):

```
React SPA (Vite, :5173)  ──HTTP/JSON──▶  Django + DRF (:8000)  ──ORM──▶  PostgreSQL
```

In development, Vite proxies `/api` to Django so cookies are same-origin.

## Backend apps
| App | Responsibility |
|---|---|
| `accounts` | User model, roles, auth endpoints |
| `businesses` | Business profile, slug, publication, public storefront, QR data |
| `catalog` | Products/services owned by a business |
| `orders` | Order requests, items, status machine, public submission |
| `cybersecurity` | Analysis (rule engine in `services/`), checklist, incident guidance |
| `audit` | Append-only security events |

Business logic lives in `services.py` modules, not in views. Views stay thin (serializer + permission + service call).

## Frontend layout
- `features/*`: API hooks, schemas and feature-specific components per domain
- `components/*`: shared UI; `storefront/` is visually distinct from owner dashboard
- `routes/`: public, owner (authenticated), admin route groups
- `lib/`: API client, i18n-ready string helpers

## Deviations from the suggested structure
None so far. `tests/` at repo root was dropped; backend tests live in `backend/tests/`, frontend tests alongside source.

## Localization
All UI strings go through a small `t()` helper from day one (English only), so Swahili can be added later.
