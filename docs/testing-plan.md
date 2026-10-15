# Testing Plan and Results

## Backend: `cd backend && python -m pytest`: **222 tests, all passing** (PostgreSQL)
| File | Covers |
|---|---|
| `test_auth.py` | register/login/logout, hashing, validators, generic failures, inactive users, 401s, **throttling**, **CSRF on login and writes**, reset non-enumeration, audit without credentials, error hygiene, health |
| `test_production_config.py` (9) | runs the REAL settings with `DEBUG=False` in a fresh process: `check --deploy` has no warnings; secure/HttpOnly/SameSite cookies, HTTPS redirect, HSTS, nosniff, frame denial; media not served by Django; proxy headers ignored unless configured; refuses to start without a secret key or with a placeholder/short one; demo seed refuses known passwords; JSON for unknown API URLs |
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


## Phase 4 verification

### Security test matrix (every item in the brief)
| Area | Evidence |
|---|---|
| Cross-user authorization | `test_orders` (owner scoping), `test_catalog`, `test_businesses`, `test_security_audit_dashboard` (checklist/history isolation); browser: second owner gets 404 on GET/transition/payment (`e2e_phase2`) |
| Draft storefront privacy | `test_businesses` (drafts == missing, preview owner-only); browser: unpublish hides storefront |
| Invalid input | `test_security_api` (types, null bytes, empty, oversize 413, non-JSON, wrong content type), `test_orders`, `test_catalog`, `test_uploads` |
| Invalid order status changes | `test_orders` (transition table, 409), browser (409 via API) |
| Duplicate submissions | `test_orders` (60 s duplicate window → 409) |
| Authentication failures | `test_auth` (generic message, inactive users, 401s, CSRF) |
| Malformed URLs | `test_security_engine` + shared corpus (javascript:, data:, file:, ftp:, gopher:, empty, huge, IP forms, metadata addresses; nothing fetched) |
| Rate limiting | `test_auth`, `test_orders`, `test_security_api`, `test_uploads`; spoofed `X-Forwarded-For` cannot dodge limits; limits are stored in the shared DB cache |
| Customer data privacy | `test_orders` (receipt, lookup leak nothing; audit has no customer data); browser: lookup echoes no private details; admin page contains no customer details |
| Audit permissions | `test_security_audit_dashboard` (ADMIN-only; `is_staff` alone is not admin); browser: owners redirected from `/admin` |

### Accessibility: `scripts/a11y_audit.py` (axe-core, Chromium)
66 page×viewport combinations (13 public + 8 owner + 1 admin screen, at 390, 768 and 1280 px): **0 violations** (WCAG 2.0/2.1 A and AA plus best practice). The first run found three real issues, all fixed: icon-only tabs with no accessible name (critical), invalid definition-list markup on storefronts, and a horizontally scrolling table unreachable by keyboard. Functional checks that axe cannot make also pass: skip link, visible focus on links and buttons, items addable with Enter, dialog focus moves in / traps / Escape closes / focus returns, `aria-invalid` + described errors, `role=alert`, `prefers-reduced-motion`, `lang`, single `<main>`.
**Limits:** automated tools find only a subset of problems; no manual screen-reader (TalkBack/VoiceOver/NVDA) testing, no tablet *device* testing, Swahili not available.

### Demo scenario: `scripts/e2e_demo.py` (17 checks, ~40 s)
Follows `docs/demo-script.md` with separate sessions for owner, customer and admin, then crawls 33 internal pages for dead links, sweeps tablet and desktop widths for overflow, records every network host (only the app's own origin), and checks for console errors. It found a real bug: customers who typed a wrong contact saw a generic "Not found." instead of the helpful message (the error handler discarded deliberate 404 messages); fixed with a regression test.

### Reproducibility (fresh directory, new venv, new DB role and database)
README steps followed literally: `.env` from the template with Django's own generated secret key → `setup-db.sh` → `pip install -r requirements.txt` (`pip check` clean) → `migrate` from an empty database → `createcachetable` → `seed_demo` → `pytest --create-db` (all pass) → `npm ci` → typecheck → build → tests. Found and fixed: `setup-db.sh` executed `.env` as shell code and failed on `#`, `&`, `)` and `$` in generated keys; it now reads `.env` as data.

### Dependency audit
`pip-audit`: found Pillow 11.3 (three advisories, relevant because it parses uploads) and pytest 8.4 → upgraded to Pillow 12.3 and pytest 9.1; clean. `npm audit`: React Router 6 open-redirect advisory → upgraded to 7 (0 vulnerabilities in anything shipped); dev tooling upgraded to vite 8 / vitest 5 (critical advisories gone). **Accepted:** 7 advisories remain in the Tailwind 3 build chain (a glob-pattern DoS that only matters when building with attacker-controlled patterns; ours are static). Fixing needs a Tailwind 4 migration, deferred.
