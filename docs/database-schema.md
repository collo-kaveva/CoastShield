# Database Schema (planned)

| Entity | Key fields | Notes |
|---|---|---|
| User | email (unique), password hash, role (OWNER/ADMIN), is_active | Customers are **not** accounts in the MVP |
| BusinessProfile | owner FK, name, category, description, county, town, public_address, public contact fields + per-field visibility, hours (JSON), logo, status (DRAFT/PUBLISHED), slug (unique), show_prices | Index on slug, status |
| CatalogItem | business FK, name, description, price (nullable), category, image, is_available, track_stock, quantity | CHECK price ≥ 0, quantity ≥ 0 |
| OrderRequest | business FK, reference (unique), customer_name, customer_contact, notes, status, payment_status, timestamps | Status/payment settable by owner only |
| OrderItem | order FK, item FK (SET_NULL), name_snapshot, unit_price_snapshot, quantity | Preserves history |
| SecurityAnalysis | user FK, kind, risk, indicators (JSON), **redacted** excerpt or hash only | Minimal retention; raw message not stored by default |
| SecurityChecklistItem | key (unique), title, description, order | Seeded reference data |
| UserChecklistProgress | user FK, item FK, completed_at | Unique (user, item) |
| AuditEvent | actor FK (nullable), action, target_type, target_id, metadata (JSON, no secrets), ip_hash, created_at | Append-only |

## Deletion policy
- Deleting a business: `PROTECT` while orders exist (unpublish/archive instead).
- Deleting a catalog item: orders keep snapshots; FK becomes NULL.
- Audit events are never cascade-deleted.

## Consolidation notes
`SecurityChecklistItem` and `UserChecklistProgress` are kept separate so progress is per account while checklist content is shared.
