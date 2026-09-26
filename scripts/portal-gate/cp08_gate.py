"""CP08 browser/API gate: admin restriction vs owner pause, corrections, revision comparison.
Requires serve-property-review.mjs started with FIXTURE_STAGE=published (API :4106)
and an isolated Next on :3106. GATE_TOKENS points to that disposable fixture's JSON.
"""
import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens, ids, booking = fixture['tokens'], fixture['ids'], fixture['booking']
listing = ids['listing']
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
PUBLIC = f'{WEB}/listing/review-farm-review01'
REASON = 'Guest safety report is under investigation by Rentra.'
CHECKLIST = ['ownerIdentity', 'matchesPhotos', 'amenitiesPresent', 'locationMatches', 'ownershipOriginal', 'safeForGuests']
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
            cookie = 'rentra_session' if kind in ['owner', 'other', 'customer'] else 'rentra_admin'
            ctx.add_cookies([{'name': cookie, 'value': tokens[kind], 'url': WEB}])
        return ctx

    admin, owner, limited, guest, customer = context('admin'), context('owner'), context('limited'), context(), context('customer')
    base = f'{API}/admin/properties/{listing}'
    detail = lambda: admin.request.get(base).json()['data']
    lifecycle = lambda: detail()['lifecycle']
    tab = lambda name: f'{WEB}/admin/properties/{listing}?tab={name}&from=%2Fadmin%2Fproperties%3Fstatus%3Dlive'

    # Access control on the new commands.
    body = {'expectedVersion': 1, 'reason': REASON}
    for path in ['hide', 'restore', 'correction']:
        check(f'client cookie rejected on {path}', owner.request.post(f'{base}/{path}', data=body).status == 401)
        check(f'records-only operator denied {path}', limited.request.post(f'{base}/{path}', data=body).status == 403)
    check('malformed property ID rejected', admin.request.post(f'{API}/admin/properties/invalid/hide', data=body).status == 400)
    check('live filter lists the published property', any(i['id'] == listing for i in admin.request.get(f'{API}/admin/properties?status=live').json()['data']['items']))

    start = lifecycle()
    check('fixture starts live with one confirmed visit', start['status'] == 'live' and start['upcomingVisits'] == 1)
    page = admin.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(tab('visibility'))
        settle(page)
        page.get_by_role('heading', name='Hide (admin restriction)').first.wait_for()
        check(f'visibility tab previews the confirmed visit {width}px', page.get_by_text(booking and 'V-CP08', exact=False).count() > 0)
        scan(page, f'visibility tab {width}px')
    page.set_viewport_size({'width': 1280, 'height': 950})

    # Owner pause wins the race: the admin's hide prepared on "live" is refused.
    client = owner.new_page()
    client.goto(f'{WEB}/partner/listings/{listing}')
    settle(client)
    client.get_by_role('button', name='Pause new bookings').click()
    client.get_by_text('Paused by you', exact=True).first.wait_for()
    check('owner pause persists', lifecycle()['status'] == 'paused')
    check('hide prepared before the pause is refused', admin.request.post(f'{base}/hide', data={'expectedVersion': start['version'], 'reason': REASON}).status == 409)

    # Admin hide through the UI, after reloading the current state.
    page.goto(tab('visibility'))
    settle(page)
    page.get_by_label('Reason shown to the client').fill(REASON)
    page.get_by_role('checkbox', name='I have checked the effect', exact=False).check()
    page.get_by_role('button', name='Hide property', exact=True).click()
    page.get_by_role('heading', name='Restore', exact=True).wait_for()
    state = lifecycle()
    check('UI hide records the restriction over the owner pause', state['status'] == 'hidden' and state['priorStatus'] == 'paused' and state['restriction']['reason'] == REASON)
    check('admin sees who hid it and why', page.get_by_text(REASON, exact=False).count() > 0)

    check('public page gone while hidden', 'not found' in guest.request.get(PUBLIC).text())
    client.reload()
    settle(client)
    client.get_by_text('Hidden by Rentra', exact=True).first.wait_for()
    check('owner sees the restriction reason', client.get_by_text(REASON, exact=False).count() > 0)
    check('owner has no resume control while hidden', client.get_by_role('button', name='Take bookings again').count() == 0)
    refused = owner.request.post(f'{API}/partner/listings/{listing}/pause', multipart={'id': listing})
    check('owner resume API cannot undo the restriction', refused.status == 422 and 'Only Rentra can restore it' in refused.text())
    check('still hidden after the owner attempt', lifecycle()['status'] == 'hidden')

    record = customer.request.get(f'{API}/customer/records/{booking["order"]}')
    check('customer booking record stays available', record.status == 200 and record.json()['data']['title'] == 'Review River Farm (as booked)')
    check('customer keeps arrival details', (record.json()['data'].get('arrival') or {}).get('address') == '12 Private Lane')
    trip = customer.new_page()
    trip.goto(f'{WEB}/bookings/{booking["order"]}')
    settle(trip)
    check('customer booking page shows the accepted snapshot', trip.get_by_text('Review River Farm (as booked)', exact=False).count() > 0)

    # Restore returns to the owner's pause; the owner resumes.
    page.get_by_label('Reason for restoring').fill('Investigation closed with no issue found.')
    page.get_by_role('button', name='Restore property', exact=True).click()
    page.get_by_role('heading', name='Hide (admin restriction)').wait_for()
    check('UI restore returns to the owner pause', lifecycle()['status'] == 'paused')
    client.reload()
    settle(client)
    client.get_by_role('button', name='Take bookings again').click()
    client.get_by_text('This property is live', exact=True).first.wait_for()
    check('owner resumes after restore', lifecycle()['status'] == 'live')

    # A trust edit while hidden sends the property to review on restore.
    state = lifecycle()
    check('API hide succeeds on the current version', admin.request.post(f'{base}/hide', data={'expectedVersion': state['version'], 'reason': REASON}).status == 200)
    edit = owner.request.post(f'{API}/partner/listings/{listing}/capacity', multipart={'id': listing, 'capacity': '14', 'bedrooms': '0', 'farmSize': '2', 'farmSizeUnit': 'acre'})
    state = lifecycle()
    check('owner trust edit while hidden keeps the restriction', edit.status == 200 and state['status'] == 'hidden')
    check('restore target becomes review after a trust edit', state['restore']['target'] == 'pending_review')
    page.goto(tab('visibility'))
    settle(page)
    check('restore preview states the review requirement', page.get_by_text('must resubmit', exact=False).count() > 0)
    page.get_by_label('Reason for restoring').fill('Owner corrected the capacity; needs review.')
    page.get_by_role('button', name='Restore property', exact=True).click()
    page.get_by_role('heading', name='Hide (admin restriction)').wait_for()
    check('restore never publishes unreviewed trust content', lifecycle()['status'] == 'pending_review')
    check('correction refused while in review', admin.request.post(f'{base}/correction', data={'expectedContentVersion': lifecycle()['contentVersion'], 'reason': REASON, 'title': 'Review River Farm Renamed'}).status == 409)
    check('visibility tab explains why correction is unavailable', page.get_by_text('through the review decision', exact=False).count() > 0)

    # Resubmission and revision comparison against the published revision.
    submitted = owner.request.post(f'{API}/partner/listings/{listing}/submit', multipart={'id': listing})
    current = detail()['current']
    check('owner resubmits the edited revision', submitted.status < 400 and current['passNumber'] == 2)
    page.goto(tab('submission'))
    settle(page)
    page.get_by_role('heading', name='Changes since pass 1 (published)').wait_for()
    changes = page.get_by_role('region', name='Revision changes')
    check('comparison shows the capacity change', changes.get_by_role('row', name='Capacity 12 14').count() == 1)
    check('comparison omits unchanged fields', changes.get_by_role('row', name='Title', exact=False).count() == 0)
    scan(page, 'submission comparison')

    # Back to live through the reviewed path, then a documented correction.
    sid = current['id']
    check('re-approval recorded', admin.request.post(f'{base}/decision', data={'submissionId': sid, 'outcome': 'approved_for_visit', 'reason': 'Capacity change checked'}).status == 200)
    visit = admin.request.post(f'{base}/verifications', data={'submissionId': sid, 'mode': 'video_call', 'scheduledAt': when(2)}).json()['data']
    admin.request.post(f'{base}/verifications/{visit["visitId"]}/outcome', data={'expectedVersion': 1, 'outcome': 'passed', 'findings': 'Video walk-through confirmed the new capacity.', 'checklist': CHECKLIST})
    check('re-verified revision publishes', admin.request.post(f'{base}/publish', data={'submissionId': sid}).status == 200)
    stale = lifecycle()['contentVersion']
    page.goto(tab('visibility'))
    settle(page)
    page.get_by_label('Title', exact=True).fill('Review River Farm Corrected')
    page.get_by_label('Reason for the correction (shown to the client)').fill('Removed a misleading claim from the title.')
    page.get_by_role('button', name='Save correction', exact=True).click()
    page.wait_for_function('v => document.body.innerText.includes(v)', arg='Review River Farm Corrected')
    after = detail()
    check('UI correction keeps the property live', after['property']['status'] == 'live' and after['property']['title'] == 'Review River Farm Corrected')
    check('correction keeps the published revision', after['publication']['publishedSubmissionId'] == sid)
    check('stale correction refused', admin.request.post(f'{base}/correction', data={'expectedContentVersion': stale, 'reason': REASON, 'title': 'Another Title Attempt'}).status == 409)
    public = guest.new_page()
    public.goto(PUBLIC.replace('review-farm', 'review-river-farm-corrected'))
    settle(public)
    check('public page shows the corrected title', public.get_by_role('heading', name='Review River Farm Corrected').count() > 0)
    client.reload()
    settle(client)
    check('owner is told about the correction', client.get_by_text('Rentra corrected', exact=False).count() > 0)

    # History and preserved booking snapshot.
    page.goto(tab('history'))
    settle(page)
    page.get_by_role('heading', name='Activity').wait_for()
    for label in ['Hidden by Rentra', 'Restored by Rentra', 'Corrected by Rentra', 'Paused by the client', 'Resumed by the client']:
        check(f'activity shows {label}', page.get_by_text(label, exact=True).count() > 0)
    scan(page, 'history tab')
    record = customer.request.get(f'{API}/customer/records/{booking["order"]}').json()['data']
    check('accepted booking snapshot unchanged by edits and correction', record['title'] == 'Review River Farm (as booked)')
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp08-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
