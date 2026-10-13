# Implementation Plan (four phases)

Legend: ✅ done and verified · 🟡 partial · ⬜ not started. Items are ticked only after they were run and checked.

## Phase 1: Interactive frontend (demo mode)  ✅ complete
Goal: an attractive, fully interactive UI on a mock service layer that can be swapped for the real API.

| Acceptance criterion | Status | How verified |
|---|---|---|
| Frontend starts | ✅ | `npm run dev` / `npm run build` / `npm run preview` |
| All principal routes load | ✅ | Vitest route smoke tests (29) + real-browser sweep of 13 routes |
| Polished, responsive landing page | ✅ | Screenshots at 1280px and 390px; no horizontal overflow on any route at 390px |
| New user can navigate onboarding | ✅ | UI test + Playwright run (5 steps, validation, draft save, publish) |
| Sample business created and previewed | ✅ | Onboarding and editor live preview |
| Catalog add/edit/delete/availability | ✅ | UI present; logic covered by mock API tests (validation, ownership) |
| Public storefront preview and sharing | ✅ | Public + draft-preview routes, copy link |
| QR code generated and downloadable | ✅ | Playwright downloaded `coastshield-qr.png` (found and fixed an xmlns bug) |
| Customer submits demo order | ✅ | UI test + Playwright; reference returned |
| Owner updates order status | ✅ | UI test + Playwright; invalid transitions hidden and rejected |
| Security assistant shows meaningful results | ✅ | 22 analyzer tests + UI test; indicators, explanations, steps, disclaimer |
| Desktop and mobile layouts | ✅ | Screenshots + overflow sweep (see limits below) |
| No inert primary controls | 🟡 | Manual review plus flow tests; no automated "every button" audit |
| TypeScript and tests pass | ✅ | `tsc --noEmit` clean; 79 Vitest tests pass |

Not yet done in Phase 1 (honest gaps): automated accessibility audit (axe), tablet-size checks, cross-browser testing (Chromium only), Recharts (not used; no chart adds value yet), image upload/logo (not in Phase 1 scope), real-device testing.

## Phase 2: Backend, database, authentication, business logic  ✅ complete (with listed gaps)
| Acceptance criterion | Status | How verified |
|---|---|---|
| Registration and login with the backend | ✅ | 70 pytest tests + browser E2E against Django |
| Business profiles persist in PostgreSQL | ✅ | E2E: published storefront visible to a separate customer session |
| Catalog changes persist | ✅ | pytest CRUD + validation + DB constraints |
| Public storefronts return published data only | ✅ | pytest: drafts/missing identical 404, opt-in contact, hidden prices |
| Unauthorized access rejected | ✅ | pytest + E2E: second owner gets 404 on GET/transition/payment of another's order |
| Orders submitted and managed | ✅ | pytest + E2E: customer order → owner accepts; invalid transition 409 |
| API validation and automated tests pass | ✅ | `pytest`: 70 passed; frontend 79 passed |
| Runs locally without Docker | ✅ | PostgreSQL 16 + venv + Vite |

Also built (ahead of Phase 3, because the models and the UI needed them): per-user checklist endpoints, audit events, dashboard summary, `seed_demo` command, owner-scoped `lookup` endpoint for customers.
**Gaps:** customer lookup has no frontend screen yet; no frontend admin page; password reset sends no email; throttle cache is per-process (see `security-model.md`); Swagger typing incomplete; only Chromium tested.

## Phase 3: Cybersecurity engine and security integration  ✅ complete (with listed gaps)
| Acceptance criterion | Status | How verified |
|---|---|---|
| Frontend submits real analysis requests to the backend | ✅ | E2E asserts the POST to `/security/analyze-message/` and `/check-url/` |
| Results contain explanations and recommended actions | ✅ | pytest (every shared case) + UI |
| Malformed input handled safely | ✅ | pytest: wrong types, null bytes, empty, oversize (413), non-JSON, hostile strings, timing |
| Checklist progress persisted and user-specific | ✅ | pytest isolation tests (Phase 2) + E2E reload |
| Audit events recorded securely | ✅ | pytest: kind+risk only; sentinel sweeps |
| Tests cover representative positives and negatives | ✅ | 59 shared cases (Python and TypeScript), false-positive guards, parity |
| UI distinguishes warning indicators from confirmed findings | ✅ | "Automated indicator" labels and banner; UI test + E2E |
| Rate limits, upload restrictions, retention | ✅ | pytest + E2E (429 UX, rejected fakes/SVG, random PNG name) |

Also built: analysis history with clear-all, incident guidance served by the API, validated logo upload and storefront display, `purge_analyses` command.
**Gaps:** rule set is small and English/Swahili-light; no reputation provider (deliberately); uploads served by Django only in DEBUG; per-process throttle cache; customer lookup screen and admin screen still not built; only Chromium tested.

## Phase 4: End-to-end testing, hardening, demo  ⬜
- [ ] Full workflow against real backend; security, accessibility and responsive testing
- [ ] Clean-database migrations; setup verified from scratch
- [ ] Demo data, reset command, demo script, known limitations

## Decisions made for Phase 2 (defaults applied)
1. **Auth:** session cookie + CSRF behind the Vite `/api` proxy (recommended).
2. **Customer access to own request:** reference number plus a contact check.
3. **Images:** local `MEDIA_ROOT` for the MVP.
4. **PostgreSQL:** confirm availability locally (otherwise a clearly separated dev fallback).
Applied as listed: session+CSRF, reference+contact lookup, local media (no uploads yet), PostgreSQL required.
