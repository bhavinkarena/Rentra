"""CP05 gate: Gate 1 queue, assignment, versioned decisions and client resubmission.

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
A, B = T["gateA"], T["gateB"]
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


with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, headless=True)
    first = ("rentra_admin", T["full"])
    second = ("rentra_admin", T["second"])
    client_a = ("rentra_session", T["gateAClient"])

    # ---- queue: waiting first, aging, filters, return context, mobile
    for width in (1280, 390):
        c = ctx(browser, first, width)
        page = c.new_page()
        r = go(page, f"{WEB}/admin?assignee=unassigned&q=gate")
        check(f"queue loads with filters {width}px", r.status == 200 and visible(page.get_by_role("heading", name="Waiting applications")))
        check(f"queue shows aging past the service window {width}px", visible(page.get_by_text(re.compile(r"\d+h · overdue"))))
        row = page.locator(f"a[href*='/admin/applications/{A['appId']}'][href*='from=']").first
        check(f"row carries the filtered queue {width}px", row.count() == 1)
        check(f"no horizontal page overflow {width}px", not page.evaluate("() => document.documentElement.scrollWidth > window.innerWidth"))
        axe(page, f"/admin queue {width}px")
        c.close()

    # ---- reviewer 1 claims; reviewer 2 cannot decide it
    c1 = ctx(browser, first)
    p1 = c1.new_page()
    go(p1, f"{WEB}/admin?assignee=unassigned&q=gate")
    p1.locator(f"a[href*='/admin/applications/{A['appId']}']").first.click()
    p1.wait_for_url(re.compile(A["appId"]))
    p1.wait_for_load_state("networkidle")
    crumb = p1.get_by_role("navigation", name="Breadcrumb").get_by_role("link", name=re.compile("Applications")).filter(visible=True).first
    check("detail breadcrumb returns to filtered queue", "assignee=unassigned" in (crumb.get_attribute("href") or ""))
    check("review state shows version 1", visible(p1.get_by_text(re.compile(r"Version 1 · submitted"))))
    p1.get_by_role("button", name="Assign to me").click()
    p1.get_by_text("Assigned to you").wait_for(timeout=20000)
    check("reviewer can claim the application", True)
    axe(p1, "/admin/applications/[id] 1280px")

    c2 = ctx(browser, second)
    p2 = c2.new_page()
    go(p2, f"{WEB}/admin/applications/{A['appId']}?tab=decision")
    check("second reviewer sees the assignee", visible(p2.get_by_text(re.compile("Assigned to full@fixture.invalid"))))
    p2.get_by_role("button", name="Approve").first.click()
    p2.get_by_role("button", name="Approve and activate").click()
    alert = p2.locator("[role=alert]").filter(has_text="Nothing was decided")
    alert.wait_for(timeout=20000)
    check("unassigned reviewer's decision is refused", "Take over" in alert.inner_text() or "assigned" in alert.inner_text().lower(), alert.inner_text())

    # ---- structured correction request by the assignee
    go(p1, f"{WEB}/admin/applications/{A['appId']}?tab=decision")
    p1.get_by_role("button", name="Need more info").click()
    p1.get_by_label("Name / address").check()
    p1.get_by_label("Identity document").check()
    p1.locator("textarea[name=reason]").fill("The name on your PAN differs from your bill; upload a relationship proof.")
    p1.get_by_role("button", name="Send back with questions").click()
    p1.wait_for_url(re.compile(r"decided=more_info"), timeout=20000)
    check("correction request commits and returns to the queue", True)

    # ---- client sees actionable corrections, resubmits
    cc = ctx(browser, client_a)
    cp = cc.new_page()
    go(cp, f"{WEB}/partner")
    check("client sees the reviewer's reason", visible(cp.get_by_text("The name on your PAN differs from your bill")))
    flagged = cp.get_by_text("Rentra asked you to review and update this step")
    check("client stepper marks the two flagged steps", flagged.filter(visible=True).count() == 2, flagged.count())
    check("flagged steps link to their fix pages", cp.locator("a[href='/partner/onboarding/details']").count() >= 1 and cp.locator("a[href='/partner/onboarding/kyc']").count() >= 1)
    axe(cp, "/partner onboarding (changes requested)")

    # stale reviewer screen opened before the resubmission
    go(p1, f"{WEB}/admin/applications/{A['appId']}")
    check("admin view shows the decision it is waiting on", visible(p1.get_by_text(re.compile("last decision: more info"))))
    cp.get_by_role("button", name="Submit for review").click()
    cp.wait_for_load_state("networkidle")
    cp.get_by_text("With us for review").wait_for(timeout=20000)
    check("client resubmits", True)

    # ---- the stale screen cannot decide; reload shows the resubmission
    go(p1, f"{WEB}/admin/applications/{A['appId']}")
    stale_version = p1.locator("input[name=expectedVersion]").first.get_attribute("value") if p1.locator("input[name=expectedVersion]").count() else None
    api = p.request.new_context()
    def call(path, cookie=None, **form):
        headers = {"Cookie": f"{cookie[0]}={cookie[1]}"} if cookie else {}
        return api.post(f"{API}{path}", form=form or None, headers=headers, max_redirects=0)
    old = call("/admin/applications/approve", first, applicationId=A["appId"], expectedVersion="2", reason="")
    check("decision from before the resubmission is 409", old.status == 409, old.status)
    check("review state reports resubmission and unchanged fields", visible(p1.get_by_text(re.compile(r"submitted 2 times"))) and visible(p1.get_by_text("Nothing reviewed has changed since the last decision.")))

    # ---- approve through the UI; client keeps the session and is approved
    go(p1, f"{WEB}/admin/applications/{A['appId']}?tab=decision")
    stale_version = p1.locator("input[name=expectedVersion]").first.get_attribute("value") if p1.locator("input[name=expectedVersion]").count() else stale_version
    p1.get_by_role("button", name="Approve").first.click()
    p1.get_by_role("button", name="Approve and activate").click()
    p1.wait_for_url(re.compile(r"decided=approved"), timeout=20000)
    check("assignee approves the resubmitted version", True)
    again = call("/admin/applications/approve", first, applicationId=A["appId"], expectedVersion=str(stale_version or 3), reason="")
    check("duplicate approval submit is 409 (one decision)", again.status == 409, again.status)
    go(cp, f"{WEB}/partner")
    check("approved client stays signed in and sees approval", "/partner/login" not in cp.url and visible(cp.get_by_text("Approved partner")), cp.url)
    cc.close()

    # ---- race on application B: two reviewers, contradictory decisions, one version
    import threading
    outcomes = {}
    # Playwright's sync API is not thread safe; the race uses raw HTTP.
    import urllib.request, urllib.parse
    def raw(path, cookie, form):
        data = urllib.parse.urlencode(form).encode()
        req = urllib.request.Request(f"{API}{path}", data=data, headers={"Cookie": f"{cookie[0]}={cookie[1]}", "Content-Type": "application/x-www-form-urlencoded"})
        try:
            with urllib.request.urlopen(req) as res:
                return res.status
        except urllib.error.HTTPError as error:
            return error.code
    threads = [
        threading.Thread(target=lambda: outcomes.__setitem__("approve", raw("/admin/applications/approve", first, {"applicationId": B["appId"], "expectedVersion": "1"}))),
        threading.Thread(target=lambda: outcomes.__setitem__("reject", raw("/admin/applications/reject", second, {"applicationId": B["appId"], "expectedVersion": "1", "reason": "Documents unreadable"}))),
    ]
    for t in threads: t.start()
    for t in threads: t.join()
    check("contradictory race: exactly one decision commits", sorted(outcomes.values()) == [200, 409], outcomes)

    # ---- documents and permissions
    doc = api.get(f"{API}/admin/documents/{B['docId']}/file", headers={"Cookie": f"rentra_admin={T['full']}"})
    check("admin document read is authorized (fixture file unavailable: 502)", doc.status in (200, 502), doc.status)
    check("client cookie cannot read admin document route (401)", api.get(f"{API}/admin/documents/{B['docId']}/file", headers={"Cookie": f"rentra_session={T['client']}"}).status == 401)
    check("records-only admin cannot open the queue (403)", api.get(f"{API}/admin/applications", headers={"Cookie": f"rentra_admin={T['limited']}"}).status == 403)
    check("records-only admin cannot read documents (403)", api.get(f"{API}/admin/documents/{B['docId']}/file", headers={"Cookie": f"rentra_admin={T['limited']}"}).status == 403)
    theft = api.delete(f"{API}/partner/documents", form={"id": B["docId"]}, headers={"Cookie": f"rentra_session={T['client']}"}, max_redirects=0)
    detail = api.get(f"{API}/admin/applications/{B['appId']}", headers={"Cookie": f"rentra_admin={T['full']}"}).json()["data"]
    check("another client cannot delete an applicant's document", any(d["id"] == B["docId"] for d in detail["documents"]), theft.status)
    check("admin detail returns review context", detail["review"]["reviewVersion"] == 2)
    c1.close()
    c2.close()
    browser.close()

Path(os.environ.get("GATE_RESULTS", "cp05-gate-results.json")).write_text(json.dumps(results, indent=1))
failed = [r for r in results if not r["pass"]]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
