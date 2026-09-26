"""CP15 browser/API gate: client tasks, persisted updates, read state and preferences.
Requires serve-property-review.mjs started with FIXTURE_STAGE=published (API :4106)
and an isolated Next on :3106. GATE_TOKENS points to that disposable fixture's JSON.
The last step stops the fixture API on purpose (failed-load check).
"""
import json
import os
import re
import subprocess
import uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens, ids, booking = fixture['tokens'], fixture['ids'], fixture['booking']
listing = ids['listing']
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
REASON = 'Guest safety report is under investigation by Rentra.'
axe = (Path(__file__).parents[2] / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = []


def settle(page):
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

    admin, owner, other, guest = context('admin'), context('owner'), context('other'), context()
    inbox = lambda query='': owner.request.get(f'{API}/partner/updates{query}').json()['data']
    tasks = lambda: {t['key']: t for t in owner.request.get(f'{API}/partner/tasks').json()['data']['tasks']}
    listed = lambda status: owner.request.get(f'{API}/partner/listings?status={status}').json()['data']['total']

    # Setup events (Gate 2 approval, verification, publication) arrived as updates.
    start = inbox()
    actions = [u['action'] for u in start['items']]
    check('publication journey produced persisted updates', all(a in actions for a in ['listing_review_decided', 'verification_scheduled', 'verification_recorded', 'listing_published']))
    body = json.dumps(start)
    check('updates carry no findings or operator identity', 'Video walk-through matched' not in body and 'reviewer@fixture.invalid' not in body)

    # Permissions.
    check('signed-out request refused', guest.request.get(f'{API}/partner/updates').status == 401)
    check('another owner sees none of these updates', other.request.get(f'{API}/partner/updates').json()['data']['total'] == 0)
    first = start['items'][0]['id']
    check('another owner cannot mark this update read', other.request.post(f'{API}/partner/updates/read', data={'id': first}).status == 404)
    check('malformed update id refused', owner.request.post(f'{API}/partner/updates/read', data={'id': 'nope'}).status == 422)

    # Tasks agree with the lists they open.
    t = tasks()
    check('live-not-bookable task matches its list', t['properties_unbookable']['count'] == 1 == listed('unbookable'))
    check('attention task matches its list', t['properties_attention']['count'] == listed('attention'))
    check('unread task matches the inbox', t['updates_unread']['count'] == start['unread'])
    page = owner.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(f'{WEB}/partner')
        settle(page)
        page.get_by_role('heading', name='Your tasks').first.wait_for()
        check(f'dashboard shows the not-bookable task {width}px', page.get_by_role('link', name='1 live property is not bookable yet').filter(visible=True).count() == 1)
        check(f'decorative portfolio health removed {width}px', page.get_by_text('Portfolio health').count() == 0)
        scan(page, f'dashboard {width}px')
    page.set_viewport_size({'width': 1280, 'height': 950})
    nav = page.get_by_role('navigation', name='Owner navigation')
    check('updates badge shows the unread count', nav.get_by_role('link', name=re.compile(rf'Updates\D*{start["unread"]}')).count() > 0)
    page.get_by_role('link', name='1 live property is not bookable yet').first.click()
    page.wait_for_url(re.compile(r'status=unbookable'))
    settle(page)
    footer = page.get_by_text(re.compile(r'^Showing\s*1\s*to\s*1\s*of\s*1$'))
    # The router updates the URL before the list renders: wait for the list itself.
    footer.first.wait_for()
    check('task opens its filtered list with the same count', footer.count() >= 1)

    # A state change: Rentra hides the property.
    state = admin.request.get(f'{API}/admin/properties/{listing}').json()['data']['lifecycle']
    check('Rentra hides the property', admin.request.post(f'{API}/admin/properties/{listing}/hide', data={'expectedVersion': state['version'], 'reason': REASON}).status == 200)
    t = tasks()
    check('hide becomes required work in tasks', t['updates_action']['count'] == 1 == inbox('?filter=action')['total'])
    check('hidden and unbookable counts follow the new state', t['properties_hidden']['count'] == 1 == listed('hidden') and t['properties_unbookable']['count'] == 0 == listed('unbookable'))

    page.goto(f'{WEB}/partner/updates')
    settle(page)
    page.get_by_role('heading', name='Updates', exact=True).first.wait_for()
    check('inbox shows the required update with its reason', page.get_by_text('Rentra hid this property', exact=True).count() > 0 and page.get_by_text(REASON).count() > 0)
    scan(page, 'updates inbox')
    page.goto(f'{WEB}/partner/updates?filter=action')
    settle(page)
    check('needs-action filter lists only required work', page.get_by_role('button', name=re.compile('^Open')).count() == 1)
    before = inbox()['unread']
    page.get_by_role('button', name=re.compile(r'^Open\W+Rentra hid this property')).click()
    page.wait_for_url(re.compile(rf'/partner/listings/{listing}/overview'))
    check('opening an update leads to its property', True)
    after = inbox()
    check('opening marks it read and persists', after['unread'] == before - 1 and after['action'] == 0)

    # Repeat delivery: a replayed case message is one update.
    record = owner.request.get(f'{API}/partner/records/{booking["order"]}').json()['data']
    opened = owner.request.post(f'{API}/partner/records/cases', multipart={'orderId': booking['order'], 'type': 'operational', 'visitId': record['visits'][0]['id'], 'reason': 'The gate code does not work for guests.', 'requestKey': str(uuid.uuid4())})
    case_id = opened.json()['data']['caseId']
    cases_before = inbox('?category=case')['total']
    key = str(uuid.uuid4())
    for _ in range(2):
        admin.request.post(f'{API}/admin/records/cases/update', multipart={'caseId': case_id, 'audience': 'client', 'body': 'We have reset the gate code.', 'requestKey': key})
    check('replayed Rentra message creates one update', inbox('?category=case')['total'] == cases_before + 1)
    admin.request.post(f'{API}/admin/records/cases/update', multipart={'caseId': case_id, 'audience': 'internal', 'body': 'Internal triage only.', 'requestKey': str(uuid.uuid4())})
    check('internal case notes never reach the owner', 'Internal triage only' not in json.dumps(inbox('?category=case')))

    # Preferences: mute Cases through the UI; stale saves refused; required work unaffected.
    page.goto(f'{WEB}/partner/updates')
    settle(page)
    page.get_by_role('checkbox', name=re.compile('^Cases')).uncheck()
    page.get_by_role('button', name='Save preferences').click()
    page.get_by_text('Preferences saved.', exact=True).wait_for()
    prefs = owner.request.get(f'{API}/partner/updates/preferences').json()['data']
    check('preference persisted', prefs['muted'] == ['case'] and prefs['version'] == 1)
    check('stale preference save refused', owner.request.post(f'{API}/partner/updates/preferences', data={'expectedVersion': 0, 'muted': []}).status == 409)
    check('required work cannot be muted', owner.request.post(f'{API}/partner/updates/preferences', data={'expectedVersion': 1, 'muted': ['account']}).status == 422)
    unread = inbox()['unread']
    admin.request.post(f'{API}/admin/records/cases/update', multipart={'caseId': case_id, 'audience': 'client', 'body': 'Please share a photo of the gate.', 'requestKey': str(uuid.uuid4())})
    latest = inbox('?category=case')
    check('muted information is kept but arrives read', latest['items'][0]['detail']['body'] == 'Please share a photo of the gate.' and latest['items'][0]['read'] and inbox()['unread'] == unread)

    # Mark all read; the badge disappears rather than showing an empty count.
    page.goto(f'{WEB}/partner/updates')
    settle(page)
    page.get_by_role('button', name='Mark all as read').click()
    page.wait_for_function("() => !document.body.innerText.includes('Mark read')")
    page.reload()
    settle(page)
    check('mark all read persists across reload', inbox()['unread'] == 0 and page.get_by_role('button', name=re.compile('^Mark read')).count() == 0)
    nav = page.get_by_role('navigation', name='Owner navigation')
    check('no empty badge once everything is read', nav.get_by_role('link', name=re.compile(r'^Updates\s*\d')).count() == 0)
    check('settings no longer promise owner SMS alerts', 'Booking alerts and important property updates arrive here' not in owner.new_page().goto(f'{WEB}/partner/settings').text())

    # Failed load: an outage is a retryable state, not an empty inbox.
    out = subprocess.run('netstat -ano', capture_output=True, text=True, shell=True).stdout
    pid = re.search(r'TCP\s+\S+:4106\s+\S+\s+LISTENING\s+(\d+)', out)
    if pid:
        subprocess.run(f'taskkill /PID {pid.group(1)} /T /F', shell=True, capture_output=True)
    page.goto(f'{WEB}/partner/updates')
    settle(page)
    check('outage shows a retryable state, not an empty inbox', page.get_by_role('heading', name='This page could not load').count() > 0 and page.get_by_role('button', name='Try again').count() > 0 and page.get_by_text('No updates yet').count() == 0)
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp15-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
