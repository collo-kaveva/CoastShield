"""Automated WCAG 2.1 A/AA audit with axe-core in a real browser, across screens and viewport sizes.
Needs the API-mode stack running (see README) and a database seeded with: python manage.py seed_demo --with-admin"""
import json, os, sys
from playwright.sync_api import sync_playwright

B = os.environ.get("BASE", "http://localhost:4180")
AXE = os.path.join(os.path.dirname(__file__), "..", "frontend", "node_modules", "axe-core", "axe.min.js")
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"]
SIZES = {"mobile": (390, 844), "tablet": (768, 1024), "desktop": (1280, 900)}
PUBLIC = ["/", "/discover", "/discover?category=FISH_SEAFOOD", "/store/bandari-fresh-fish", "/store/mama-fatuma-fresh-catch", "/track", "/login", "/register", "/forgot-password", "/about", "/privacy", "/contact", "/does-not-exist"]
OWNER = ["/dashboard", "/business", "/business/catalog", "/orders", "/security", "/security/checklist", "/security/incidents", "/settings"]
ADMIN = ["/admin"]

def audit(pg, label, found):
    pg.add_script_tag(path=AXE)
    res = pg.evaluate("async (tags)=>await axe.run(document,{runOnly:{type:'tag',values:tags}})", TAGS)
    for v in res["violations"]:
        for n in v["nodes"][:3]:
            found.append({"where": label, "rule": v["id"], "impact": v["impact"], "help": v["help"], "target": n["target"][0] if n["target"] else "", "html": n["html"][:120]})
    return len(res["violations"]), len(res["passes"])

found, pages = [], 0
with sync_playwright() as p:
    b = p.chromium.launch()
    for sname, (w, h) in SIZES.items():
        def run(paths, ctx_pg):
            global pages
            for path in paths:
                ctx_pg.goto(B + path); ctx_pg.wait_for_timeout(700); pages += 1
                audit(ctx_pg, f"{sname}:{path}", found)
        anon = b.new_context(viewport={"width": w, "height": h}).new_page(); run(PUBLIC, anon)
        o = b.new_context(viewport={"width": w, "height": h}).new_page(); o.goto(B + "/login"); o.get_by_label("Email address").fill("fatuma@example.com"); o.get_by_label("Password", exact=True).fill("demo-password"); o.get_by_role("button", name="Sign in").click(); o.wait_for_url("**/dashboard")
        run(OWNER, o)
        a = b.new_context(viewport={"width": w, "height": h}).new_page(); a.goto(B + "/login"); a.get_by_label("Email address").fill("admin@example.com"); a.get_by_label("Password", exact=True).fill("demo-admin-password"); a.get_by_role("button", name="Sign in").click(); a.wait_for_url("**/admin")
        run(ADMIN, a)
    b.close()
by = {}
for f in found: by.setdefault((f["rule"], f["impact"], f["help"]), []).append(f)
print(f"pages audited: {pages}; distinct violations: {len(by)}; total nodes: {len(found)}")
for (rule, impact, help_), items in sorted(by.items(), key=lambda kv: -len(kv[1])):
    print(f"\n[{impact}] {rule}: {help_}  ({len(items)} nodes)")
    for it in items[:3]: print("   ", it["where"], it["target"], "|", it["html"])
json.dump(found, open("/tmp/a11y.json", "w"), indent=1)

# ---- Keyboard and focus behaviour (things axe cannot judge) ----
kb_fail = []
def kb(ok, name):
    print(("OK:   " if ok else "FAIL: ") + name)
    if not ok: kb_fail.append(name)

with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_context(viewport={"width": 1280, "height": 900}).new_page()
    pg.goto(B + "/"); pg.wait_for_timeout(600); pg.keyboard.press("Tab")
    skip = pg.evaluate("(()=>{const a=document.activeElement;const r=a.getBoundingClientRect();return {text:a.textContent.trim(),visible:r.width>0&&r.height>0&&getComputedStyle(a).visibility!=='hidden'}})()")
    kb(skip["text"] == "Skip to content" and skip["visible"], "first Tab stops on a visible 'Skip to content' link")
    # visible focus indicator on every kind of control
    for sel, label in [("a[href='/login']", "link"), ("button", "button")]:
        pg.locator(sel).first.focus()
        w = pg.evaluate("(()=>{const s=getComputedStyle(document.activeElement);return parseFloat(s.outlineWidth)>0&&s.outlineStyle!=='none'})()")
        kb(w, f"{label} shows a visible focus outline")
    # keyboard-only ordering on a storefront; dialog traps focus, Escape closes, focus returns to the trigger
    pg.goto(B + "/store/mama-fatuma-fresh-catch"); pg.wait_for_timeout(500)
    add = pg.get_by_role("button", name="Add Fresh tilapia (per kg) to request"); add.focus(); pg.keyboard.press("Enter")
    kb(pg.get_by_text("1 item selected").count() == 1, "item can be added with the keyboard (Enter)")
    send = pg.get_by_role("button", name="Send order request"); send.focus(); pg.keyboard.press("Enter"); pg.wait_for_timeout(300)
    inside = pg.evaluate("document.activeElement.closest('dialog') !== null")
    kb(inside, "opening the dialog moves focus inside it")
    for _ in range(12): pg.keyboard.press("Tab")
    kb(pg.evaluate("document.activeElement.closest('dialog') !== null"), "Tab cannot leave the open dialog (focus trap)")
    pg.keyboard.press("Escape"); pg.wait_for_timeout(300)
    kb(pg.locator("dialog[open]").count() == 0, "Escape closes the dialog")
    kb(pg.evaluate("document.activeElement.textContent.includes('Send order request')"), "focus returns to the button that opened the dialog")
    # form errors are announced and tied to their fields
    pg.get_by_role("button", name="Send order request").click(); pg.get_by_role("button", name="Send request").click(); pg.wait_for_timeout(300)
    field = pg.get_by_label("Your name")
    kb(field.get_attribute("aria-invalid") == "true" and bool(field.get_attribute("aria-describedby")), "invalid field is marked aria-invalid and linked to its error text")
    kb(pg.get_by_role("alert").count() >= 1, "validation errors use role=alert")
    # reduced motion is honoured
    ctx = b.new_context(reduced_motion="reduce"); rp = ctx.new_page(); rp.goto(B + "/")
    kb(rp.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == "auto", "prefers-reduced-motion disables smooth scrolling")
    # page language and landmarks
    kb(pg.evaluate("document.documentElement.lang") == "en", "document language is declared")
    kb(pg.evaluate("document.querySelectorAll('main').length") == 1, "exactly one <main> landmark")
    b.close()
sys.exit(1 if (found or kb_fail) else 0)
