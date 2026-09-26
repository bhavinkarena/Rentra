"""CP09 browser/API gate: owner property overview, corrections, conflict-safe saves, context.
Requires serve-property-review.mjs started with FIXTURE_STAGE=published (API :4106)
and an isolated Next on :3106. GATE_TOKENS points to that disposable fixture's JSON.
The last step stops the fixture API on purpose (outage check).
"""
import json
import os
import re
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens, ids, booking = fixture['tokens'], fixture['ids'], fixture['booking']
listing = ids['listing']
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
REASON = 'Please remove the music rule and add evening photos.'
axe = (Path(__file__).parents[2] / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = []


def settle(page):
    # Streamed segments are swapped in during hydration; wait until the page is quiet.
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
    except Exception:
        page.wait_for_load_state('load')


def check(name, passed):
    results.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)


def scan(page, label):
    check(f'{label} has no page overflow', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    page.add_script_tag(content=axe)
    violations = page.evaluate("async () => (await axe.run({runOnly:['wcag2a','wcag2aa']})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
    check(f'{label} axe serious/critical', not violations)


def crumb(page, name):
    nav = page.get_by_role('navigation', name='Breadcrumb')
    return nav.get_by_role('link', name=name).filter(visible=True).first.get_attribute('href') or ''


with sync_playwright() as pw:
    chrome = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    browser = pw.chromium.launch(headless=True, executable_path=chrome if Path(chrome).exists() else None)

    def context(kind=None, width=1280):
        ctx = browser.new_context(viewport={'width': width, 'height': 950})
        ctx.set_default_navigation_timeout(120000)
        if kind:
            cookie = 'rentra_session' if kind in ['owner', 'other', 'customer'] else 'rentra_admin'
            ctx.add_cookies([{'name': cookie, 'value': tokens[kind], 'url': WEB}])
        return ctx

    admin, owner, other = context('admin'), context('owner'), context('other')
    mine = f'{API}/partner/listings/{listing}'
    detail = lambda: owner.request.get(mine).json()['data']['listing']

    # Ownership: another owner's id reads as missing everywhere.
    check('owner reads own overview', owner.request.get(f'{mine}/overview').status == 200)
    check('other owner denied overview API', other.request.get(f'{mine}/overview').status == 404)
    check('malformed overview id rejected', owner.request.get(f'{API}/partner/listings/not-a-uuid/overview').status in (400, 404))
    stranger = other.new_page()
    stranger.goto(f'{WEB}/partner/listings/{listing}/overview')
    settle(stranger)
    check('other owner sees not found, not the property', stranger.get_by_role('heading', name='Record not found').count() > 0 and stranger.get_by_text('Review River Farm').count() == 0)
    before = detail()['capacity']
    other.request.post(f'{mine}/capacity', multipart={'id': listing, 'capacity': '99', 'bedrooms': '0', 'farmSize': '2', 'farmSizeUnit': 'acre'})
    check('other owner cannot save this property', detail()['capacity'] == before)

    # Directory -> overview with the filtered list kept.
    page = owner.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(f'{WEB}/partner/listings?status=live')
        settle(page)
        row = page.locator(f"a[href*='/partner/listings/{listing}/overview?from=']").filter(visible=True).first
        row.click()
        page.wait_for_url(re.compile(r'/overview\?from='))
        settle(page)
        page.get_by_role('heading', name='Bookability').wait_for()
        check(f'directory opens the overview with list context {width}px', 'status%3Dlive' in page.url or 'status=live' in crumb(page, 'Properties'))
        check(f'breadcrumb returns to the filtered list {width}px', 'status=live' in crumb(page, 'Properties'))
        scan(page, f'overview {width}px')
    page.set_viewport_size({'width': 1280, 'height': 950})
    body = page.content()
    check('live is not shown as bookable', page.get_by_text('Not bookable yet: the owner has not confirmed booking hours.', exact=False).count() > 0)
    check('upcoming visit listed with its booking link', page.get_by_role('link', name='Open booking V-CP08').get_attribute('href') == f'/partner/bookings/{booking["order"]}')
    check('public page link for a live property', page.get_by_role('link', name=re.compile('Public page')).get_attribute('href') == '/listing/review-farm-review01')
    check('activity shows publication and verification outcome', page.get_by_text('Rentra published it', exact=True).count() > 0 and page.get_by_text('Verification completed: passed', exact=True).count() > 0)
    for secret, label in [('Video walk-through matched', 'verification findings'), ('reviewer@fixture.invalid', 'operator email'), ('12 Private Lane', 'exact address')]:
        check(f'overview does not expose {label}', secret not in body)

    # Overview -> calendar keeps the list context.
    page.get_by_role('link', name='Booking calendar').first.click()
    page.wait_for_url(re.compile(r'/calendar\?from='))
    settle(page)
    check('calendar breadcrumb keeps the filtered list', 'status=live' in crumb(page, 'Properties'))
    check('calendar breadcrumb returns to the overview', '/overview' in crumb(page, 'Review River Farm'))
    page.go_back()
    settle(page)

    # Overview -> editor; a save against changed content is refused and nothing is lost.
    page.get_by_role('link', name='Edit property').first.click()
    page.wait_for_url(re.compile(rf'/partner/listings/{listing}\?from='))
    settle(page)
    check('editor breadcrumb links back to the overview', '/overview' in crumb(page, 'Review River Farm'))
    stale = detail()['contentVersion']
    elsewhere = owner.request.post(f'{mine}/capacity', multipart={'id': listing, 'capacity': '13', 'bedrooms': '0', 'farmSize': '2', 'farmSizeUnit': 'acre'})
    check('save from another tab succeeds', elsewhere.status == 200)
    refused = owner.request.post(f'{mine}/capacity', multipart={'id': listing, 'contentVersion': str(stale), 'capacity': '16', 'bedrooms': '0', 'farmSize': '2', 'farmSizeUnit': 'acre'})
    check('API refuses a save against an older version', refused.status == 409 and 'LISTING_CHANGED' in refused.text())
    capacity = page.locator('#section-capacity')
    capacity.locator('#capacity').fill('15')
    capacity.get_by_role('button', name='Save').click()
    capacity.get_by_text('This property changed after you opened it', exact=False).first.wait_for()
    check('editor explains the conflict', capacity.get_by_role('button', name='Reload latest version').count() == 1)
    check('conflict keeps the typed value', capacity.locator('#capacity').input_value() == '15')
    check('conflicting save wrote nothing', detail()['capacity'] == 13)
    page.once('dialog', lambda dialog: dialog.accept())
    capacity.get_by_role('button', name='Reload latest version').click()
    page.wait_for_function("() => document.querySelector('#capacity')?.value === '13'", timeout=60000)
    check('reload shows the latest saved version', True)

    # Review correction: directory -> overview -> flagged section -> save -> resubmit.
    owner.request.post(f'{mine}/submit', multipart={'id': listing})
    current = admin.request.get(f'{API}/admin/properties/{listing}').json()['data']['current']
    decision = admin.request.post(f'{API}/admin/properties/{listing}/decision', data={'submissionId': current['id'], 'outcome': 'changes_requested', 'reason': REASON, 'flagged': ['rules', 'photos']})
    check('Rentra requests changes on the resubmitted revision', decision.status == 200)
    page.goto(f'{WEB}/partner/listings?status=attention')
    settle(page)
    page.locator(f"a[href*='/partner/listings/{listing}/overview?from=']").filter(visible=True).first.click()
    page.wait_for_url(re.compile(r'/overview\?from='))
    settle(page)
    page.get_by_role('heading', name='Changes Rentra asked for').wait_for()
    check('overview shows the requested changes and reason', page.get_by_text(REASON, exact=False).count() > 0)
    check('overview links each flagged section', page.get_by_role('link', name='Correct House rules').count() == 1 and page.get_by_role('link', name='Correct Photos').count() == 1)
    page.get_by_role('link', name='Correct House rules').click()
    page.wait_for_url(re.compile(r'#section-rules'))
    settle(page)
    rules = page.locator('#section-rules')
    # The router updates the URL before the new page renders: wait for the editor itself.
    flag_notes = rules.get_by_text('Rentra asked for changes here.', exact=False).filter(visible=True)
    flag_notes.first.wait_for()
    check('editor marks the flagged section', flag_notes.count() == 1)
    check('unflagged sections are not marked', page.locator('#section-capacity').get_by_text('Rentra asked for changes here.', exact=False).count() == 0)
    check('editor keeps the attention list context', 'status=attention' in crumb(page, 'Properties'))
    rules.locator('#extraRules').fill('Quiet hours after 10 pm. No loud music outdoors.')
    rules.get_by_role('button', name='Save').click()
    rules.get_by_role('status').filter(has_text='Saved').first.wait_for()
    check('flagged section saves', 'Quiet hours' in json.dumps(detail()['houseRules']))
    page.goto(f'{WEB}/partner/listings/{listing}/overview')
    settle(page)
    page.get_by_role('button', name='Submit for review').click()
    page.wait_for_url(re.compile(r'submitted=1'), timeout=60000)
    check('resubmitted from the overview', detail()['status'] == 'pending_review')

    # Honest dashboard copy.
    page.goto(f'{WEB}/partner')
    settle(page)
    text = page.content()
    check('dashboard has no invented earnings range', 'earn between' not in text and '14,500' not in text)
    check('live KPI separates bookable from live', 'bookable now' in text and 'Visible and bookable by guests' not in text)
    page.goto(f'{WEB}/partner/listings?submitted=1')
    settle(page)
    check('submission banner promises no email or WhatsApp reply', 'WhatsApp' not in page.content() and page.get_by_text('The decision appears in this workspace', exact=False).count() > 0)

    # Outage: the overview says unavailable, not missing.
    out = subprocess.run('netstat -ano', capture_output=True, text=True, shell=True).stdout
    pid = re.search(r'TCP\s+\S+:4106\s+\S+\s+LISTENING\s+(\d+)', out)
    if pid:
        subprocess.run(f'taskkill /PID {pid.group(1)} /T /F', shell=True, capture_output=True)
    page.goto(f'{WEB}/partner/listings/{listing}/overview')
    settle(page)
    check('outage shows a retryable state, not not-found', page.get_by_role('heading', name='This page could not load').count() > 0 and page.get_by_role('button', name='Try again').count() > 0 and page.get_by_role('heading', name='Record not found').count() == 0)
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp09-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
