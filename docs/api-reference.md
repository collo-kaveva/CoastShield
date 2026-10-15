# API Reference (`/api/v1/`) — implemented through Phase 3

Authoritative contract: this file plus the TypeScript types in `frontend/src/services/types.ts`. Swagger UI is served at `/api/v1/docs/` and the schema at `/api/v1/schema/`; some responses there are only loosely typed.

**Auth:** session cookie (`HttpOnly`, `SameSite=Lax`, `Secure` outside DEBUG). State-changing requests must send `X-CSRFToken` (read the `csrftoken` cookie; `GET /auth/csrf/` sets it).
**Errors:** `{"error": {"code", "message", "fields": {field: message}}}`. Validation errors are HTTP 422; unauthenticated 401; wrong owner or missing 404; invalid state change 409; throttled 429. No stack traces.
**Users** are `{id, name, email, role}` (`OWNER` or `ADMIN`). Unknown `/api/v1/` URLs and unexpected failures also return the structured JSON error.
**Pagination:** list endpoints return `{count, next, previous, results}` (`page`, `page_size` ≤ 200). JSON is camelCase.

| Method + path | Auth | Notes |
|---|---|---|
| `GET /health/` | public | `{status, database}` |
| `GET /auth/csrf/` | public | sets CSRF cookie |
| `POST /auth/register/` | public, throttled | creates owner, signs in; password validated by Django validators |
| `POST /auth/login/` | public, throttled, CSRF | one generic failure message |
| `POST /auth/logout/` | owner | 204 |
| `GET /auth/me/` | public | `{user}` or `{user: null}` |
| `PATCH /auth/me/` | owner | `{name}` |
| `POST /auth/password-reset/` | public, throttled | always 204; **no email is sent yet** |
| `GET/PUT /business/me/` | owner | own business only; PUT creates or updates (slug and status not writable) |
| `POST /business/me/publish/` `…/unpublish/` | owner | publish requires name, description, county+town, a contact |
| `GET/POST /catalog/items/`, `GET/PUT/DELETE /catalog/items/{id}/` | owner | scoped to own business; others' ids return 404 |
| `GET /storefronts/?category=&q=` | public | published only |
| `GET /storefronts/{slug}/[?preview=1]` | public; preview = owner of draft | drafts and missing share one 404 |
| `POST /storefronts/{slug}/orders/` | public, throttled | returns `{reference, businessName, createdAt}` only |
| `POST /orders/lookup/` | public, throttled | `{reference, contact}` → status and item names; any mismatch = 404 |
| `GET /orders/`, `GET /orders/{id}/` | owner | own business's orders only |
| `POST /orders/{id}/transition/` | owner | `{to}`; NEW→ACCEPTED→READY→COMPLETED, CANCELLED before completion; else 409 |
| `POST /orders/{id}/payment/` | owner | `{status: PAID|UNPAID}`, manual record only |
| `GET /security/checklist/`, `PUT /security/checklist/{key}/` | owner | `{done}`; progress keyed to the session user |
| `POST /security/analyze-message/` | owner, **throttled** | `{text}` (1–2000 chars) → `{risk, indicators[{id,label,severity,explanation,matched?}], summary, recommendations, disclaimer, urlsFound}`. Analysed in memory; text never stored |
| `POST /security/check-url/` | owner, **throttled** | `{url}` (≤2048) → same shape plus `{valid, normalizedUrl, hostname}`. Text inspection only; the URL is never fetched |
| `GET /security/analyses/` | owner | own history: `{id, kind, risk, indicators[{id,label,severity}], createdAt}`. No text exists to return |
| `DELETE /security/analyses/` | owner | deletes the caller's whole history (204) |
| `GET /security/incidents/` | owner | five incident guides (no phone numbers; points to official channels) |
| `POST /business/me/logo/` | owner, throttled | multipart field `logo`; JPEG/PNG/WebP ≤ 2 MB; decoded, resized to ≤512px, metadata stripped, re-encoded to PNG under a random name |
| `DELETE /business/me/logo/` | owner | removes the logo |
| `GET /dashboard/summary/` | owner | computed from the database |
| `GET /audit/events/[?action=]` | **ADMIN role only** | owners get 403 |

Throttle scopes: `login`, `register`, `order_submit`, `order_lookup`, `analysis`, `upload` (rates in `.env`). Oversized bodies return 413; malformed input returns 400/422, never 500.
Uploaded files are served from `/media/` (by Django in DEBUG only; production must serve `MEDIA_ROOT` from the web server).
