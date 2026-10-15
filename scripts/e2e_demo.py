"""The hackathon demo scenario, end to end, against the real backend, in separate browser sessions.
Also verifies: no external network requests, no dead internal links, admin sees no private data.
Prereqs: Django :8000 (seeded with --with-admin), API-mode frontend on BASE (default :4180)."""
import os, sys, time
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

B = os.environ.get("BASE", "http://localhost:4180")
PW = "S0me-Strong-Pass!"
CUSTOMER_NAME, CUSTOMER_PHONE = "Zuhura Demo Customer", "0711 222 333"
SCAM = "Confirmed. Ksh 4,500.00 has been sent to your M-PESA by mistake. Please send it back to 0700 000 123 urgently. DEMOSENTINEL"
ok = lambda n: print("OK:", n, flush=True)
fail = []
def check(c, n):
    if c: ok(n)
    else: print("FAIL:", n, flush=True); fail.append(n)

t0 = time.time(); hosts = set(); errs = []
with sync_playwright() as p:
    b = p.chromium.launch()
    def page(w=390, h=844):
        pg = b.new_context(viewport={"width": w, "height": h}, accept_downloads=True).new_page()
        pg.on("request", lambda r: hosts.add(urlparse(r.url).netloc) if urlparse(r.url).scheme in ("http", "https") else None)
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "status of 4" not in m.text else None)
        pg.on("pageerror", lambda e: errs.append(str(e))); return pg

    # 1-3 Owner registers, creates and publishes a coastal business with products; QR code
    o = page(); o.goto(B + "/"); o.get_by_role("link", name="Get Started Free").first.click(); o.wait_for_url("**/register")
    o.get_by_label("Your name").fill("Asha Mwinyi"); o.get_by_label("Email address").fill("asha.demo@example.com"); o.get_by_label("Password", exact=True).fill(PW)
    o.get_by_label("I understand this is a demo and agree to the privacy notice").check(); o.get_by_role("button", name="Create account").click(); o.wait_for_url("**/onboarding")
    o.get_by_label("Business name").fill("Asha's Fresh Fish"); o.get_by_role("radio", name="Fish & seafood").click(); o.get_by_role("button", name="Continue").click()
    o.get_by_label("Town or area").fill("Nyali"); o.get_by_label("Short description").fill("Fresh fish, cleaned and ready to cook."); o.get_by_role("button", name="Continue").click()
    o.get_by_label("Phone", exact=True).fill("0700 555 666"); o.get_by_role("button", name="Continue").click()
    for name, price in [("Tilapia (per kg)", "450"), ("Prawns (per kg)", "1400")]:
        o.get_by_label("Name", exact=True).fill(name); o.get_by_label("Price (KES)").fill(price); o.get_by_role("button", name="Add", exact=True).click()
    o.get_by_role("button", name="Continue").click(); o.get_by_role("button", name="Publish storefront").click(); o.wait_for_url("**/dashboard")
    o.get_by_role("button", name="Unpublish").wait_for(); check(o.get_by_role("button", name="Unpublish").is_visible(), "1-2. owner created a coastal business with 2 products and published it")
    with o.expect_download(timeout=8000) as d: o.get_by_role("button", name="Download").click()
    check(d.value.suggested_filename.endswith(".png") and o.locator("svg[role=img], svg title").count() >= 1, "3. QR code displayed and downloaded")
    slug = "ashas-fresh-fish"

    # 4. Customer (anonymous, separate session) submits an order request, then tracks it
    c = page(); c.goto(B + f"/store/{slug}"); c.get_by_role("button", name="Add Tilapia (per kg) to request").click(); c.get_by_role("button", name="Add Prawns (per kg) to request").click()
    c.get_by_role("button", name="Send order request").click(); c.get_by_label("Your name").fill(CUSTOMER_NAME); c.get_by_label("Phone number or email").fill(CUSTOMER_PHONE)
    c.get_by_role("button", name="Send request").click(); ref = c.get_by_test_id("order-reference").inner_text()
    check(ref.startswith("CS-"), f"4. customer received reference {ref}")
    def track(status):
        c.goto(B + f"/track?ref={ref}"); c.get_by_label("Phone number or email").fill(CUSTOMER_PHONE); c.get_by_role("button", name="Check status").click()
        c.get_by_role("region", name="Request status").wait_for(); return c.get_by_role("region", name="Request status").inner_text()
    t = track("New"); check("New" in t and CUSTOMER_PHONE not in t and CUSTOMER_NAME not in t, "4b. customer can track status; no private details echoed")
    c.goto(B + "/track"); c.get_by_label("Reference").fill(ref); c.get_by_label("Phone number or email").fill("0799 000 000"); c.get_by_role("button", name="Check status").click()
    c.get_by_text("No matching request found").wait_for(); ok("4c. wrong contact reveals nothing")

    # 5-6. Owner accepts, updates status, records payment manually
    o.goto(B + "/orders"); o.get_by_text(ref).click(); o.get_by_role("button", name="Accept request").click(); o.get_by_role("button", name="Mark as ready").wait_for()
    check("Accepted" in track("Accepted"), "5. owner accepted; customer sees Accepted")
    o.get_by_role("button", name="Mark as ready").click(); o.get_by_role("button", name="Mark completed").wait_for()
    o.get_by_role("button", name="Record as paid").click(); o.get_by_role("button", name="Yes, I checked my account").click(); o.get_by_text("Recorded as paid").wait_for()
    o.get_by_role("button", name="Mark completed").click(); o.get_by_text("This request is closed").wait_for()
    check("Completed" in track("Completed"), "6. owner readied, recorded payment manually, completed; customer sees Completed")

    # 7. Suspicious payment message
    o.goto(B + "/security"); o.get_by_role("textbox").fill(SCAM); o.get_by_role("button", name="Analyze message").click(); o.get_by_text("Warning signs found").wait_for()
    txt = o.locator("section[aria-label='Analysis result']").inner_text()
    check("High warning level" in txt and "Asks you to send money back" in txt and "Pressure to act immediately" in txt and "preliminary" in txt.lower(), "7. suspicious message: HIGH, specific indicators, safe steps, disclaimer")
    check("Do not send money back" in txt and "not confirmed findings" in txt, "7b. safe recommendations and 'not confirmed' labelling shown")

    # 8. Admin sees events but no private data
    a = page(); a.goto(B + "/login"); a.get_by_label("Email address").fill("admin@example.com"); a.get_by_label("Password", exact=True).fill("demo-admin-password"); a.get_by_role("button", name="Sign in").click(); a.wait_for_url("**/admin")
    a.locator("tbody").get_by_text("ORDER_STATUS_CHANGED").first.wait_for(); body = a.locator("main").inner_text()
    check(all(k in body for k in ("ORDER_STATUS_CHANGED", "LOGIN_SUCCESS", "ORDER_PAYMENT_RECORDED", "ANALYSIS_RUN")), "8. admin sees security events (status changes, logins, payment record, analysis)")
    check(not any(s in body for s in (CUSTOMER_NAME, CUSTOMER_PHONE, "DEMOSENTINEL", "0700 000 123", "asha.demo@example.com", PW)), "8b. admin view contains no customer details, message text, emails or passwords")
    a.get_by_label("Filter by event type").select_option("ORDER_STATUS_CHANGED"); a.wait_for_timeout(600)
    check(a.locator("tbody tr").count() >= 3 and "LOGIN_SUCCESS" not in a.locator("tbody").inner_text(), "8c. admin filter works")
    ow = page(); ow.goto(B + "/login"); ow.get_by_label("Email address").fill("asha.demo@example.com"); ow.get_by_label("Password", exact=True).fill(PW); ow.get_by_role("button", name="Sign in").click(); ow.wait_for_url("**/dashboard")
    ow.goto(B + "/admin"); ow.wait_for_url("**/dashboard"); ok("8d. an owner cannot open the admin screen")

    # 9. Dead-link crawl from key pages (signed-in owner, anonymous)
    seen, dead = set(), []
    def crawl(pg, starts):
        queue = list(starts)
        while queue and len(seen) < 60:
            path = queue.pop(0)
            if path in seen: continue
            seen.add(path); pg.goto(B + path); pg.wait_for_timeout(350)
            if pg.get_by_role("heading", name="Page not found").count(): dead.append(path)
            for h in pg.eval_on_selector_all("a[href^='/']", "els=>els.map(e=>e.getAttribute('href'))"):
                h = h.split("#")[0]
                if h and h not in seen and not h.startswith(("/api", "/media")) and h not in queue: queue.append(h)
    crawl(ow, ["/dashboard", "/business", "/business/catalog", "/orders", "/security", "/security/checklist", "/security/incidents", "/settings"])
    crawl(c, ["/", "/discover", f"/store/{slug}", "/track", "/about", "/privacy", "/contact", "/login", "/register"])
    check(not dead, f"9. no dead internal links across {len(seen)} pages {dead}")

    # 10. Responsive: tablet and desktop sweeps
    bad = []
    for label, (w, h) in {"tablet": (768, 1024), "desktop": (1280, 900)}.items():
        r = page(w, h); r.goto(B + "/login"); r.get_by_label("Email address").fill("asha.demo@example.com"); r.get_by_label("Password", exact=True).fill(PW); r.get_by_role("button", name="Sign in").click(); r.wait_for_url("**/dashboard")
        for path in ["/", "/dashboard", "/business", "/business/catalog", "/orders", "/security", "/settings", f"/store/{slug}", "/track", "/discover"]:
            r.goto(B + path); r.wait_for_timeout(350)
            if r.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 1: bad.append(f"{label}:{path}")
    check(not bad, f"10. no horizontal overflow at tablet and desktop sizes {bad}")

    # 11. Independence from external services
    external = sorted(h for h in hosts if h and h != urlparse(B).netloc)
    check(not external, f"11. every request stayed on the app's own origin {external}")
    check(not errs, f"12. no unexpected console errors {errs[:3]}")
    b.close()
print(f"demo scenario finished in {time.time()-t0:.0f}s; FAILURES: {fail}"); sys.exit(1 if fail else 0)
