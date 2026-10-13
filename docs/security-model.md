# Security Model

> **Status: design document.** Client-side demo behaviour is described in `docs/architecture.md`; backend controls below are planned for Phases 2-3.

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


## Implemented in Phase 2 (verified by tests)
- **Authentication:** Django sessions and password hashing; Django password validators; generic login failure; password-reset endpoint cannot reveal accounts.
- **CSRF:** enforced on login/register for everyone and on all authenticated writes (tested with checks enabled); CORS limited to configured origins.
- **Authorization:** every owner query is scoped by ownership at the queryset level, so another owner's resources return 404. No business, owner or user id is accepted from a client. Admin role is separate from Django's `is_staff`.
- **Public/private separation:** one projection function for anonymous visitors; contact details only if opted in; exact stock hidden; drafts and non-existent storefronts return identical 404s.
- **Order integrity:** client sends only item ids and quantities; names, prices, status and payment are set server-side; owner-only transitions with row locking; duplicates blocked; payment is a manual owner record.
- **Rate limits:** login, register, public order submission, order lookup, security analysis (per user) and uploads (all tested).
- **Audit:** auth success/failure (identifier stored only as a keyed hash), publish/unpublish, order creation/status/payment, checklist changes. Read access is ADMIN-only. No credentials, tokens, customer data or message text.
- **Errors:** structured, no stack traces; unexpected errors log only the exception type.

## Implemented in Phase 3 (verified by tests)
- **Explainable analysis in a separate Python module** (`apps/cybersecurity/services/`, no Django imports). Each result lists the indicators found with explanations, a LOW/CAUTION/HIGH level, safe next steps and a disclaimer. One indicator alone can never produce HIGH. The UI labels results "automated warning signs, not confirmed findings".
- **Two engines, one corpus:** `shared/security_cases.json` (59 cases) is run against the Python engine and the TypeScript reference; both must return identical risk and indicator ids.
- **No SSRF surface:** submitted URLs are parsed as text only. They are never resolved, connected to or redirected; tests replace every socket/DNS function with one that fails and submit metadata, localhost, private, IPv6 and integer-encoded addresses. Browser-style IP normalisation (`2130706433`, `0x7f.1`) is replicated so these are recognised. *If a reputation provider is added later it must be a separate optional service with timeouts, allow-listed schemes, blocked private/loopback/link-local/metadata destinations after DNS resolution, no redirects, privacy disclosure and server-side secrets.*
- **Input hardening:** type, length, null-byte and empty checks; non-JSON and wrong content types refused; request bodies over 2 MB return 413 (found and fixed: this previously returned 500); worst-case inputs verified fast (guards against regex backtracking).
- **Data minimisation:** the text is analysed in memory and discarded. The database stores only kind, risk, rule labels and a keyed hash. Tests sweep every text column of the database, and the E2E scans a full `pg_dump`, for a unique sentinel from the checked text: it is never found, nor in audit events or logs. History is capped, auto-pruned after 90 days, and user-deletable.
- **Uploads (logo):** content is decoded rather than trusting name, extension or declared type; only JPEG/PNG/WebP; size and pixel limits (decompression bombs refused); metadata (e.g. GPS) stripped and polyglot/trailing payloads destroyed by re-encoding to PNG; random server-side filename; replace/delete remove old files; owner-scoped; throttled.
- **Audit:** analysis runs (kind and risk only), history clears, logo changes.

## Known limitations and remaining risks (Phase 3)
- The rules are a **preliminary aid**: they miss threats (e.g. well-written scams, other languages, voice calls) and can flag genuine messages. The brand list is short. Nothing here verifies mobile-money payments or senders.
- Per-user analysis throttling uses the same per-process cache as other limits (see below).
- Uploaded logos are guessable only by their random names but are not access-controlled once the URL is known (even for an unpublished business); the production web server must serve them with `nosniff`.
- The incident guidance is general advice; it does not contain provider phone numbers by design.
- The shared corpus guarantees parity on 59 cases, not on all possible inputs.

## Known limitations and remaining risks (Phase 2)
- **Throttling uses Django's in-process cache.** With several server processes limits are per-process; production needs a shared cache (Redis/DB). IP detection uses `REMOTE_ADDR`, which behind a reverse proxy would be the proxy's address unless configured.
- **No email delivery:** password reset does nothing yet; there is no email verification.
- **No account lockout** beyond the IP-based throttle.
- **No frontend admin screen:** admins use the read-only Django admin or the `/audit/events/` API. The spec's "restricted administrative interface" is only partly met.
- **Production flags** (HTTPS redirect, HSTS, secure cookies) are configured but only active when `DJANGO_DEBUG=False`; this was checked with `check --deploy` warnings only in DEBUG mode and not tested behind real TLS.
- Dependencies are range-pinned, not locked, and have not been audited for vulnerabilities.
