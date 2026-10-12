# Implementation Plan

Checklist items are ticked only after implementation **and** passing tests.

## Phase 1: Planning
- [x] Repository inspected (greenfield; Python 3.12.3, Node 22 available; PostgreSQL not present in the build sandbox)
- [x] Folder structure scaffolded
- [ ] Architecture, schema, API and security docs reviewed and approved

## Phase 2: Scaffolding
- [ ] Django project `config/` (split settings, env loading via django-environ)
- [ ] DRF, CORS, drf-spectacular configured
- [ ] `GET /api/v1/health/`
- [ ] Vite + Tailwind + Router + TanStack Query shell
- [ ] Dev scripts in `scripts/`
- **Exit:** both apps start; frontend reads health endpoint

## Phase 3: Accounts and auth
- [ ] Custom `User` model (email login, `role`)
- [ ] Register / login / logout / me endpoints, session + CSRF
- [ ] Protected routes in frontend
- [ ] Tests: register, login, invalid credentials, cross-user denial

## Phase 4: Business and catalog
- [ ] `BusinessProfile`, `CatalogItem`, slug generation, publish/unpublish
- [ ] Public storefront endpoint (published only)
- [ ] QR generation, onboarding, editor, catalog manager
- [ ] Tests: draft invisibility, ownership, validation

## Phase 5: Orders
- [ ] `OrderRequest`, `OrderItem` with price snapshots
- [ ] Public submit with server-side validation, reference numbers, throttling
- [ ] Owner list/detail/transition endpoints
- [ ] Tests: invalid qty, unavailable items, invalid transitions, privacy

## Phase 6: Cybersecurity assistant
- [ ] `services/` rule engine and URL analyzer (no network access)
- [ ] Analysis, checklist, incident guidance endpoints and UI
- [ ] Tests: false positives/negatives, malformed and hostile input

## Phase 7: Dashboard and audit
- [ ] Dashboard summary endpoint, empty states
- [ ] Audit events and restricted access

## Phase 8: Integration and hardening
- [ ] Full flow test, authorization sweep, accessibility and responsive checks

## Phase 9: Demo
- [ ] Labelled sample data, reset command, demo script

## Decisions needed before Phase 2
1. **Auth approach:** session cookie + CSRF recommended (same-site dev via Vite proxy). Confirm.
2. **Customer access to own request:** reference number + customer phone/email last digits lookup. Confirm.
3. **Image storage:** local `MEDIA_ROOT` for MVP. Confirm.
4. **PostgreSQL:** confirm the team has it locally; otherwise a clearly separated SQLite dev fallback is allowed.
