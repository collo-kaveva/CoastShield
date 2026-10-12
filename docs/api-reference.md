# API Reference (planned, `/api/v1/`)

Interactive docs will be served by drf-spectacular at `/api/v1/docs/` once implemented.

| Area | Method + path | Auth |
|---|---|---|
| Health | `GET /health/` | Public |
| Auth | `POST /auth/register/`, `/auth/login/`, `/auth/logout/`; `GET/PATCH /auth/me/` | Public / Owner |
| Business | `GET/POST /businesses/`, `GET/PATCH /businesses/{id}/`, `POST /businesses/{id}/publish/`, `/unpublish/` | Owner (own only) |
| Catalog | `GET/POST /businesses/{id}/items/`, `PATCH/DELETE /businesses/{id}/items/{item_id}/` | Owner (own only) |
| Storefront | `GET /storefronts/{slug}/` | Public (published only) |
| Orders (public) | `POST /storefronts/{slug}/orders/`, `POST /orders/lookup/` | Public, throttled |
| Orders (owner) | `GET /businesses/{id}/orders/`, `GET/PATCH /orders/{id}/`, `POST /orders/{id}/transition/` | Owner |
| Security | `POST /security/analyze-message/`, `POST /security/check-url/`, `GET /security/analyses/` | Owner, throttled |
| Checklist | `GET /security/checklist/`, `PUT /security/checklist/{key}/` | Owner |
| Incidents | `GET /security/incidents/` | Owner |
| Dashboard | `GET /dashboard/summary/` | Owner |
| Audit | `GET /audit/events/` | Admin (owners see own events only) |

**Errors:** `{"error": {"code": "...", "message": "...", "fields": {...}}}`. No stack traces.
**Pagination:** page-number, default 20.
