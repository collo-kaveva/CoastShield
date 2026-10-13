# Database Schema (implemented in Phase 2, PostgreSQL)

All primary keys are UUIDs (not guessable), except small helper tables. Migrations are in each app's `migrations/` and apply cleanly to an empty database.

| Table (model) | Key points |
|---|---|
| `accounts_user` | email unique (lower-cased), `role` OWNER/ADMIN, Django password hash. Customers are not accounts. |
| `businesses_businessprofile` | `owner` **OneToOne**, nullable (null = ownerless flagged sample), unique `slug`, `status` DRAFT/PUBLISHED, `show_phone/show_email/show_prices`, `hours` JSON, `is_sample`. Index (status, category). |
| `businesses_businessprofile.logo` | ImageField (`media/logos/<random>.png`), always a re-encoded PNG. |
| `catalog_catalogitem` | FK business (CASCADE). CHECK price ≥ 0 or null; CHECK quantity not null when `track_stock`. |
| `orders_orderrequest` | FK business (CASCADE), unique `reference`, `status`, `payment_status` (owner-set only). Indexes (business, status), (business, -created_at). |
| `orders_orderitem` | FK order (CASCADE), FK item (**SET_NULL**), `name_snapshot`, `unit_price_snapshot`, `quantity` CHECK 1–99. |
| `orders_orderevent` | status/payment history labels shown to the owner. |
| `cybersecurity_securitychecklistitem` | shared content, seeded by migration (12 items). |
| `cybersecurity_userchecklistprogress` | UNIQUE (user, item). |
| `cybersecurity_securityanalysis` | history of checks: `kind`, `risk`, `indicators` (rule id/label/severity only), keyed HMAC `content_hash`, timestamp. **The checked text and matched snippets are never stored.** Index (user, -created_at). Capped at 100 per user; pruned after `ANALYSIS_RETENTION_DAYS` on every write and by `purge_analyses`. |
| `audit_auditevent` | append-only; actor SET_NULL; metadata scrubbed of sensitive keys; IP stored only as a keyed hash. |

## Changes from the earlier plan
- One business per owner (OneToOne) for the MVP.
- Added `OrderEvent` for history; added `is_sample` and nullable owner for sample storefronts.
- Deletion: deleting an account deletes its business, catalog and orders (privacy-friendly) rather than blocking. Deleting a catalog item keeps order snapshots.
- Admin site registers only `User` (no password hashes) , `BusinessProfile` (no contact fields) and read-only `AuditEvent`. Orders and catalog are intentionally not registered.
