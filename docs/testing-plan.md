# Testing Plan and Results

## Backend: `cd backend && python -m pytest`: **207 tests, all passing** (PostgreSQL)
| File | Covers |
|---|---|
| `test_auth.py` | register/login/logout, hashing, validators, generic failures, inactive users, 401s, **throttling**, **CSRF on login and writes**, reset non-enumeration, audit without credentials, error hygiene, health |
| `test_businesses.py` | ownership, protected fields (slug/status/owner), validation, unique stable slugs, publish rules, **draft invisibility**, preview, opt-in contact, hidden prices/stock, filters |
| `test_catalog.py` | CRUD, price/quantity validation, **cross-owner denial**, id injection, public can't modify, DB CHECK constraints |
| `test_orders.py` | submission, server-set prices/status, quantity/availability/foreign-item/stock validation, drafts, duplicates, **rate limits**, owner scoping, **transitions and history**, manual payment, snapshots survive deletion, customer lookup privacy |
| `test_security_audit_dashboard.py` | checklist persistence and **per-user isolation**, ignored client user ids, **audit access control**, admin site exposure, honest dashboard numbers, seed command, OpenAPI |

| `test_security_engine.py` (85) | 59-case shared corpus parity, explanations present, no single-indicator HIGH, false-positive guards, IP-form normalisation, internal/metadata addresses never contacted (network functions patched to fail), non-string input, hostile input and timing |
| `test_security_api.py` (30) | structured results, auth required, malformed/oversized/wrong-content-type requests, no network, **text absent from every DB column**, audit minimal, per-user throttling, own-only history, clear, retention (on write and command), cap, incident guides |
| `test_uploads.py` (22) | re-encode and resize, metadata stripped, polyglot payload destroyed, non-images/SVG/GIF/BMP/truncated rejected, content beats extension, size and decompression-bomb limits, owner scoping, old files deleted, public only via published storefront, throttle |

## Integration: `scripts/e2e_phase3.py` (Chromium + Django + PostgreSQL), **passed (23 checks)**
Verifies server-side analysis requests, indicator/finding labelling, history persistence and clearing, a `pg_dump` scan finding no trace of the checked text, incident guides from the API, malformed input, no fetching of metadata addresses, the rate limit and its friendly message, rejection of a fake PNG and an SVG with script, a valid logo stored under a random name, served as a real PNG ≤512px on the public storefront, no overflow, no console errors. It found a UX bug (upload errors showed a generic message instead of the specific reason), now fixed. The pytest run found a 500 on oversized bodies, now a 413.

## Integration: `scripts/e2e_phase2.py` (Chromium + Django + PostgreSQL), **passed**
Separate browser sessions for owner, anonymous customer and a second owner: register → onboarding → publish → QR → customer order → owner accepts → IDOR attempts return 404 → invalid transition 409 → unpublish hides storefront → sample login → checklist persisted across reload → message analysis → overflow and console checks. It found two real problems: a checklist control that lagged on network round trips, and a harness bug that omitted CSRF headers (which also proved CSRF rejects such requests).

## Automated (frontend, run with `npm test`): 79 tests, all passing
| File | Covers |
|---|---|
| `services/security/analyzer.test.ts` (22) | Positive samples (HIGH/CAUTION), false-positive guards (safety reminders, ordinary messages), single-indicator never HIGH, empty/oversized/HTML/unicode input, URL checks (IP, brand imitation incl. subdomain trick, genuine Safaricom not flagged, shorteners, `@` trick, punycode, unsafe schemes, malformed input) |
| `services/mock/mockApi.test.ts` (23) | Auth, generic credential errors, signed-out denial, cross-owner access denial (orders, catalog), checklist isolation, draft invisibility, contact-field opt-in, hidden prices, slug stability, catalog validation, order validation (quantities, unavailable, foreign item, stock, duplicates), transitions, manual payment, message not stored |
| `lib/orderRules.test.ts` (5) | Transition table |
| `test/routes.test.tsx` (29) | Every route renders; auth redirect; onboarding redirect; customer order flow; validation errors; owner accepting; security UI; checklist persistence; full onboarding-to-publish; onboarding blocking |

These test the **mock** service. The equivalent backend cases are in the pytest suite above.

## Frontend corpus parity: `src/services/security/parity.test.ts` runs the same 59 shared cases against the TypeScript engine.

## Real-browser smoke test: `scripts/e2e_phase1.py` (Chromium, 390×844)
Register → onboarding → publish → QR PNG download → anonymous customer orders → anonymous access to `/orders` redirects → owner accepts → message analysis → horizontal-overflow sweep of 13 routes → console-error check. **Passed.** It found one bug that jsdom tests could not (QR image export).

## Known gaps
No automated accessibility audit, no tablet or Firefox/Safari testing, no real-device testing, no performance budget beyond lazy-loaded pages (main bundle ≈92 kB gzipped).
