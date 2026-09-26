"""CP16 browser/API gate: caretaker invitation, acceptance, scoped access, reassignment, revocation.
Requires serve-property-review.mjs with FIXTURE_STAGE=published and DEV_OTP_BYPASS=true (API :4106),
then seed-pricing-operations-gate.mjs (a visit in progress), and isolated Next on :3106.
GATE_TOKENS points to that disposable fixture's JSON.
"""
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens, ids, booking = fixture['tokens'], fixture['ids'], fixture['booking']
listing, order = ids['listing'], booking['order']
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
PHONE, NAME = '9876543210', 'Ramesh Caretaker'
axe = (Path(__file__).parents[2] / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = []
ist = timezone(timedelta(hours=5, minutes=30))


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

    admin, owner, other = context('admin'), context('owner'), context('other')
    team = lambda: owner.request.get(f'{API}/partner/team').json()['data']

    # A second property of the same owner, for reassignment.
    cats = owner.request.get(f'{API}/partner/catalogue/categories').json()['data']
    places = owner.request.get(f'{API}/partner/catalogue/places').json()['data']
    city = next(c for c in places if c.get('areas'))
    created = owner.request.post(f'{API}/partner/listings', multipart={
        'categoryId': cats[0]['id'], 'title': 'Hillside Orchard Stay', 'cityId': city['id'], 'areaId': city['areas'][0]['id'],
        'description': 'A second farmhouse used to check that caretaker access follows reassignment.'})
    second = re.search(r'/partner/listings/([0-9a-f-]{36})', created.text()).group(1)

    # Owner team page, and the invitation made through it.
    page = owner.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(f'{WEB}/partner/team')
        settle(page)
        page.get_by_role('heading', name='Invite a caretaker').wait_for()
        scan(page, f'team page {width}px')
    page.set_viewport_size({'width': 1280, 'height': 950})
    check('guessed property id refused on invite', owner.request.post(f'{API}/partner/team/invite', multipart={'name': NAME, 'phone': PHONE, 'propertyIds': str(uuid.uuid4())}).status == 422)
    page.get_by_label('Name', exact=True).fill(NAME)
    page.get_by_label('Mobile number').fill(PHONE)
    page.get_by_role('checkbox', name='Review River Farm').check()
    page.get_by_role('checkbox', name=re.compile('May record handover')).uncheck()
    page.get_by_role('button', name='Create invitation link').click()
    link = page.get_by_label('Invitation link')
    link.wait_for()
    invite_url = link.input_value()
    check('invitation link shown once to the owner', '/staff/join/' in invite_url)
    member = team()['members'][0]
    check('member is invited, view only, on one property', member['state'] == 'invited' and not member['permissions']['evidence'] and len(member['properties']) == 1)
    check('duplicate invite for the same number refused', owner.request.post(f'{API}/partner/team/invite', multipart={'name': NAME, 'phone': PHONE, 'propertyIds': listing}).status == 409)
    check('another owner sees no team members', other.request.get(f'{API}/partner/team').json()['data']['members'] == [])
    check('another owner cannot revoke this caretaker', other.request.post(f'{API}/partner/team/{member["id"]}/revoke', multipart={'expectedVersion': str(member['version']), 'reason': 'Not mine'}).status == 404)
    check('admin session is not an owner session for team', admin.request.get(f'{API}/partner/team').status == 401)

    # The caretaker joins with the link and a phone code.
    staff_ctx = context()
    staff = staff_ctx.new_page()
    for width in [390]:
        staff.set_viewport_size({'width': width, 'height': 844})
        staff.goto(invite_url)
        settle(staff)
        staff.get_by_text('Review River Farm', exact=True).wait_for()
        scan(staff, f'join page {width}px')
    staff.get_by_role('button', name='Send code').click()
    staff.get_by_label('Code').wait_for()
    staff.get_by_label('Code').fill('000000')
    staff.get_by_role('button', name='Join and continue').click()
    staff.get_by_text('That code is not right', exact=False).first.wait_for()
    check('wrong code refused and nothing granted', staff_ctx.request.get(f'{API}/staff/me').status == 401)
    staff.get_by_label('Code').fill('123456')
    staff.get_by_role('button', name='Join and continue').click()
    staff.wait_for_url(re.compile(r'/staff$'))
    settle(staff)
    staff.get_by_role('heading', name=re.compile('Hello')).wait_for()
    check('caretaker lands on assigned visits', staff.get_by_text('view visits', exact=False).count() > 0)
    scan(staff, 'caretaker visits 390px')
    check('joined caretaker is active for the owner', team()['members'][0]['state'] == 'active')
    reuse = context().new_page()
    reuse.goto(invite_url)
    settle(reuse)
    check('a used link cannot be used again', reuse.get_by_role('heading', name='This link cannot be used').count() == 1)

    # Scope: assigned visits only, never money, customer identity, pricing, KYC or team.
    visits = staff_ctx.request.get(f'{API}/staff/visits?tab=action_needed').json()['data']
    check('in-progress visit needs the caretaker', any(v['orderId'] == order for v in visits['items']))
    detail = staff_ctx.request.get(f'{API}/staff/visits/{order}').json()['data']
    text = json.dumps(detail)
    check('visit detail carries arrival and owner contact', detail['arrival']['address'] == '12 Private Lane' and detail['arrival']['ownerName'] == 'Property Owner')
    check('visit detail has no money or guest contact', all(k not in text for k in ['Minor', 'payments', 'refund', '9000000077', 'booked-guest']))
    check('guessed booking id is not found', staff_ctx.request.get(f'{API}/staff/visits/{uuid.uuid4()}').status == 404)
    for path in ['/partner/listings', f'/partner/records/{order}', f'/partner/listings/{listing}/calendar', '/partner/documents', '/partner/team', '/partner/updates', '/admin/properties']:
        check(f'caretaker cookie refused on {path}', staff_ctx.request.get(f'{API}{path}').status == 401)
    visit_id = detail['visits'][0]['id']
    now = datetime.now(ist) - timedelta(minutes=5)
    transition = {'visitId': visit_id, 'phase': 'handover', 'version': str(detail['visits'][0]['version']),
                  'occurredAt': now.strftime('%Y-%m-%dT%H:%M'), 'note': 'Guest group received the keys at the gate.',
                  'attested': 'on', 'requestKey': str(uuid.uuid4())}
    check('view-only caretaker cannot record evidence', staff_ctx.request.post(f'{API}/staff/visits/transition', multipart=transition).status == 403)
    staff.goto(f'{WEB}/staff/visits/{order}')
    settle(staff)
    staff.get_by_text('12 Private Lane', exact=True).wait_for()
    check('view-only page offers no evidence form', staff.get_by_text(re.compile('^Record handover')).count() == 0)
    check('caretaker page shows no price', '₹' not in staff.content())
    scan(staff, 'caretaker visit 390px')

    # Owner grants evidence through the UI; the caretaker records the handover.
    page.goto(f'{WEB}/partner/team')
    settle(page)
    card = page.get_by_role('article', name=f'Caretaker {NAME}')
    card.get_by_text('Manage access').click()
    card.get_by_role('checkbox', name=re.compile('May record handover')).check()
    card.get_by_role('button', name='Save access').click()
    page.wait_for_function("() => document.body.innerText.includes('may record evidence')")
    stale = team()['members'][0]
    check('evidence grant persisted', stale['permissions']['evidence'])
    check('stale access change refused', owner.request.post(f'{API}/partner/team/{stale["id"]}/access', multipart={'expectedVersion': str(stale['version'] - 1), 'propertyIds': listing, 'evidence': 'on'}).status == 409)
    staff.reload()
    settle(staff)
    staff.get_by_text(re.compile('^Record handover')).first.click()
    staff.get_by_label('When it occurred (India time)').fill(now.strftime('%Y-%m-%dT%H:%M'))
    staff.get_by_label('Evidence: what you observed').fill('Guest group of two received the keys at the gate.')
    staff.get_by_role('checkbox', name=re.compile('I confirm this observation')).check()
    staff.get_by_role('button', name='Record handover').click()
    # The saved visit re-renders (new version), so wait for the recorded evidence itself.
    staff.get_by_text(f'Caretaker · {NAME}', exact=False).first.wait_for(timeout=60000)
    record = owner.request.get(f'{API}/partner/records/{order}').json()['data']
    evidence = record['visits'][0]['evidence'][0]
    check('handover recorded and attributed to the caretaker', evidence['actorKind'] == 'staff' and evidence['actorName'] == NAME)
    owner_page = owner.new_page()
    owner_page.goto(f'{WEB}/partner/bookings/{order}')
    settle(owner_page)
    check('owner booking shows the caretaker as recorder', owner_page.get_by_text(f'Caretaker · {NAME}', exact=False).count() > 0)

    # Reassignment applies on the next request.
    current = team()['members'][0]
    moved = owner.request.post(f'{API}/partner/team/{current["id"]}/access', multipart={'expectedVersion': str(current['version']), 'propertyIds': second, 'evidence': 'on'})
    check('owner reassigns the caretaker', moved.status == 200)
    check('reassigned caretaker loses the old booking', staff_ctx.request.get(f'{API}/staff/visits/{order}').status == 404)
    check('reassigned caretaker lists no old visits', staff_ctx.request.get(f'{API}/staff/visits?tab=action_needed').json()['data']['counts']['action_needed'] == 0)

    # Revocation ends the active session on the next request.
    page.goto(f'{WEB}/partner/team')
    settle(page)
    card = page.get_by_role('article', name=f'Caretaker {NAME}')
    card.get_by_text('Manage access').click()
    card.get_by_label('Reason for revoking').fill('Left the job')
    card.get_by_role('checkbox', name=re.compile('End their access now')).check()
    card.get_by_role('button', name='Revoke access').click()
    page.get_by_text('Revoked', exact=True).first.wait_for()
    check('revoked caretaker API session refused', staff_ctx.request.get(f'{API}/staff/me').status == 401)
    staff.goto(f'{WEB}/staff')
    staff.wait_for_url(re.compile(r'/staff/login\?session=ended'))
    check('revoked caretaker page sends them to sign in', True)
    login = context().new_page()
    login.goto(f'{WEB}/staff/login')
    settle(login)
    login.get_by_label('Mobile number').fill(PHONE)
    login.get_by_role('button', name='Send code').click()
    login.get_by_text('If this number has caretaker access', exact=False).wait_for()
    login.get_by_label('Code').fill('123456')
    login.get_by_role('button', name='Sign in').click()
    login.get_by_text('no active caretaker access', exact=False).first.wait_for()
    check('revoked number cannot sign in again', True)

    # A replaced invitation link stops working.
    again = owner.request.post(f'{API}/partner/team/invite', multipart={'name': NAME, 'phone': PHONE, 'propertyIds': listing}).json()['data']
    owner.request.post(f'{API}/partner/team/{again["staffId"]}/link')
    replaced = context().new_page()
    replaced.goto(f'{WEB}/staff/join/{again["token"]}')
    settle(replaced)
    check('a replaced link cannot be used', replaced.get_by_text('replaced or cancelled', exact=False).count() > 0)

    page.goto(f'{WEB}/partner/team')
    settle(page)
    for label in ['Invited', 'Joined', 'Access changed', 'Access revoked', 'New link issued']:
        check(f'membership history shows {label}', page.get_by_text(label, exact=True).count() > 0)
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp16-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
