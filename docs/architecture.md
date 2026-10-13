# Architecture

```
React SPA (Vite :5173) ──▶ services/ (Api interface) ──▶ mock (Phase 1)  |  HTTP → Django REST (:8000) → PostgreSQL (Phase 2+)
```

## Frontend (implemented in Phase 1)
```
src/
  app/        providers (React Query, toasts), App
  assets/     (none yet: icons come from Lucide, logo is inline SVG)
  components/ common (Button, Fields, Modal, States, QrCard), storefront, orders, security, landing
  hooks/      TanStack Query hooks; pages only use these, never the mock
  layouts/    Public, Auth, Owner (sidebar + mobile tab bar), Storefront (customer-facing), Focus (onboarding)
  lib/        pure helpers: order transition table, categories, public/private projection, schemas
  pages/      one file per route (lazy-loaded)
  routes/     AppRoutes, guards (RequireAuth, RequireBusiness)
  services/   types.ts = the Api contract; mock/ = demo implementation; http/ = Django client; security/ = rule engine + content
  types/      domain types shared by UI and services
  test/       setup and route/flow tests
```

### The swap point
`services/types.ts` defines `Api`. `services/index.ts` is the only file choosing an implementation. Components call hooks, hooks call `api`. Phase 2 adds an HTTP implementation; no component changes.

### Modes
`VITE_DATA_MODE=demo` (default) uses the browser-only mock; `VITE_DATA_MODE=api` uses `services/http` against Django. UI components are identical in both.

### Demo mode is not security
`services/mock` stores state in `localStorage`, "authentication" is simulated, and passwords are never stored. The UI states this on every auth and dashboard screen. Real enforcement of ownership, publication rules, order validation and transitions is a backend job in Phase 2. The mock mirrors those rules so the UI contract is correct, and tests cover them.

### Deviations from the suggested structure
- Added `layouts/` and `services/` (as in the brief) and kept `hooks/` and `lib/`. The suggested `features/` folder was not used: with a service layer plus hooks, feature folders added indirection without benefit at this size.
- `components/landing/` added for the landing page's interactive preview.
- Charts: Recharts is a listed option but no chart provides value yet, so it is not a dependency.
- Localization: English strings are inline in Phase 1. Swahili is not yet supported and the structure for it is not built; centralizing strings is a Phase 4 task.

## Backend (implemented in Phase 2)
```
backend/
  config/            settings (env-driven, secure defaults), urls (/api/v1/)
  apps/common/       error handler, pagination, auth class (401 not 403), health, admin-role permission
  apps/accounts/     User (email login, role), register/login/logout/me, CSRF endpoint
  apps/businesses/   BusinessProfile, publish rules, public projections, storefront views, dashboard, validated logo upload (uploads.py), seed_demo
  apps/catalog/      CatalogItem, owner-scoped CRUD
  apps/orders/       OrderRequest/OrderItem/OrderEvent, services.py (validation, transitions, lookup)
  apps/cybersecurity/ services/ (pure-Python rule engine), analysis + history + incident endpoints, checklist, retention command
  apps/audit/        AuditEvent, record() with sensitive-key scrubbing, admin-only API
  tests/             pytest-django against PostgreSQL
```
`shared/` holds the cross-language security test corpus.
Business rules live in `services.py` modules; views stay thin. `apps/common` is an addition to the suggested layout.
