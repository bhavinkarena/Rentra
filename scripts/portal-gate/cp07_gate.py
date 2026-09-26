"""CP07 browser/API gate: verification scheduling, evidence and publication.
Requires a fresh serve-property-review.mjs fixture (API :4106) and an isolated Next on :3106.
GATE_TOKENS points to that disposable fixture's JSON; no configured application data.
"""
import json
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens, ids = fixture['tokens'], fixture['ids']
listing = ids['listing']
submission = fixture['submission']['submissionId']
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
PUBLIC = f'{WEB}/listing/review-farm-review01'
FINDINGS = 'Walked the farm with the owner; photos, pool and access road all match.'
axe = (Path(__file__).parents[2] / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = []
ist = timezone(timedelta(hours=5, minutes=30))
when = lambda days: (datetime.now(ist) + timedelta(days=days)).strftime('%Y-%m-%dT11:00')


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


with sync_playwright() as pw:
    chrome = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    browser = pw.chromium.launch(headless=True, executable_path=chrome if Path(chrome).exists() else None)

    def context(kind=None, width=1280):
        ctx = browser.new_context(viewport={'width': width, 'height': 950})
        ctx.set_default_navigation_timeout(120000)
        if kind:
            cookie = 'rentra_session' if kind in ['owner', 'other'] else 'rentra_admin'
            ctx.add_cookies([{'name': cookie, 'value': tokens[kind], 'url': WEB}])
        return ctx

    admin, owner, limited, guest = context('admin'), context('owner'), context('limited'), context()
    base = f'{API}/admin/properties/{listing}'
    fake = str(uuid.uuid4())
    schedule_body = {'submissionId': submission, 'mode': 'physical', 'scheduledAt': when(3)}

    # Access control on every new command.
    for path in ['verifications', f'verifications/{fake}/reschedule', f'verifications/{fake}/cancel', f'verifications/{fake}/outcome', 'publish']:
        check(f'client cookie rejected on {path.split("/")[-1]}', owner.request.post(f'{base}/{path}', data=schedule_body).status == 401)
        check(f'records-only operator denied {path.split("/")[-1]}', limited.request.post(f'{base}/{path}', data=schedule_body).status == 403)
    check('malformed visit ID rejected', admin.request.post(f'{base}/verifications/invalid/cancel', data={'expectedVersion': 1, 'reason': 'Test'}).status == 400)
    check('scheduling before Gate 2 approval refused', admin.request.post(f'{base}/verifications', data=schedule_body).status == 409)

    decision = {'submissionId': submission, 'outcome': 'approved_for_visit', 'reason': 'Ready for verification'}
    check('Gate 2 approval recorded', admin.request.post(f'{base}/decision', data=decision).status == 200)
    check('publishing without evidence refused', admin.request.post(f'{base}/publish', data={'submissionId': submission}).status == 409)
    # Next streams notFound() with status 200, so read the rendered not-found page.
    check('public page hidden before publication', 'not found' in guest.request.get(PUBLIC).text())

    page = admin.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(f'{WEB}/admin/properties/{listing}?tab=verification&from=%2Fadmin%2Fproperties%3Fstatus%3Dpending_verification')
        settle(page)
        page.get_by_role('heading', name='Schedule verification', exact=True).first.wait_for()
        check(f'blockers explain missing evidence {width}px', page.get_by_text('No passed verification of this exact revision is recorded.', exact=True).count() > 0)
        check(f'no publish action without evidence {width}px', page.get_by_role('button', name='Publish this revision').count() == 0)
        check(f'tab keeps return context {width}px', 'from=' in page.get_by_role('link', name='History', exact=True).first.get_attribute('href'))
        scan(page, f'verification tab {width}px')
    page.set_viewport_size({'width': 1280, 'height': 950})

    # Schedule a physical visit through the UI; a past time is refused and the typed note survives.
    page.get_by_label('Site visit', exact=True).check()
    page.get_by_label('Note for the record (optional)').fill('Owner prefers mornings')
    page.get_by_label('When (India time, IST)').fill('2020-01-01T10:00')
    page.get_by_role('button', name='Schedule verification', exact=True).click()
    page.get_by_text('Choose a time in the future.', exact=True).first.wait_for()
    check('past verification time refused', True)
    check('refused schedule keeps chosen mode', page.get_by_label('Site visit', exact=True).is_checked())
    check('refused schedule keeps typed note', page.get_by_label('Note for the record (optional)').input_value() == 'Owner prefers mornings')
    page.get_by_label('When (India time, IST)').fill(when(3))
    page.get_by_role('button', name='Schedule verification', exact=True).click()
    page.get_by_role('heading', name='Record the outcome', exact=True).wait_for()
    visit = admin.request.get(base).json()['data']['verifications'][0]
    check('scheduled visit persists as physical for this revision', visit['mode'] == 'physical' and visit['submissionId'] == submission and visit['status'] == 'scheduled')
    check('duplicate open verification refused', admin.request.post(f'{base}/verifications', data=schedule_body).status == 409)
    check('stale reschedule refused', admin.request.post(f'{base}/verifications/{visit["id"]}/reschedule', data={'expectedVersion': 9, 'scheduledAt': when(4), 'reason': 'Owner travelling'}).status == 409)

    client = owner.new_page()
    client.goto(f'{WEB}/partner/listings/{listing}')
    settle(client)
    client.get_by_text('Site visit scheduled for', exact=False).first.wait_for()
    check('client sees the scheduled site visit in IST', client.get_by_text('Asia/Kolkata', exact=False).count() + client.get_by_text('IST', exact=False).count() > 0)

    # Reschedule through the UI.
    page.get_by_label('New time (IST)').fill(when(5))
    page.get_by_label('Reason', exact=True).fill('Owner travelling this week')
    page.get_by_role('button', name='Reschedule', exact=True).click()
    page.wait_for_function('v => document.body.innerText.includes(v)', arg='version 2')
    check('UI reschedule advances the visit version', admin.request.get(base).json()['data']['verifications'][0]['version'] == 2)

    # Evidence rules: an incomplete checklist and missing coordinates cannot pass.
    findings = page.get_by_label('Findings (kept private; shown to the client only if the verification fails)')
    findings.fill(FINDINGS)
    boxes = page.locator('input[name="checklist"]')
    for i in range(boxes.count() - 1):
        boxes.nth(i).check()
    page.get_by_role('button', name='Record verification outcome', exact=True).click()
    page.get_by_text('Confirm every checklist item, or record the verification as failed.', exact=True).first.wait_for()
    check('incomplete checklist refused', True)
    check('refused outcome keeps findings', findings.input_value() == FINDINGS)
    boxes.nth(boxes.count() - 1).check()
    page.get_by_role('button', name='Record verification outcome', exact=True).click()
    page.get_by_text('Record the on-site coordinates for a physical visit.', exact=True).first.wait_for()
    check('physical visit requires coordinates', True)
    check('checklist survives refused outcome', boxes.nth(0).is_checked())
    page.get_by_label('On-site latitude').fill('21.1702')
    page.get_by_label('On-site longitude').fill('72.8311')
    page.get_by_role('button', name='Record verification outcome', exact=True).click()
    page.get_by_role('heading', name='Publish', exact=True).wait_for()
    state = admin.request.get(base).json()['data']
    check('passed verification recorded with attribution', state['verifications'][0]['outcome'] == 'passed' and state['verifications'][0]['recordedBy'] == 'reviewer@fixture.invalid')
    check('passing does not publish', state['property']['status'] == 'pending_verification' and state['publication']['eligible'])
    check('inventory note shown before publish', page.get_by_text('Not bookable yet', exact=False).count() > 0)
    check('publishing another revision refused', admin.request.post(f'{base}/publish', data={'submissionId': fake}).status == 409)
    check('records-only operator cannot publish', limited.request.post(f'{base}/publish', data={'submissionId': submission}).status == 403)

    page.get_by_role('checkbox', name='I have checked the verification evidence', exact=False).check()
    page.get_by_role('button', name='Publish this revision', exact=True).click()
    page.get_by_role('link', name='Open public page', exact=True).wait_for()
    state = admin.request.get(base).json()['data']
    check('UI publication makes the property live', state['property']['status'] == 'live')
    check('published revision is the verified submission', state['publication']['publishedSubmissionId'] == submission)
    check('second publication refused', admin.request.post(f'{base}/publish', data={'submissionId': submission}).status == 409)
    scan(page, 'published verification tab')

    public = guest.new_page()
    response = public.goto(PUBLIC)
    settle(public)
    check('public page live after publication', response.status == 200 and public.get_by_role('heading', name='Review River Farm').count() > 0 and 'not found' not in public.title())
    body = public.content()
    for secret, label in [('12 Private Lane', 'exact address'), (FINDINGS, 'findings'), ('21.1702', 'coordinates'), ('ownerIdentity', 'checklist')]:
        check(f'public page hides {label}', secret not in body)

    client.reload()
    settle(client)
    client.get_by_text('This property is live', exact=True).first.wait_for()
    check('client sees live and not-bookable state', client.get_by_text('Guests can see it but cannot book yet', exact=False).count() > 0)
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp07-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
