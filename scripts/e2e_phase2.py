"""Real-browser integration test against the Django backend (VITE_DATA_MODE=api).
Needs: Django on :8000 with a migrated + seeded DB, and the API-mode frontend served at BASE (default :4180).
Owner, customer and a second owner use SEPARATE browser contexts (separate cookies), so this proves server-side isolation."""
import os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get("BASE", "http://localhost:4180")
PW = "S0me-Strong-Pass!"
ok = lambda n: print("OK:", n, flush=True)
fail = []

def check(cond, name):
    (ok if cond else lambda n: (print("FAIL:", n, flush=True), fail.append(n)))(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    def ctx(w=390, h=844):
        c = b.new_context(viewport={"width": w, "height": h}, accept_downloads=True); pg = c.new_page()
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "status of 4" not in m.text else None)
        pg.on("pageerror", lambda e: errs.append(str(e))); return pg
    api = lambda pg, method, path, body=None: pg.evaluate("""async ([m,p,b])=>{const ck=(document.cookie.split('; ').find(c=>c.startsWith('csrftoken='))||'').split('=')[1];const h={'Content-Type':'application/json'};if(m!=='GET'&&ck)h['X-CSRFToken']=decodeURIComponent(ck);const r=await fetch('/api/v1'+p,{method:m,credentials:'include',headers:h,body:b?JSON.stringify(b):undefined});let j=null;try{j=await r.json()}catch(e){};return {status:r.status,body:j}}""", [method, path, body])

    owner = ctx()
    owner.goto(B + "/register"); owner.get_by_label("Your name").fill("Asha Mwinyi"); owner.get_by_label("Email address").fill("asha@example.com")
    owner.get_by_label("Password", exact=True).fill(PW); owner.get_by_label("I understand this is a demo and agree to the privacy notice").check()
    owner.get_by_role("button", name="Create account").click(); owner.wait_for_url("**/onboarding"); ok("register against real backend -> onboarding")
    check(owner.locator("text=Demo mode").count() == 0, "no 'demo mode' banner in API mode")

    owner.get_by_label("Business name").fill("Asha's Fish"); owner.get_by_role("radio", name="Fish & seafood").click(); owner.get_by_role("button", name="Continue").click()
    owner.get_by_label("Town or area").fill("Nyali"); owner.get_by_label("Short description").fill("Fresh fish, cleaned and ready to cook."); owner.get_by_role("button", name="Continue").click()
    owner.get_by_label("Phone", exact=True).fill("0700 555 666"); owner.get_by_role("button", name="Continue").click()
    owner.get_by_label("Name", exact=True).fill("Tilapia (per kg)"); owner.get_by_label("Price (KES)").fill("450"); owner.get_by_role("button", name="Add", exact=True).click()
    owner.get_by_role("button", name="Continue").click(); owner.get_by_role("button", name="Publish storefront").click(); owner.wait_for_url("**/dashboard"); ok("onboarding -> published (persisted in PostgreSQL)")
    slug = "ashas-fish"
    with owner.expect_download(timeout=8000) as d: owner.get_by_role("button", name="Download").click()
    ok("QR download " + d.value.suggested_filename)

    # Anonymous customer: separate cookies
    cust = ctx()
    cust.goto(B + f"/store/{slug}"); cust.get_by_role("button", name="Add Tilapia (per kg) to request").click(); cust.get_by_role("button", name="Send order request").click()
    cust.get_by_label("Your name").fill("Test Customer"); cust.get_by_label("Phone number or email").fill("0700 123 456")
    cust.get_by_role("button", name="Send request").click(); ref = cust.get_by_test_id("order-reference").inner_text(); ok("customer reference " + ref)
    cust.goto(B + "/orders"); cust.wait_for_url("**/login"); ok("anonymous /orders -> /login")
    r = api(cust, "GET", "/orders/"); check(r["status"] == 401, f"anonymous API /orders/ -> {r['status']}")
    r = api(cust, "POST", "/orders/lookup/", {"reference": ref, "contact": "0700 123 456"}); check(r["status"] == 200 and "customerName" not in str(r["body"]), "customer lookup returns status without private data")

    # Owner manages
    owner.goto(B + "/orders"); owner.get_by_text(ref).click(); oid = owner.url.rstrip("/").split("/")[-1]
    owner.get_by_role("button", name="Accept request").click(); owner.get_by_role("button", name="Mark as ready").wait_for(); ok("owner accepted (server enforced transition)")

    # Second owner cannot touch first owner's data (IDOR)
    o2 = ctx(); o2.goto(B + "/register"); o2.get_by_label("Your name").fill("Other Owner"); o2.get_by_label("Email address").fill("other.owner@example.com")
    o2.get_by_label("Password", exact=True).fill(PW); o2.get_by_label("I understand this is a demo and agree to the privacy notice").check(); o2.get_by_role("button", name="Create account").click(); o2.wait_for_url("**/onboarding")
    for m, path, body in [("GET", f"/orders/{oid}/", None), ("POST", f"/orders/{oid}/transition/", {"to": "COMPLETED"}), ("POST", f"/orders/{oid}/payment/", {"status": "PAID"})]:
        r = api(o2, m, path, body); check(r["status"] == 404, f"other owner {m} {path.split('/')[1]} -> {r['status']}")
    check(api(o2, "GET", "/orders/")["body"]["results"] == [], "other owner's order list is empty")
    owner.reload(); owner.get_by_role("button", name="Mark as ready").wait_for(); ok("order unchanged after IDOR attempts")
    # Server rejects an invalid transition even if the UI were bypassed
    r = api(owner, "POST", f"/orders/{oid}/transition/", {"to": "COMPLETED"}); check(r["status"] == 409, f"invalid transition via API -> {r['status']}")

    # Draft privacy: unpublish then customer reloads
    owner.goto(B + "/business"); owner.get_by_role("button", name="Unpublish").first.click(); owner.get_by_text("Draft: only you can see it").wait_for()
    cust.goto(B + f"/store/{slug}"); cust.get_by_role("heading", name="Storefront not available").wait_for(); ok("unpublished storefront hidden from public")

    # Sample account + security
    s = ctx(); s.goto(B + "/login"); s.get_by_role("button", name="Use sample account").click(); s.wait_for_url("**/dashboard"); s.get_by_text("Mama Fatuma's Fresh Catch").first.wait_for(); ok("sample account login against seeded backend")
    s.goto(B + "/security/checklist"); box = s.get_by_label("Turn on two-step verification where it is available"); box.check(); s.wait_for_timeout(500); s.reload()
    check(s.get_by_label("Turn on two-step verification where it is available").is_checked(), "checklist tick persisted server-side across reload")
    s.goto(B + "/security"); s.get_by_role("button", name="“Sent by mistake” payment").click(); s.get_by_role("button", name="Analyze message").click(); s.get_by_text("Warning signs found").wait_for(); ok("message analysis shows indicators")

    # Responsive sweep (signed-in sample account)
    bad = []
    for path in ["/", "/login", "/discover", "/dashboard", "/business", "/business/catalog", "/orders", "/security", "/security/checklist", "/security/incidents", "/settings", "/store/mama-fatuma-fresh-catch"]:
        s.goto(B + path); s.wait_for_timeout(500)
        if s.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 1: bad.append(path)
    check(not bad, f"no horizontal overflow at 390px ({bad})")
    check(not errs, f"no unexpected console errors {errs[:3]}")
    b.close()
print("FAILURES:", fail); sys.exit(1 if fail else 0)
