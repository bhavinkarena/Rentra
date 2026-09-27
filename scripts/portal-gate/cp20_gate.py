"""CP20 browser/API gate: refund queue, detail, guarded provider commands and operator refunds.
Requires serve-property-review.mjs with FIXTURE_STAGE=published, FAKE_RAZORPAY_STATE and RAZORPAY_TEST_*
(API :4106), then seed-pricing-operations-gate.mjs and seed-payment-investigation-gate.mjs, and isolated
Next on :3106. GATE_TOKENS points to the fixture JSON; GATE_WEBHOOK_SECRET equals the fixture's secret.
"""
import hashlib
import hmac
import json
import os
import re
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib import request as http
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens = fixture['tokens']
paid = fixture['payments']['paid']
STATE = Path(os.environ['FAKE_RAZORPAY_STATE'])
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
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


def provider():
    return json.loads(STATE.read_text())


def edit_provider(change):
    state = provider()
    change(state)
    STATE.write_text(json.dumps(state))


def posts(receipt):
    return provider().get('refundPosts', []).count(receipt)


def set_refund(receipt, status):
    def change(state):
        for refund in state.get('refunds', {}).values():
            if refund['receipt'] == receipt:
                refund['status'] = status
    edit_provider(change)


def admin_post(path, data):
    """Plain HTTP (thread-safe) with the admin cookie, for concurrent commands."""
    req = http.Request(f'{API}{path}', data=json.dumps(data).encode(), method='POST',
                       headers={'Content-Type': 'application/json', 'Cookie': f'rentra_admin={tokens["admin"]}'})
    try:
        with http.urlopen(req) as res:
            return res.status, json.loads(res.read())
    except http.HTTPError as error:
        return error.code, json.loads(error.read() or b'{}')


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

    admin, owner, limited = context('admin'), context('owner'), context('limited')
    listing = lambda query='': admin.request.get(f'{API}/admin/payments/refunds{query}').json()['data']
    detail = lambda rid: admin.request.get(f'{API}/admin/payments/refunds/{rid}').json()['data']
    reconcile = lambda rid, key: admin.request.post(f'{API}/admin/payments/refunds/reconcile', data={'id': rid, 'requestKey': key})

    # Permissions.
    check('owner cookie refused on refunds', owner.request.get(f'{API}/admin/payments/refunds').status == 401)
    check('records-only operator cannot read refunds', limited.request.get(f'{API}/admin/payments/refunds').status == 403)
    for path in ['preview', 'request', 'reconcile']:
        check(f'records-only operator cannot {path}', limited.request.post(f'{API}/admin/payments/refunds/{path}', data={}).status == 403)
    check('malformed refund id refused', admin.request.get(f'{API}/admin/payments/refunds/not-a-uuid').status == 400)

    start = listing()
    r1 = next(i for i in start['items'] if i['orderId'] == paid['orderId'])
    check('customer cancellation refund is queued', r1['status']['key'] == 'queued' and r1['source'] == 'customer_cancellation')
    check('totals are per environment only', [t['environment'] for t in start['totals']] == ['test'])

    page = admin.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(f'{WEB}/admin/finance/refunds')
        settle(page)
        page.get_by_role('heading', name='Refunds', exact=True).first.wait_for()
        check(f'queue lists the queued refund {width}px', page.get_by_text('Queued', exact=True).filter(visible=True).count() > 0)
        scan(page, f'refund queue {width}px')
        page.goto(f'{WEB}/admin/finance/refunds/{r1["id"]}')
        settle(page)
        page.get_by_role('heading', name='Where this refund stands').first.wait_for()
        scan(page, f'refund detail {width}px')
    page.set_viewport_size({'width': 1280, 'height': 950})
    check('queued refund explains it is not refunded', page.get_by_text('Not sent to Razorpay yet', exact=False).count() > 0)

    # Timeout after provider acceptance: sent through the UI, response lost.
    edit_provider(lambda s: s.update(dropRefundResponses=1))
    page.get_by_role('button', name='Send to provider now').click()
    page.wait_for_function("() => /check with provider|uncertain/i.test(document.body.innerText)", timeout=60000)
    page.reload()
    settle(page)
    check('lost provider response reads as uncertain, not refunded', detail(r1['id'])['status']['key'] == 'uncertain' and page.get_by_text('Uncertain', exact=True).count() > 0)
    check('provider received the refund exactly once', posts(r1['id']) == 1)
    page.get_by_role('button', name='Check with provider').click()
    page.wait_for_function("() => /processing at provider/i.test(document.body.innerText)", timeout=60000)
    check('check finds the accepted refund without resending', detail(r1['id'])['status']['key'] == 'processing' and posts(r1['id']) == 1)

    # Repeated and concurrent operator commands.
    key = str(uuid.uuid4())
    first, again = reconcile(r1['id'], key).json()['data'], reconcile(r1['id'], key).json()['data']
    check('repeated command replays the first result', again.get('replayed') and again['outcome'] == first['outcome'])
    with ThreadPoolExecutor(3) as pool:
        list(pool.map(lambda _: admin_post('/admin/payments/refunds/reconcile', {'id': r1['id'], 'requestKey': str(uuid.uuid4())}), range(3)))
    check('concurrent commands never resend', posts(r1['id']) == 1)

    # The provider processes it; duplicate callbacks change nothing.
    set_refund(r1['id'], 'processed')
    page.reload()
    settle(page)
    page.get_by_role('button', name='Check with provider').click()
    page.wait_for_function("() => !/check with provider/i.test(document.body.innerText) && /refunded · verified/i.test(document.body.innerText)", timeout=60000)
    done = detail(r1['id'])
    check('provider-confirmed refund reads refunded with verified amount', done['status']['key'] == 'refunded' and done['actualMinor'] == done['expectedMinor'])
    check('refunded obligation offers no command', page.get_by_role('button', name=re.compile('provider')).count() == 0)
    remote = next(r for r in provider()['refunds'].values() if r['receipt'] == r1['id'])
    body = json.dumps({'event': 'refund.processed', 'payload': {'refund': {'entity': remote}}}).encode()
    signature = hmac.new(os.environ['GATE_WEBHOOK_SECRET'].encode(), body, hashlib.sha256).hexdigest()
    hooks = [admin.request.post('http://localhost:4106/webhooks/razorpay', headers={'content-type': 'application/json', 'x-razorpay-signature': signature, 'x-razorpay-event-id': event}, data=body).status for event in ['evt_CP20_A', 'evt_CP20_A', 'evt_CP20_B']]
    after_hooks = detail(r1['id'])
    check('duplicate callbacks accepted and stored once', hooks == [200, 200, 200] and len(after_hooks['events']) == 2)
    check('callbacks do not change the verified refund', after_hooks['actualMinor'] == done['actualMinor'] and after_hooks['status']['key'] == 'refunded')

    # Operator refund through the UI: previewed, capped and confirmed.
    order = admin.request.get(f'{API}/admin/payments/refunds/order/{paid["orderId"]}').json()['data']
    visit = next(v for v in order['visits'] if v['state'] == 'confirmed')
    page.goto(f'{WEB}/admin/finance/payments/{done["paymentOrderId"]}')
    settle(page)
    page.get_by_role('link', name='Request a refund').click()
    page.wait_for_url(re.compile(r'/admin/finance/refunds/new\?order='))
    settle(page)
    page.get_by_label('Visit').select_option(visit['id'])
    page.get_by_role('textbox', name='rent', exact=True).fill(str(visit['remainingMinor'] / 100 + 1))
    page.get_by_role('button', name='Preview refund').click()
    page.get_by_text('exceeds what remains refundable', exact=False).first.wait_for()
    check('over-cap refund is blocked in the preview', page.get_by_role('button', name='Request this refund').count() == 0)
    page.get_by_role('textbox', name='rent', exact=True).fill('500')
    page.get_by_role('button', name='Preview refund').click()
    page.get_by_role('region', name='Refund amounts by component').wait_for()
    scan(page, 'refund request preview')
    page.get_by_label('Reason (kept on the refund record)').fill('Goodwill for a broken pump')
    page.get_by_role('button', name='Request this refund').click()
    page.get_by_text('Refund requested', exact=False).first.wait_for(timeout=60000)
    operator = listing('?source=operator')
    check('operator refund recorded as one queued obligation', operator['total'] == 1 and operator['items'][0]['expectedMinor'] == 50000)

    # Concurrent requests cannot exceed the remaining captured funds.
    left = next(v for v in admin.request.get(f'{API}/admin/payments/refunds/order/{paid["orderId"]}').json()['data']['visits'] if v['id'] == visit['id'])['remainingMinor']
    ask = {'orderId': paid['orderId'], 'visitId': visit['id'], 'rent': 0, 'fee': 0, 'deposit': 0}
    rent_left = next(c for c in admin.request.post(f'{API}/admin/payments/refunds/preview', data=ask).json()['data']['preview']['components'] if c['component'] == 'rent')['remainingMinor']
    full = admin.request.post(f'{API}/admin/payments/refunds/preview', data={**ask, 'rent': rent_left}).json()['data']['preview']
    with ThreadPoolExecutor(2) as pool:
        raced = list(pool.map(lambda _: admin_post('/admin/payments/refunds/request', {**ask, 'rent': rent_left, 'reason': 'Rent returned after a pool closure', 'hash': full['hash'], 'requestKey': str(uuid.uuid4())}), range(2)))
    check('concurrent refunds: one accepted, one refused as stale', sorted(status for status, _ in raced) == [200, 409])
    after = next(c for c in admin.request.post(f'{API}/admin/payments/refunds/preview', data=ask).json()['data']['preview']['components'] if c['component'] == 'rent')
    check('no rent remains after the race', after['remainingMinor'] == 0 and after['capturedMinor'] >= after['refundedMinor'] + after['pendingMinor'])
    key = str(uuid.uuid4())
    fee_left = next(c for c in admin.request.post(f'{API}/admin/payments/refunds/preview', data=ask).json()['data']['preview']['components'] if c['component'] == 'fee')['remainingMinor']
    fee = admin.request.post(f'{API}/admin/payments/refunds/preview', data={**ask, 'fee': fee_left}).json()['data']['preview']
    one = admin.request.post(f'{API}/admin/payments/refunds/request', data={**ask, 'fee': fee_left, 'reason': 'Fee returned for a late check-in', 'hash': fee['hash'], 'requestKey': key}).json()['data']
    two = admin.request.post(f'{API}/admin/payments/refunds/request', data={**ask, 'fee': fee_left, 'reason': 'Fee returned for a late check-in', 'hash': fee['hash'], 'requestKey': key}).json()['data']
    check('replayed request returns the same obligation', two.get('replayed') and two['refundIds'] == one['refundIds'])
    check('reused key for a different refund refused', admin.request.post(f'{API}/admin/payments/refunds/request', data={**ask, 'fee': 1, 'reason': 'A different refund entirely', 'hash': fee['hash'], 'requestKey': key}).status == 409)

    # A refund Razorpay reports failed keeps its reservation and is never resent.
    r2 = one['refundIds'][0]
    reconcile(r2, str(uuid.uuid4()))
    set_refund(r2, 'failed')
    reconcile(r2, str(uuid.uuid4()))
    failed = detail(r2)
    check('provider-failed refund is labelled, not refunded', failed['status']['key'] == 'provider_failed' and failed['actualMinor'] == 0)
    check('provider-failed refund was sent once', posts(r2) == 1)
    page.goto(f'{WEB}/admin/finance/refunds/{r2}')
    settle(page)
    check('failed refund explains the recovery path', page.get_by_text('will not send another refund', exact=False).count() > 0)
    check('failed refund still cannot be refunded twice', next(c for c in admin.request.post(f'{API}/admin/payments/refunds/preview', data=ask).json()['data']['preview']['components'] if c['component'] == 'fee')['remainingMinor'] == 0)
    check('attention filter lists the failed refund', any(i['id'] == r2 for i in listing('?status=attention')['items']))
    gateway = admin.request.get(f'{API}/admin/payments/configuration').json()['data']['configuration']
    check('gateway disabled for new payments while existing refunds reconciled', gateway.get('enabled') is False and done['status']['key'] == 'refunded')
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp20-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
