# Security Model

## Principles
Backend-enforced authorization; server-side validation; data minimization; no payment credentials ever.

## Controls (planned)
- Object-level permissions: every owner queryset filtered by `owner=request.user`
- Session auth with CSRF, `HttpOnly`, `SameSite=Lax`, `Secure` in production
- Django password hashing and validators; generic login errors
- Throttling on login, public order submission, analysis endpoints
- Uploads: size cap, Pillow-verified images, re-encoded, random filenames
- Order integrity: customers cannot set status or payment; payment is owner-recorded only and never inferred from messages or screenshots
- URL analysis is **static string analysis only**. The server never fetches submitted URLs, so no SSRF surface exists. If reputation lookups are added later: separate optional service, allow-list schemes, block private/loopback/link-local/metadata IPs after DNS resolution, no redirect following, timeouts.
- Audit log: no credentials, tokens, or full message text
- Admin: no automatic access to customer contact data or analysis content

## Known limitations (to be kept current)
- Rule-based detection is preliminary and will miss threats and produce false positives
- No real payment verification
- Customer order lookup is lightweight (reference + contact check), not an account system
- Local file storage for uploads is not production-grade
