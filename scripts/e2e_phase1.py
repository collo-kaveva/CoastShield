"""Real-browser smoke test for Phase 1 (demo mode). Requires: pip install playwright && playwright install chromium,
and the app served at BASE (default: npm run preview on :4173)."""
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get("BASE", "http://localhost:4173")
OUT = os.environ.get("OUT", "/tmp")

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={"width": 390, "height": 844}, accept_downloads=True).new_page()
    errs = []
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.on("pageerror", lambda e: errs.append(str(e)))
    ok = lambda n: print("OK:", n, flush=True)

    pg.goto(B + "/register"); pg.get_by_label("Your name").fill("Asha Mwinyi"); pg.get_by_label("Email address").fill("asha@example.com")
    pg.get_by_label("Password", exact=True).fill("password123"); pg.get_by_label("I understand this is a demo and agree to the privacy notice").check()
    pg.get_by_role("button", name="Create account").click(); pg.wait_for_url("**/onboarding"); ok("register -> onboarding")

    pg.get_by_label("Business name").fill("Asha's Fresh Fish"); pg.get_by_role("radio", name="Fish & seafood").click(); pg.get_by_role("button", name="Continue").click()
    pg.get_by_label("Town or area").fill("Nyali"); pg.get_by_label("Short description").fill("Fresh fish, cleaned and ready to cook."); pg.get_by_role("button", name="Continue").click()
    pg.get_by_label("Phone", exact=True).fill("0700 555 666"); pg.get_by_role("button", name="Continue").click()
    pg.get_by_label("Name", exact=True).fill("Tilapia (per kg)"); pg.get_by_label("Price (KES)").fill("450"); pg.get_by_role("button", name="Add", exact=True).click()
    pg.get_by_role("button", name="Continue").click(); pg.get_by_role("button", name="Publish storefront").click(); pg.wait_for_url("**/dashboard"); ok("onboarding -> published")
    slug = "asha-s-fresh-fish"

    with pg.expect_download(timeout=8000) as d: pg.get_by_role("button", name="Download").click()
    ok("QR PNG download: " + d.value.suggested_filename)

    # Customer: new anonymous browser context, sharing the demo "database" by copying localStorage
    state = pg.evaluate("localStorage.getItem('coastshield.demo.v1')")
    c = b.new_context(viewport={"width": 390, "height": 844}).new_page()
    owner_session = pg.evaluate("JSON.parse(localStorage.getItem('coastshield.demo.v1')).sessionUserId")
    anon = pg.evaluate("(s)=>{const o=JSON.parse(s);o.sessionUserId=null;return JSON.stringify(o)}", state)  # customer is NOT signed in
    c.goto(B + "/"); c.evaluate("(s)=>localStorage.setItem('coastshield.demo.v1', s)", anon)
    c.goto(B + f"/store/{slug}"); c.get_by_role("button", name="Add Tilapia (per kg) to request").click()
    c.get_by_role("button", name="Send order request").click()
    c.get_by_label("Your name").fill("Test Customer"); c.get_by_label("Phone number or email").fill("0700 123 456")
    c.get_by_role("button", name="Send request").click(); ref = c.get_by_test_id("order-reference").inner_text(); ok("customer got reference " + ref)
    c.goto(B + "/orders"); c.wait_for_url("**/login"); ok("anonymous /orders redirected to /login")

    back = c.evaluate("(sid)=>{return null}", None) or c.evaluate("localStorage.getItem('coastshield.demo.v1')")
    back = pg.evaluate("([s,sid])=>{const o=JSON.parse(s);o.sessionUserId=sid;return JSON.stringify(o)}", [back, owner_session])
    pg.evaluate("(s)=>localStorage.setItem('coastshield.demo.v1', s)", back)
    pg.goto(B + "/orders"); pg.get_by_text(ref).click(); pg.get_by_role("button", name="Accept request").click()
    pg.get_by_role("button", name="Mark as ready").wait_for(); ok("owner accepted request")

    pg.goto(B + "/security"); pg.get_by_role("button", name="“Sent by mistake” payment").click(); pg.get_by_role("button", name="Analyze message").click()
    pg.get_by_text("Warning signs found").wait_for(); ok("message analysed: " + pg.locator("section[aria-label='Analysis result'] p").first.inner_text())

    bad = []
    for path in ["/", "/login", "/register", "/discover", "/dashboard", "/business", "/business/catalog", "/orders", "/security", "/security/checklist", "/security/incidents", "/settings", f"/store/{slug}"]:
        pg.goto(B + path); pg.wait_for_timeout(500)
        ov = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        if ov > 1: bad.append((path, ov))
    print("overflow offenders at 390px:", bad); print("console errors:", errs, flush=True)

    pg.goto(B + "/security"); pg.get_by_role("button", name="“Sent by mistake” payment").click(); pg.get_by_role("button", name="Analyze message").click(); pg.get_by_text("Warning signs found").wait_for()
    pg.screenshot(path=f"{OUT}/sec-mobile.png", full_page=True)
    pg.goto(B + f"/store/{slug}"); pg.wait_for_timeout(400); pg.screenshot(path=f"{OUT}/store-mobile.png")
    b.close()
    sys.exit(1 if (bad or errs) else 0)
