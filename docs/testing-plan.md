# Testing Plan

Backend: pytest + pytest-django. Frontend: Vitest + Testing Library.

| Area | Cases |
|---|---|
| Auth | register, login, bad credentials, logout, no secrets in responses |
| Authorization | owner A cannot read/edit owner B's business, items, orders, checklist, analyses (IDOR) |
| Visibility | draft storefront 404 to anonymous; unpublished hides items |
| Catalog | negative price, bad quantity, hidden prices |
| Orders | invalid qty, unavailable item, foreign item ID, customer cannot set status/payment, valid and invalid transitions, duplicate submit |
| Cyber rules | phishing sample, benign sample, mixed, empty, huge input, unicode |
| URLs | IP host, brand-in-subdomain, shortener, `javascript:` scheme, malformed |
| Checklist | progress isolated between users |
| Audit | non-admin cannot list others' events; no sensitive fields logged |
| E2E | register → business → item → publish → QR → order → accept → analyze message |

Results are recorded in the README only after real runs.
