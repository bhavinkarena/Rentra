"""CP04 gate: admin customer directory, corrections, restriction and session revocation.

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
GUEST = T["customerId"]
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
    page.wait_for_load_state("networkidle")
    return response


def axe(page, label):
    page.wait_for_timeout(800)
    page.add_script_tag(content=AXE)
    found = page.evaluate("""async () => (await axe.run({exclude: [['img']]}, {runOnly: ['wcag2a','wcag2aa']})).violations
        .filter(v => ['serious','critical'].includes(v.impact)).map(v => v.id + ':' + v.nodes.length)""")
    check(f"axe WCAG A/AA serious/critical: {label}", not found, ", ".join(found))


def visible(locator):
    return locator.filter(visible=True).count() > 0


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    full = ("rentra_admin", T["full"])
    guest = ("rentra_session", T["customer"])

    # ---- directory: masked phones, search by digits, filters, mobile
    for width in (1280, 390):
        c = ctx(browser, full, width)
        page = c.new_page()
        r = go(page, f"{WEB}/admin/customers?q=980001")
        check(f"directory loads with search {width}px", r.status == 200 and visible(page.get_by_role("heading", name="All customers")))
        check(f"list shows masked phone only {width}px", visible(page.get_by_text("••••••0001")) and "9898980001" not in page.content())
        row = page.locator(f"a[href*='/admin/customers/{GUEST}'][href*='from=']").first
        check(f"search finds the customer {width}px", row.count() == 1)
        check(f"no horizontal page overflow {width}px", not page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth"))
        axe(page, f"/admin/customers {width}px")
        row.click()
        page.wait_for_url(re.compile(rf"/admin/customers/{GUEST}"))
        page.wait_for_load_state("networkidle")
        crumb = page.get_by_role("navigation", name="Breadcrumb").get_by_role("link", name=re.compile("Customers")).filter(visible=True).first
        check(f"detail breadcrumb keeps the search {width}px", "q=980001" in (crumb.get_attribute("href") or ""))
        if width == 1280:
            check("detail shows credential phone and one open session", visible(page.get_by_text("+91 9898980001")) and visible(page.locator("#sessions").get_by_text(re.compile(r"1\s+open session"))))
            check("phone is not an editable field", page.locator("#profile input[name=phone]").count() == 0)
            check("privacy links to the privacy workflow", page.locator("#privacy a[href='/admin/privacy']").count() == 1)
            axe(page, "/admin/customers/[id] 1280px")
        c.close()

    # ---- the customer is signed in before any admin action
    cust = ctx(browser, guest)
    cpage = cust.new_page()
    go(cpage, f"{WEB}/account")
    check("customer session works before revocation", "/account" in cpage.url and "/login" not in cpage.url, cpage.url)

    # a second admin view opened before changes (for the stale check)
    stale_ctx = ctx(browser, full)
    stale = stale_ctx.new_page()
    go(stale, f"{WEB}/admin/customers/{GUEST}")

    c = ctx(browser, full)
    page = c.new_page()
    go(page, f"{WEB}/admin/customers/{GUEST}")
    profile = page.locator("#profile")

    # duplicate email keeps input and explains
    profile.locator("input[name=email]").fill("taken@fixture.invalid")
    profile.locator("textarea[name=reason]").fill("Customer asked to add email")
    profile.get_by_role("button", name="Save correction").click()
    profile.get_by_text("Another customer account already uses this email.").first.wait_for(timeout=20000)
    check("duplicate email rejected with field message", True)
    check("typed email and reason preserved after rejection", profile.locator("input[name=email]").input_value() == "taken@fixture.invalid" and profile.locator("textarea[name=reason]").input_value() == "Customer asked to add email")

    # valid correction
    profile.locator("input[name=name]").fill("Rahul Sharma")
    profile.locator("input[name=email]").fill("rahul.sharma@fixture.invalid")
    profile.get_by_role("button", name="Save correction").click()
    profile.get_by_role("status").wait_for(timeout=20000)
    page.wait_for_load_state("networkidle")
    check("correction saved and names changed fields", "name" in profile.get_by_role("status").inner_text() and "email" in profile.get_by_role("status").inner_text())
    check("history records fields, not values", visible(page.locator("#history").get_by_text(re.compile("Fields: name, email"))) and "rahul.sharma@fixture.invalid" not in page.locator("#history").inner_text())

    go(cpage, f"{WEB}/account")
    check("identity correction does not sign the customer out", "/login" not in cpage.url, cpage.url)

    # session revocation while active
    sessions = page.locator("#sessions")
    sessions.locator("textarea[name=reason]").fill("Customer reported a lost phone")
    sessions.get_by_role("button", name="Sign out everywhere").click()
    sessions.get_by_role("status").wait_for(timeout=20000)
    check("admin revokes the open session", "Signed out of 1 session" in sessions.get_by_role("status").inner_text())
    go(cpage, f"{WEB}/account")
    check("customer is signed out on the next request", "/login" in cpage.url, cpage.url)
    cust.close()

    # stale second view: its version is behind now
    lifecycle = stale.locator("#lifecycle")
    lifecycle.locator("textarea[name=reason]").fill("Old view restriction")
    lifecycle.locator("input[name=reviewed]").check()
    lifecycle.get_by_role("button", name="Restrict access").click()
    alert = lifecycle.locator("[role=alert]")
    alert.wait_for(timeout=20000)
    check("stale admin view answers conflict", "changed after you opened it" in alert.inner_text(), alert.inner_text())
    alert.get_by_role("button", name=re.compile("Reload current")).click()
    stale.wait_for_load_state("networkidle")
    stale.wait_for_timeout(1500)

    # restrict then reinstate from the refreshed view
    lifecycle.locator("textarea[name=reason]").fill("Chargeback under review")
    lifecycle.locator("input[name=reviewed]").check()
    lifecycle.get_by_role("button", name="Restrict access").click()
    stale.get_by_role("status").filter(has_text="Restricted").wait_for(timeout=20000)
    stale.wait_for_load_state("networkidle")
    check("UI restriction commits", visible(stale.get_by_text("The account is now Restricted")))
    lifecycle.locator("textarea[name=reason]").fill("Chargeback resolved")
    lifecycle.locator("input[name=reviewed]").check()
    lifecycle.get_by_role("button", name="Reinstate access").click()
    stale.get_by_role("status").filter(has_text="Active").wait_for(timeout=20000)
    check("UI reinstatement commits", visible(stale.get_by_text("The account is now Active")))
    stale_ctx.close()
    c.close()

    # ---- direct API: permissions, minimization, validation
    api = p.request.new_context()
    def call(method, path, cookie=None, **form):
        headers = {"Cookie": f"{cookie[0]}={cookie[1]}"} if cookie else {}
        return api.fetch(f"{API}{path}", method=method, headers=headers, form=form or None)
    detail = call("GET", f"/admin/customers/{GUEST}", full)
    body = detail.json()["data"]
    version, profile_version = body["customer"]["lifecycleVersion"], body["customer"]["profileVersion"]
    check("API detail omits secrets", all(k not in detail.text() for k in ("code_hash", "photo_public_id", "password")))
    check("API: anonymous is 401", call("GET", "/admin/customers").status == 401)
    check("API: customer cookie on admin API is 401", call("GET", "/admin/customers", ("rentra_session", T["customer"])).status == 401)
    check("API: customers.read admin can read", call("GET", f"/admin/customers/{GUEST}", ("rentra_admin", T["custreader"])).status == 200)
    check("API: customers.read admin cannot correct (403)", call("POST", f"/admin/customers/{GUEST}/profile", ("rentra_admin", T["custreader"]), name="X Y", email="", preferredLocale="en", reason="read only", expectedVersion=str(version), expectedProfileVersion=str(profile_version)).status == 403)
    check("API: clients.read admin cannot list customers (403)", call("GET", "/admin/customers", ("rentra_admin", T["reader"])).status == 403)
    check("API: invalid email is 422", call("POST", f"/admin/customers/{GUEST}/profile", full, name="Rahul Sharma", email="not-an-email", preferredLocale="en", reason="bad email", expectedVersion=str(version), expectedProfileVersion=str(profile_version)).status == 422)
    check("API: stale version is 409", call("POST", f"/admin/customers/{GUEST}/sessions/revoke", full, reason="stale call", expectedVersion="1").status == 409)
    check("API: unknown customer is 404", call("GET", "/admin/customers/00000000-0000-4000-8000-000000000000", full).status == 404)
    check("API: a client id is not a customer (404)", call("GET", f"/admin/customers/{T['clientId']}", full).status == 404)

    c = ctx(browser, full)
    page = c.new_page()
    go(page, f"{WEB}/admin/customers")
    check("People > Customers in admin navigation", page.get_by_role("navigation", name="Admin navigation").get_by_role("link", name="Customers").count() == 1)
    c.close()
    browser.close()

Path(os.environ.get("GATE_RESULTS", "cp04-gate-results.json")).write_text(json.dumps(results, indent=1))
failed = [r for r in results if not r["pass"]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
