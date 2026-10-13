# scripts/

| Script | Purpose |
|---|---|
| `setup-db.sh` | Create the PostgreSQL role and database from `.env` |
| `dev-backend.sh` | venv, install, migrate, run Django on :8000 |
| `dev-frontend.sh` | install and run Vite on :5173 in API mode |
| `e2e_phase1.py` | Browser smoke test of the demo-mode frontend |
| `e2e_phase3.py` | Browser integration test for the security assistant, history, rate limiting and logo upload (also scans a `pg_dump` to prove checked text is not stored) |
| `e2e_phase2.py` | Browser integration test against the Django backend (separate owner/customer/second-owner sessions) |
Both E2E scripts need `pip install playwright && playwright install chromium`.
