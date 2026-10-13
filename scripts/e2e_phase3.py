"""Real-browser integration test for Phase 3 against Django + PostgreSQL (frontend built with VITE_DATA_MODE=api).
Env: BASE (default http://localhost:4180), PGPASSWORD/DB settings for the database sweep."""
import io, os, subprocess, sys, tempfile
from PIL import Image
from playwright.sync_api import sync_playwright

B = os.environ.get("BASE", "http://localhost:4180")
PW = "S0me-Strong-Pass!"
SENTINEL = "ZZE2ESENTINELZZ"
ok = lambda n: print("OK:", n, flush=True)
fail = []
def check(c, n):
    if c: ok(n)
    else: print("FAIL:", n, flush=True); fail.append(n)

def dump_has(text):
    env = {**os.environ, "PGPASSWORD": os.environ.get("DB_PASSWORD", "dev-only-password")}
    out = subprocess.run(["pg_dump", "-h", "localhost", "-U", "coastshield", "coastshield", "--data-only"], capture_output=True, text=True, env=env, timeout=60).stdout
    return text.lower() in out.lower(), len(out)

tmp = tempfile.mkdtemp()
good = os.path.join(tmp, "my logo.png"); Image.new("RGB", (900, 700), (20, 120, 110)).save(good)
fake = os.path.join(tmp, "fake.png"); open(fake, "w").write("<?php echo 1; ?> not an image")
svg = os.path.join(tmp, "x.svg"); open(svg, "w").write('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')

with sync_playwright() as p:
    b = p.chromium.launch(); errs = []
    def ctx():
        pg = b.new_context(viewport={"width": 390, "height": 844}).new_page()
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" and "status of 4" not in m.text else None)
        pg.on("pageerror", lambda e: errs.append(str(e))); return pg
    def post_json(pg, path, body):
        return pg.evaluate("""async ([p,b])=>{const ck=(document.cookie.split('; ').find(c=>c.startsWith('csrftoken='))||'').split('=')[1];const r=await fetch('/api/v1'+p,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-CSRFToken':decodeURIComponent(ck||'')},body:JSON.stringify(b)});let j=null;try{j=await r.json()}catch(e){};return {status:r.status,body:j}}""", [path, body])

    # --- Security assistant against the server (sample account) ---
    s = ctx(); reqs = []
    s.on("request", lambda r: reqs.append((r.method, r.url.split("/api/v1")[-1])) if "/api/v1/security" in r.url and r.method != "GET" else None)
    s.goto(B + "/login"); s.get_by_role("button", name="Use sample account").click(); s.wait_for_url("**/dashboard")
    s.goto(B + "/security"); s.get_by_role("textbox").fill(f"URGENT {SENTINEL}: your M-PESA account will be suspended. Verify at http://safaricom-verify-account.xyz/{SENTINEL}")
    s.get_by_role("button", name="Analyze message").click(); s.get_by_text("Warning signs found").wait_for()
    check(("POST", "/security/analyze-message/") in reqs, "message analysis was performed by the SERVER endpoint")
    check(s.get_by_text("not confirmed findings").count() >= 1 and s.get_by_text("Automated indicator").count() >= 2, "UI separates automated indicators from confirmed findings")
    s.get_by_role("tab", name="Check a link").click(); s.get_by_label("Web address to check").fill(f"https://bit.ly/{SENTINEL}"); s.get_by_role("button", name="Check link").click()
    s.get_by_text("Shortened link").first.wait_for(); check(("POST", "/security/check-url/") in reqs, "link check performed by the SERVER endpoint")
    s.reload(); s.get_by_role("region", name="Recent checks").locator("li").first.wait_for()
    n = s.get_by_role("region", name="Recent checks").locator("li").count(); check(n >= 2, f"history persisted server-side across reload ({n} entries)")
    found, size = dump_has(SENTINEL); check(not found, f"checked text appears nowhere in the whole PostgreSQL dump ({size} bytes scanned)")
    s.get_by_role("button", name="Clear history").click(); s.get_by_role("button", name="Clear history").last.click()
    s.get_by_text("No checks yet").wait_for(); s.reload(); s.get_by_text("No checks yet").wait_for(); ok("clear history works and persists")
    s.goto(B + "/security/incidents"); reqs2 = []
    s.get_by_role("heading", level=2).first.wait_for(); check(s.get_by_text("Suspicious payment notification").count() >= 1, "incident guides load from the server")

    # --- Malformed input straight at the API, with a valid session and CSRF ---
    r = post_json(s, "/security/analyze-message/", {"text": "a" * 2001}); check(r["status"] == 422 and "too long" in r["body"]["error"]["message"].lower() or "text" in r["body"]["error"]["fields"], f"2001-char message rejected ({r['status']})")
    r = post_json(s, "/security/analyze-message/", {"text": ["x"]}); check(r["status"] == 422, f"wrong type rejected ({r['status']})")
    r = post_json(s, "/security/check-url/", {"url": "javascript:alert(1)"}); check(r["status"] == 200 and r["body"]["valid"] is False and r["body"]["indicators"][0]["id"] == "unsafe_scheme", "javascript: URL flagged, not executed")
    r = post_json(s, "/security/check-url/", {"url": "http://169.254.169.254/latest/meta-data/"}); check(r["status"] == 200 and r["body"]["risk"] in ("CAUTION", "LOW"), "metadata address inspected as text only (nothing fetched)")

    # --- Rate limiting (separate user so the sample account is unaffected) ---
    rl = ctx(); rl.goto(B + "/register"); rl.get_by_label("Your name").fill("Rate Limit"); rl.get_by_label("Email address").fill("ratelimit@example.com")
    rl.get_by_label("Password", exact=True).fill(PW); rl.get_by_label("I understand this is a demo and agree to the privacy notice").check(); rl.get_by_role("button", name="Create account").click(); rl.wait_for_url("**/onboarding")
    codes = [post_json(rl, "/security/analyze-message/", {"text": f"hello {i}"})["status"] for i in range(23)]
    check(codes[:20] == [200] * 20 and 429 in codes[20:], f"analysis rate limit enforced (statuses after 20: {codes[20:]})")
    rl.goto(B + "/security"); rl.get_by_role("textbox").fill("hello again"); rl.get_by_role("button", name="Analyze message").click()
    rl.get_by_text("Too many attempts").wait_for(); ok("UI shows a friendly message when throttled")

    # --- Logo upload ---
    o = ctx(); o.goto(B + "/register"); o.get_by_label("Your name").fill("Asha Mwinyi"); o.get_by_label("Email address").fill("asha@example.com")
    o.get_by_label("Password", exact=True).fill(PW); o.get_by_label("I understand this is a demo and agree to the privacy notice").check(); o.get_by_role("button", name="Create account").click(); o.wait_for_url("**/onboarding")
    o.get_by_label("Business name").fill("Asha's Fish"); o.get_by_role("radio", name="Fish & seafood").click(); o.get_by_role("button", name="Continue").click()
    o.get_by_label("Town or area").fill("Nyali"); o.get_by_label("Short description").fill("Fresh fish, cleaned and ready to cook."); o.get_by_role("button", name="Continue").click()
    o.get_by_label("Phone", exact=True).fill("0700 555 666"); o.get_by_role("button", name="Continue").click(); o.get_by_role("button", name="Continue").click()
    o.get_by_role("button", name="Publish storefront").click(); o.wait_for_url("**/dashboard")
    o.goto(B + "/business"); inp = o.get_by_label("Choose a logo image")
    for bad, label in [(fake, "text disguised as .png"), (svg, "SVG with script")]:
        inp.set_input_files(bad); o.get_by_text("not a valid image").or_(o.get_by_text("Use a JPEG, PNG or WebP")).first.wait_for(); ok(f"rejected: {label}")
        o.wait_for_timeout(300)
    inp.set_input_files(good); o.get_by_alt_text("Your current logo").wait_for(); ok("valid logo accepted and shown in the editor")
    src = o.get_by_alt_text("Your current logo").get_attribute("src"); check(src.startswith("/media/logos/") and src.endswith(".png") and "my" not in src.split("/")[-1], f"stored under a random server-side name ({src})")
    anon = ctx(); anon.goto(B + "/store/ashas-fish"); anon.get_by_alt_text("Asha's Fish logo").wait_for(); ok("logo visible on the public storefront")
    resp = anon.request.get(B + src); check(resp.status == 200 and resp.headers.get("content-type") == "image/png" and resp.body()[:4] == b"\x89PNG", "served as a real PNG")
    im = Image.open(io.BytesIO(resp.body())); check(max(im.size) <= 512, f"resized to {im.size}")

    # --- Sweep ---
    bad = []
    for path in ["/security", "/security/checklist", "/security/incidents", "/business", "/dashboard", "/orders", "/settings"]:
        o.goto(B + path); o.wait_for_timeout(500)
        if o.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") > 1: bad.append(path)
    check(not bad, f"no horizontal overflow at 390px ({bad})"); check(not errs, f"no unexpected console errors {errs[:3]}")
    o.goto(B + "/business"); o.get_by_alt_text("Your current logo").wait_for(); o.screenshot(path="/tmp/p3-business.png", full_page=True)
    s.goto(B + "/security"); s.get_by_role("textbox").fill("Congratulations! You have won KES 250,000. Pay KES 1,500 fee to claim your prize: 0700 000 456."); s.get_by_role("button", name="Analyze message").click(); s.get_by_text("Warning signs found").wait_for(); s.screenshot(path="/tmp/p3-security.png", full_page=True)
    b.close()
print("FAILURES:", fail); sys.exit(1 if fail else 0)
