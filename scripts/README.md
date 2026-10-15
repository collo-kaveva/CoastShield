# scripts/

| Script | Purpose |
|---|---|
| `setup-db.sh` | Create the PostgreSQL role and database from `.env` (reads it as data; `PSQL="psql -U postgres -h localhost"` to override) |
| `dev-backend.sh` | venv, install, migrate, `createcachetable`, run Django on :8000 |
| `dev-frontend.sh` | install and run Vite on :5173 in API mode |
| `demo-reset.sh` | **Development only.** Clear rehearsal accounts, reload labelled sample data + demo owner + demo admin, clear history and logos |
| `e2e_demo.py` | The full demo scenario (17 checks), dead-link crawl, responsive sweep, no-external-requests check |
| `a11y_audit.py` | axe-core WCAG audit across 66 page×size combinations + keyboard/focus checks |
| `e2e_phase1.py` | Demo-mode (no backend) smoke test |
| `e2e_phase2.py` | Backend integration: sessions, ownership/IDOR, drafts, transitions |
| `e2e_phase3.py` | Security assistant, history, rate limiting, uploads, `pg_dump` privacy scan |

Browser scripts need `pip install playwright && playwright install chromium`, Django on :8000 (seeded with `seed_demo --with-admin`) and the API-mode frontend (`VITE_DATA_MODE=api VITE_SHOW_SAMPLE_LOGIN=true npm run build && npm run preview -- --port 4180`). Set `BASE` to override the address.
