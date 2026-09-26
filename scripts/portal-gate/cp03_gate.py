"""CP03 gate: admin client directory, detail and suspend/reinstate.

Same disposable stack as gate.py (web :3100, api :4100, mint.mjs tokens).
Fixture evidence only. Env: GATE_TOKENS, CHROME, GATE_RESULTS.
"""
import json, os, re, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
T = json.loads(Path(os.environ.get("GATE_TOKENS", HERE / "tokens.json")).read_text())
WEB, API = "http://localhost:3100", "http://localhost:4100/api/v1"
AXE = (HERE.parents[1] / "node_modules" / "axe-core" / "axe.min.js").read_text(encoding="utf-8")
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
CLIENT = T["clientId"]
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "pass": bool(ok), "detail": str(detail)})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail and not ok else ""))


def ctx(browser, cookie=None, width=1280):
    c = browser.new_context(viewport={"width": width, "height": 900})
    if cookie:
        c.add_cookies([{"name": cookie[0], "value": cookie[1], "url": WEB}])
    return c


def go(page, url):
    response = page.goto(url)
    try:
        page.wait_for_load_state("networkidle", timeout=10000)
    except Exception:
        # A lingering background request (prefetch, revalidation) can keep the
        # network busy; the document itself has loaded.
        page.wait_for_load_state("load")
    return response


def axe(page, label):
    page.wait_for_timeout(800)
    page.add_script_tag(content=AXE)
    found = page.evaluate("""async () => (await axe.run({exclude: [['img']]}, {runOnly: ['wcag2a','wcag2aa']})).violations
        .filter(v => ['serious','critical'].includes(v.impact)).map(v => v.id + ':' + v.nodes.length)""")
    check(f"axe WCAG A/AA serious/critical: {label}", not found, ", ".join(found))


def visible(locator):
    return locator.filter(visible=True).count() > 0


def submit_lifecycle(page, reason):
    panel = page.locator("#lifecycle")
    panel.locator("textarea[name=reason]").fill(reason)
    panel.locator("input[name=reviewed]").check()
    panel.locator("button[type=submit]").click()


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    full = ("rentra_admin", T["full"])

    # ---- directory: counts, URL-backed search/filter, return context, mobile
    for width in (1280, 390):
        c = ctx(browser, full, width)
        page = c.new_page()
        r = go(page, f"{WEB}/admin/clients?status=active&q=client")
        check(f"directory loads with filters {width}px", r.status == 200 and visible(page.get_by_role("heading", name="Active clients")))
        row = page.locator("a[href*='/admin/clients/'][href*='from=']").first
        check(f"search finds seeded client {width}px", row.count() == 1 and CLIENT in row.get_attribute("href"))
        check(f"no horizontal page overflow {width}px", not page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth"))
        axe(page, f"/admin/clients {width}px")
        row.click()
        page.wait_for_url(re.compile(rf"/admin/clients/{CLIENT}"))
        page.wait_for_load_state("networkidle")
        crumb = page.get_by_role("navigation", name="Breadcrumb").get_by_role("link", name=re.compile("Clients")).filter(visible=True).first
        check(f"detail breadcrumb returns to filtered list {width}px", "status=active" in (crumb.get_attribute("href") or ""))
        if width == 1280:
            check("upcoming visit listed for fulfillment", visible(page.locator("#upcoming").get_by_text("GATEUP1")))
            check("impact preview names upcoming visits and live listings", visible(page.locator("#lifecycle").get_by_text(re.compile(r"1 upcoming visit")))
                  and visible(page.locator("#lifecycle").get_by_text(re.compile(r"live listing"))))
            check("ownership transfer shown as unavailable", visible(page.locator("#later").get_by_text(re.compile("no owner-ID edit"))))
            axe(page, "/admin/clients/[id] 1280px")
        c.close()

    # ---- public listing visible before suspension
    c = ctx(browser)
    page = c.new_page()
    r = go(page, WEB + T["listingPath"])
    check("public listing reachable while active", r.status == 200, r.status)
    c.close()

    # ---- stale view: open a second admin view before the change
    stale_ctx = ctx(browser, full)
    stale = stale_ctx.new_page()
    go(stale, f"{WEB}/admin/clients/{CLIENT}")

    # ---- suspend through the UI
    c = ctx(browser, full)
    page = c.new_page()
    go(page, f"{WEB}/admin/clients/{CLIENT}")
    submit_lifecycle(page, "Guest safety report under review")
    page.get_by_role("status").filter(has_text="Suspended").wait_for(timeout=20000)
    page.wait_for_load_state("networkidle")
    check("UI suspend commits and reports new status", visible(page.get_by_text("The account is now Suspended")))
    go(page, f"{WEB}/admin/clients/{CLIENT}?tab=history")
    check("history records suspension with reason", visible(page.locator("#history").get_by_text("Guest safety report under review")))
    go(page, f"{WEB}/admin/clients/{CLIENT}")
    check("panel now offers reinstatement", visible(page.locator("#lifecycle").get_by_role("button", name="Reinstate account")))
    c.close()

    # client's existing session ends on next protected request
    c = ctx(browser, ("rentra_session", T["client"]))
    page = c.new_page()
    go(page, f"{WEB}/partner")
    check("suspended client's session ends on next request", "/partner/login" in page.url, page.url)
    c.close()

    c = ctx(browser)
    page = c.new_page()
    r = go(page, WEB + T["listingPath"])
    check("suspended owner's listing leaves public pages", r.status == 404 or visible(page.get_by_text(re.compile("not (be )?found|not available", re.I))), r.status)
    c.close()

    # ---- the stale admin view gets a conflict, not a second effect
    submit_lifecycle(stale, "Second admin, old view")
    alert = stale.locator("#lifecycle [role=alert]")
    alert.wait_for(timeout=20000)
    check("stale UI command answers conflict", "changed after you reviewed it" in alert.inner_text(), alert.inner_text())
    alert.get_by_role("button", name="Reload current status").click()
    stale.locator("#lifecycle").get_by_role("button", name="Reinstate account").wait_for(timeout=20000)
    check("reload shows current state (reinstate offered)", True)

    # ---- direct API: permissions, validation, stale version
    api = p.request.new_context()
    def post(action, cookie=None, **form):
        headers = {"Cookie": f"{cookie[0]}={cookie[1]}"} if cookie else {}
        return api.post(f"{API}/admin/clients/{CLIENT}/{action}", form=form, headers=headers)
    check("API: anonymous command is 401", post("reinstate", reason="x" * 10, expectedVersion="2").status == 401)
    check("API: client cookie on admin API is 401", post("reinstate", ("rentra_session", T["client"]), reason="x" * 10, expectedVersion="2").status == 401)
    check("API: clients.read admin cannot reinstate (403)", post("reinstate", ("rentra_admin", T["reader"]), reason="x" * 10, expectedVersion="2").status == 403)
    read = api.get(f"{API}/admin/clients/{CLIENT}", headers={"Cookie": f"rentra_admin={T['reader']}"})
    check("API: clients.read admin can read detail", read.status == 200)
    check("API: records-only admin cannot read clients (403)", api.get(f"{API}/admin/clients", headers={"Cookie": f"rentra_admin={T['limited']}"}).status == 403)
    check("API: missing reason is 422", post("reinstate", full, expectedVersion="2").status == 422)
    check("API: stale version is 409", post("reinstate", full, reason="stale direct call", expectedVersion="1").status == 409)
    check("API: suspend of already suspended is 409", post("suspend", full, reason="again please", expectedVersion="2").status == 409)
    check("API: unknown client is 404", api.get(f"{API}/admin/clients/00000000-0000-4000-8000-000000000000", headers={"Cookie": f"rentra_admin={T['full']}"}).status == 404)

    # ---- reinstate through the (refreshed) stale page
    submit_lifecycle(stale, "Report cleared by operations")
    stale.get_by_role("status").filter(has_text="Active").wait_for(timeout=20000)
    check("UI reinstate returns account to active", visible(stale.get_by_text("The account is now Active")))
    stale_ctx.close()

    c = ctx(browser)
    page = c.new_page()
    r = go(page, WEB + T["listingPath"])
    check("listing public again after reinstatement", r.status == 200, r.status)
    c.close()

    c = ctx(browser, full)
    page = c.new_page()
    go(page, f"{WEB}/admin/clients/00000000-0000-4000-8000-000000000000")
    check("unknown client id shows not-found", visible(page.get_by_role("heading", name="Record not found")))
    go(page, f"{WEB}/admin/clients")
    check("People > Clients in admin navigation", page.get_by_role("navigation", name="Admin navigation").get_by_role("link", name="Clients").count() == 1)
    c.close()
    browser.close()

Path(os.environ.get("GATE_RESULTS", "cp03-gate-results.json")).write_text(json.dumps(results, indent=1))
failed = [r for r in results if not r["pass"]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
