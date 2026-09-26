"""CP02 browser gate against a disposable local stack (web :3100, api :4100).

Fixture evidence only. See docs/rentra-client-admin-part02.md for the setup:
disposable PostgreSQL, fixture-migrate.mjs, seed, mint.mjs, then this script.
Env: GATE_TOKENS (tokens.json from mint.mjs), CHROME (browser executable).
"""
import json, os, subprocess, sys, re
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).parent
T = json.loads(Path(os.environ.get("GATE_TOKENS", HERE / "tokens.json")).read_text())
WEB = "http://localhost:3100"
AXE = (HERE.parents[1] / "node_modules" / "axe-core" / "axe.min.js").read_text(encoding="utf-8")
CHROME = os.environ.get("CHROME", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
results = []


def check(name, ok, detail=""):
    results.append({"check": name, "pass": bool(ok), "detail": detail})
    print(("PASS " if ok else "FAIL ") + name + (f" — {detail}" if detail and not ok else ""))


def ctx(browser, cookie, width=1280, height=900):
    c = browser.new_context(viewport={"width": width, "height": height})
    if cookie:
        name, value = cookie
        c.add_cookies([{"name": name, "value": value, "url": WEB}])
    return c


def axe(page, label):
    page.wait_for_timeout(800)  # let entry fade-in animations settle; mid-fade opacity is not the resting contrast
    page.add_script_tag(content=AXE)
    found = page.evaluate("""async () => (await axe.run({exclude: [['img']]}, {runOnly: ['wcag2a','wcag2aa']})).violations
        .filter(v => ['serious','critical'].includes(v.impact)).map(v => v.id + ':' + v.nodes.length)""")
    check(f"axe WCAG A/AA serious/critical: {label}", not found, ", ".join(found))


def active_inside(page, selector):
    return page.evaluate(f"() => !!document.activeElement?.closest({json.dumps(selector)})")


def go(page, url):
    response = page.goto(url)
    page.wait_for_load_state("networkidle")
    return response


def api_pid():
    out = subprocess.run("netstat -ano", capture_output=True, text=True, shell=True).stdout
    m = re.search(r"TCP\s+\S+:4100\s+\S+\s+LISTENING\s+(\d+)", out)
    return m and m.group(1)


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    client = ("rentra_session", T["client"])

    # ---- client list: URL-backed filters, table region, mobile cards, return context
    for width in (1280, 390):
        c = ctx(browser, client, width, 844 if width == 390 else 900)
        page = c.new_page()
        r = go(page, f"{WEB}/partner/listings?status=live&page=1")
        check(f"client list loads {width}px", r.status == 200 and page.get_by_role("heading", name="Properties", exact=True).filter(visible=True).count() == 1)
        link = page.locator("a[href*='?from=']").filter(visible=True).first
        href = link.get_attribute("href")
        check(f"row link carries filtered list {width}px", "status%3Dlive" in href, href)
        if width == 1280:
            check("table region keyboard-focusable", page.locator("[role=region][aria-label='Properties table']").first.get_attribute("tabindex") == "0")
            check("reviews destination in owner navigation", page.get_by_role("link", name="Reviews").count() >= 1)
        else:
            check("mobile uses card list, table hidden", page.locator("[aria-label='Properties table']").filter(visible=True).count() == 0)
            overflow = page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth")
            check("no horizontal page overflow at 390px", not overflow)
        axe(page, f"/partner/listings {width}px")
        link.click()
        page.wait_for_url(re.compile(r"/partner/listings/[0-9a-f-]+\?from="))
        crumb = page.get_by_role("navigation", name="Breadcrumb").get_by_role("link", name=re.compile("Properties")).filter(visible=True).first
        check(f"detail breadcrumb returns to filtered list {width}px", "status=live" in (crumb.get_attribute("href") or ""), crumb.get_attribute("href"))
        if width == 1280:
            axe(page, "/partner/listings/[id] 1280px")
        c.close()

    # ---- detail states: foreign id and malformed id are not-found, not outage
    c = ctx(browser, client)
    page = c.new_page()
    if T.get("otherListingId"):
        r = go(page, f"{WEB}/partner/listings/{T['otherListingId']}")
        check("another owner's listing shows not-found UI, no data (streamed status recorded)", "Other Owner" not in page.content() and page.get_by_role("heading", name="Record not found").filter(visible=True).count() > 0, str(r.status))
    r = go(page, f"{WEB}/partner/listings/not-a-uuid")
    check("malformed listing id shows not-found", page.get_by_role("heading", name="Record not found").filter(visible=True).count() > 0, str(r.status))

    # ---- form: server validation summary, focus, preserved input, dirty guard
    go(page, f"{WEB}/partner/listings/{T['listingId']}")
    basics = page.locator("#section-basics, section:has(#title)").first
    title = page.locator("#title")
    original = title.input_value()
    title.fill("   abc    ")  # passes native minLength, fails the trimmed server rule
    basics.get_by_role("button", name=re.compile("^Save")).click()
    summary = basics.locator("[role=alert]:has-text('Fix 1 field')")
    summary.wait_for(timeout=15000)
    check("validation summary shown and focused", active_inside(page, "[role=alert]"))
    check("typed value preserved after failed save", title.input_value() == "   abc    ", repr(title.input_value()))
    summary.get_by_role("button").first.click()
    check("summary entry moves focus to its field", page.evaluate("() => document.activeElement?.name") == "title")
    dialogs = []
    page.on("dialog", lambda d: (dialogs.append(d.message), d.dismiss()))
    page.get_by_role("navigation", name="Owner navigation").get_by_role("link", name="Bookings").click()
    page.wait_for_timeout(800)
    check("unsaved-change warning blocks in-app navigation", dialogs and "/partner/listings/" in page.url, page.url)
    title.fill(original)
    c.close()

    # ---- mobile drawer: focus moves in, stays in, Escape closes, focus returns
    c = ctx(browser, client, 390, 844)
    page = c.new_page()
    go(page, f"{WEB}/partner")
    menu = page.get_by_role("button", name="Open navigation")
    menu.focus()
    page.keyboard.press("Enter")
    page.locator("dialog[open]").wait_for()
    check("drawer receives focus", active_inside(page, "dialog[open]"))
    for _ in range(25):
        page.keyboard.press("Tab")
    check("focus stays inside modal drawer", active_inside(page, "dialog[open]"))
    page.keyboard.press("Escape")
    page.wait_for_timeout(300)
    check("Escape closes drawer", page.locator("dialog[open]").count() == 0)
    check("focus returns to menu button", page.evaluate("() => document.activeElement?.getAttribute('aria-label')") == "Open navigation")
    axe(page, "/partner 390px")
    c.close()

    # ---- admin: capability navigation, forbidden state, support list/detail context
    c = ctx(browser, ("rentra_admin", T["full"]))
    page = c.new_page()
    r = go(page, f"{WEB}/admin/support?state=all&page=1")
    check("admin support list loads", r.status == 200 and page.get_by_role("heading", name="Support inbox", exact=True).filter(visible=True).count() == 1)
    nav = page.get_by_role("navigation", name="Admin navigation")
    check("full admin sees grouped nav incl. Gateway settings", nav.get_by_role("link", name="Gateway settings").count() == 1)
    axe(page, "/admin/support 1280px")
    r = go(page, f"{WEB}/admin/support/00000000-0000-4000-8000-000000000000")
    check("unknown support id shows not-found", page.get_by_role("heading", name="Record not found").filter(visible=True).count() > 0, str(r.status))
    c.close()

    c = ctx(browser, ("rentra_admin", T["limited"]))
    page = c.new_page()
    go(page, f"{WEB}/admin/bookings")
    nav = page.get_by_role("navigation", name="Admin navigation")
    names = nav.get_by_role("link").all_inner_texts()
    check("limited admin nav shows only permitted destinations", [n.strip() for n in names] == ["Bookings"], str(names))
    go(page, f"{WEB}/admin/support")
    check("limited admin gets forbidden state, not outage/empty", page.get_by_role("heading", name="You do not have access to this").filter(visible=True).count() > 0)
    c.close()

    # ---- outage: API down must not become empty list or false 404; failed save keeps input
    c = ctx(browser, client)
    page = c.new_page()
    go(page, f"{WEB}/partner/listings/{T['listingId']}")
    pid = api_pid()
    subprocess.run(f"taskkill /PID {pid} /F", shell=True, capture_output=True)
    page.wait_for_timeout(1000)
    title = page.locator("#title")
    title.fill("Outage-proof title text")
    page.locator("section:has(#title)").get_by_role("button", name=re.compile("^Save")).click()
    page.locator("section:has(#title) [role=alert]").first.wait_for(timeout=15000)
    check("network failure on save is announced", page.locator("section:has(#title) [role=alert]").first.filter(visible=True).count() > 0)
    check("input preserved after network failure", title.input_value() == "Outage-proof title text", title.input_value())
    r = go(page, f"{WEB}/partner/listings/{T['listingId']}")
    check("detail during outage shows unavailable+retry, not 404", r.status != 404 and page.get_by_role("button", name="Try again").filter(visible=True).count() > 0, str(r.status))
    r = go(page, f"{WEB}/partner/listings?status=live")
    check("list during outage is not an empty list", page.get_by_role("button", name="Try again").filter(visible=True).count() > 0 and "No matching properties" not in page.content())
    check("retry keeps list filters in URL", "status=live" in page.url)
    c.close()
    browser.close()

Path(os.environ.get("GATE_RESULTS", "gate-results.json")).write_text(json.dumps(results, indent=1))
failed = [r for r in results if not r["pass"]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
