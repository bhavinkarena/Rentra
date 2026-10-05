"""Phase 12 release gate: complete journey, recovery, keyboard, route sweep and permissions.

Disposable localhost fixture only (admin-experience-browser.mjs with ADMIN_REVIEW_FIXTURE,
ADMIN_COMMS_FIXTURE and ADMIN_SEARCH_FIXTURE, then seed-admin-release-gate.mjs). No providers.
RELEASE_ONLY=journey,recovery,keyboard,sweep,permissions runs a subset while iterating.
"""
import base64, hashlib, hmac, json, os, re, struct, subprocess, time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse, quote
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)
web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3172')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4172/api/v1')
assert all(urlparse(x).hostname in ['localhost', '127.0.0.1'] for x in [web, api])
f = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
assert urlparse(f['databaseUrl']).hostname == '127.0.0.1' and urlparse(f['databaseUrl']).path.startswith('/rentra_test_')
root = Path(__file__).resolve().parents[2]
out = root / 'docs/evidence/admin-phase12'
out.mkdir(parents=True, exist_ok=True)
axe = (root / 'node_modules/axe-core/axe.min.js').read_text()
only = set(filter(None, os.environ.get('RELEASE_ONLY', '').split(',')))
r = {'scope': 'Disposable localhost; no providers or deployment', 'checks': [], 'accessibility': [], 'routes': [], 'permissions': {}, 'pageErrors': [], 'consoleErrors': []}
WIDTHS = [320, 640, 768, 1280]  # 320/640 CSS px = 1280 px at 400%/200% zoom.


def passed(name):
    r['checks'].append(name)
    print('PASS', name, flush=True)


def sql(command):
    return subprocess.run(['psql', f['databaseUrl'], '-Atc', command], check=True, capture_output=True, text=True).stdout.strip()


def code(secret):
    key = base64.b32decode(secret + '=' * ((-len(secret)) % 8))
    digest = hmac.new(key, struct.pack('>Q', int(time.time()) // 30), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return str((struct.unpack('>I', digest[offset:offset + 4])[0] & 0x7fffffff) % 1000000).zfill(6)


def settle(page):
    try:
        page.wait_for_load_state('networkidle', timeout=8000)
    except Exception:  # Polling pages (job progress, health) never go idle; record which.
        r.setdefault('neverIdle', []).append(urlparse(page.url).path) if urlparse(page.url).path not in r.get('neverIdle', []) else None
        page.wait_for_load_state('load')
    page.evaluate('document.fonts.ready')


def contained(page, label):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'page overflow: ' + label
    # Wide tables must scroll inside their own region, never the page.
    loose = page.evaluate("""() => [...document.querySelectorAll('main table')].filter(t => {
      if (t.getBoundingClientRect().width <= document.documentElement.clientWidth) return false;
      for (let e = t.parentElement; e; e = e.parentElement) if (/(auto|scroll)/.test(getComputedStyle(e).overflowX)) return false;
      return true;
    }).length""")
    assert not loose, 'uncontained table: ' + label


def visit(page, path):
    page.goto(web + path)
    settle(page)
    expect(page.get_by_role('heading', level=1).first).to_be_visible()
    contained(page, path)


def audit(page, name):
    page.add_script_tag(content=axe)
    v = page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
    r['accessibility'].append({'screen': name, 'violations': v})
    assert not v, name + ' ' + json.dumps(v)


def watch(page):
    page.on('pageerror', lambda e: r['pageErrors'].append({'url': page.url, 'message': str(e)}))
    page.on('console', lambda m: m.type == 'error' and re.search('hydrat|did not match', m.text, re.I) and r['consoleErrors'].append({'url': page.url, 'message': m.text[:300]}))


def context(browser, role=None, width=1280, **extra):
    c = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce', **extra)
    if role:
        c.add_cookies([{'name': 'rentra_admin', 'value': f['tokens'][role], 'url': web}])
    return c


def journey(browser):
    """ADM-QA-01: one operator from sign-in/2FA through review, publication, case, refund, support and audit."""
    c = context(browser)
    page = c.new_page(); watch(page)
    page.goto(web + '/admin')
    page.wait_for_url('**/admin/login?session=ended')
    expect(page.get_by_text('Sign in again to continue.', exact=False)).to_be_visible()
    audit(page, 'login-session-ended')
    page.get_by_label('Email', exact=True).fill(f['totp']['email'])
    page.get_by_label('Password', exact=True).fill('not-the-password')
    page.get_by_role('button', name='Sign in', exact=True).click()
    password = page.get_by_label('Password', exact=True)
    expect(password).to_have_attribute('aria-invalid', 'true')
    expect(page.locator('#' + password.get_attribute('aria-describedby'))).to_have_text('Those details are not right.')
    expect(page.get_by_label('Email', exact=True)).to_have_value(f['totp']['email'])
    audit(page, 'login-field-error')
    password.fill(f['password'])
    page.get_by_role('button', name='Sign in', exact=True).click()
    totp = page.get_by_label(re.compile('^Authenticator code'))
    expect(totp).to_have_attribute('aria-invalid', 'true')
    expect(page.locator('#' + totp.get_attribute('aria-describedby'))).to_have_text('Enter your 6-digit authenticator code.')
    page.get_by_label('Password', exact=True).fill(f['password'])
    totp.fill(code(f['totp']['secret']))
    page.get_by_role('button', name='Sign in', exact=True).click()
    page.wait_for_url(web + '/admin')
    expect(page.get_by_role('heading', name='Dashboard', exact=True)).to_be_visible()
    operator = f['totp']['id']
    assert sql(f"SELECT count(*) FROM auth_session WHERE admin_id='{operator}' AND revoked_at IS NULL") == '1'
    passed('Password and authenticator sign-in: linked field errors, retained email, one live session, dashboard landing')

    application = f['review']['decisions']['approve']
    page.locator(f'main a[href^="/admin/applications/{application}"]').first.click()
    page.wait_for_url(f'**/admin/applications/{application}**')
    settle(page)
    page.get_by_role('navigation', name='Record sections').get_by_role('link', name='Decision', exact=True).click()
    page.wait_for_url('**tab=decision**')
    page.get_by_role('button', name='Approve', exact=True).click()
    page.get_by_role('button', name='Approve and activate', exact=True).click()
    page.wait_for_url('**decided=approved**')
    settle(page)
    expect(page.get_by_text('Approved. They can add properties now', exact=False)).to_be_visible()
    assert sql(f"SELECT status FROM client_application WHERE id='{application}'") == 'approved'
    passed('Dashboard attention link opens the application; approval commits and returns to the queue')

    prop = f['review']['property']
    visit(page, '/admin/properties?status=pending_review&submitted=1')
    page.locator(f'main a[href^="/admin/properties/{prop}"]').first.click()
    page.wait_for_url(f'**/admin/properties/{prop}**')
    page.get_by_role('navigation', name='Record sections').get_by_role('link', name='Review decision', exact=True).click()
    page.wait_for_url('**tab=decision**')
    settle(page)
    claim = page.get_by_role('button', name=re.compile('^(Claim|Assign to me|Take over)'))
    if claim.count():
        claim.first.click(); settle(page)
    page.locator('select[name="outcome"]').select_option('approved_for_visit')
    page.get_by_label(re.compile('^Reason shown')).fill('Submission is complete and ready for a verification visit.')
    page.get_by_role('button', name='Record decision', exact=True).click()
    expect(page.get_by_role('region', name='Latest recorded property decision')).to_contain_text('approved for visit')
    page.get_by_role('navigation', name='Record sections').get_by_role('link', name='Verification', exact=True).click()
    page.wait_for_url('**tab=verification**')
    settle(page)
    remote = page.locator('input[name="mode"][value="remote"]')
    if remote.count():
        remote.check()
    page.get_by_label(re.compile(r'^When \(India')).fill((datetime.now() + timedelta(days=2)).strftime('%Y-%m-%dT11:00'))
    page.get_by_role('button', name='Schedule verification', exact=True).click()
    expect(page.get_by_role('button', name='Record verification outcome', exact=True)).to_be_visible()
    page.locator('select[name="outcome"]').select_option('passed')
    for box in page.locator('input[name="checklist"]').all():
        box.check()
    page.get_by_label(re.compile('^Findings')).fill('Every checklist item was confirmed with the owner during the verification visit.')
    for name, value in [('geoLat', '21.1702'), ('geoLng', '72.8311')]:
        field = page.locator(f'input[name="{name}"]')
        if field.count():
            field.fill(value)
    page.get_by_role('button', name='Record verification outcome', exact=True).click()
    publish = page.get_by_role('button', name='Publish this revision', exact=True)
    expect(publish).to_be_visible()
    page.get_by_label(re.compile('^I have checked the verification evidence')).check()
    publish.click()
    expect(publish).to_have_count(0, timeout=20000)
    assert sql(f"SELECT status FROM rentable WHERE id='{prop}'") == 'live'
    page.reload(); settle(page)
    expect(page.get_by_text('Published', exact=False).first).to_be_visible()
    passed('Property decision, scheduled verification, passed checklist and exact-revision publication')

    case = f['bookings']['case']
    visit(page, f'/admin/booking-cases?state=open&case={case}')
    sheet = page.get_by_role('dialog')
    sheet.get_by_label('Cancel the listed visits (previewed)', exact=True).check()
    sheet.get_by_label('Resolution note', exact=True).fill('The owner cannot host this visit; refund the verified Test payment.')
    sheet.get_by_role('button', name='Preview effects', exact=True).click()
    expect(sheet.get_by_role('status', name='Resolution preview')).to_be_visible()
    sheet.get_by_role('button', name='Confirm: cancel', exact=False).click()
    settle(page)
    expect(sheet.get_by_role('heading', name='Resolve', exact=True)).to_have_count(0)
    assert sql(f"SELECT state FROM booking_case WHERE id='{case}'") == 'resolved'
    passed('Booking case preview and confirmation cancel the exact visit')

    order = f['bookings']['paidOrder']
    visit(page, '/admin/finance/refunds?environment=test&source=booking_case')
    refund = page.locator('main a[href^="/admin/finance/refunds/"]').first
    expect(refund).to_be_visible()
    refund.click()
    page.wait_for_url('**/admin/finance/refunds/**')
    settle(page)
    expect(page.locator('main')).to_contain_text('Test')
    refunds = sql(f"SELECT count(*) FROM refund rf JOIN payment_transaction t ON t.id=rf.transaction_id JOIN payment_attempt a ON a.id=t.attempt_id JOIN payment_order p ON p.id=a.payment_order_id WHERE p.booking_order_id='{order}'")
    assert refunds == '1', refunds
    audit(page, 'journey-refund-detail')
    passed('Exactly one Test refund obligation is visible as finance evidence; no provider call')

    support = f['support']
    visit(page, f'/admin/support/{support}')
    page.get_by_label('Your reply', exact=True).fill('We checked the calendar and confirmed availability for your visit.')
    page.get_by_role('button', name='Save reply and status', exact=True).click()
    settle(page)
    expect(page.get_by_text('We checked the calendar and confirmed availability for your visit.', exact=True)).to_be_visible()
    expect(page.get_by_label('Your reply', exact=True)).to_have_value('')
    passed('Support reply is saved to the conversation and the draft clears')

    visit(page, '/admin/audit')
    events = sql(f"SELECT string_agg(DISTINCT action, ',' ORDER BY action) FROM audit_log WHERE actor_type='admin' AND actor_id='{operator}'").split(',')
    for action in ['admin_login', 'application_approved']:
        assert any(action in e for e in events), (action, events)
    assert len(events) >= 5, events
    page.locator('select[name="actorType"]').select_option('admin') if page.locator('select[name="actorType"]').count() else None
    actor = page.locator('input[name="actorId"]')
    if actor.count():
        actor.fill(operator)
    page.locator('main form').first.get_by_role('button').last.click()
    settle(page)
    expect(page.get_by_role('region', name=re.compile('Audit')).locator('tbody tr').first).to_be_visible()
    r['journeyAuditActions'] = events
    page.screenshot(path=str(out / 'journey-audit-1280.png'), full_page=True)
    audit(page, 'journey-audit')
    passed('Audit history records the operator journey: ' + ', '.join(events))

    page.get_by_role('button', name='Sign out', exact=True).click()
    page.wait_for_url(web + '/admin/login')
    assert sql(f"SELECT count(*) FROM auth_session WHERE admin_id='{operator}' AND revoked_at IS NULL") == '0'
    passed('Sign-out revokes the session and returns to sign-in')
    c.close()


def recovery(browser):
    """ADM-QA-04: revoked/expired sessions recover through sign-in without losing the destination record."""
    reviewer = f['ids']['admin']
    c = context(browser)
    page = c.new_page(); watch(page)
    page.goto(web + '/admin/login')
    page.get_by_label('Email', exact=True).fill('reviewer@fixture.invalid')
    page.get_by_label('Password', exact=True).fill(f['password'])
    page.get_by_role('button', name='Sign in', exact=True).click()
    page.wait_for_url(web + '/admin')
    # Only the session this sign-in created; fixture tokens for the same operator stay valid.
    session = sql(f"SELECT id FROM auth_session WHERE admin_id='{reviewer}' ORDER BY created_at DESC LIMIT 1")
    visit(page, '/admin/support/' + f['support'])
    draft = 'Draft written before the session was revoked.'
    page.get_by_label('Your reply', exact=True).fill(draft)
    sql(f"UPDATE auth_session SET revoked_at=now() WHERE id='{session}'")
    page.get_by_role('button', name='Save reply and status', exact=True).click()
    settle(page)
    refusal = page.get_by_role('alert').filter(has_text='entry is kept')
    expect(refusal).to_contain_text('/admin/login')
    expect(page.get_by_label('Your reply', exact=True)).to_have_value(draft)
    r['revokedActionOutcome'] = refusal.inner_text()
    assert sql(f"SELECT count(*) FROM support_message WHERE body='{draft}'") == '0'
    page.reload(); settle(page)
    page.wait_for_url('**/admin/login?session=ended')
    expect(page.get_by_text('Sign in again to continue.', exact=False)).to_be_visible()
    passed('Revoked session refuses the write, keeps the draft and explains recovery; the next load redirects to sign-in')
    sql(f"UPDATE auth_session SET revoked_at=NULL, expires_at=now()-interval '1 minute' WHERE id='{session}'")
    page.goto(web + '/admin/bookings'); page.wait_for_url('**/admin/login?session=ended')
    page.get_by_label('Email', exact=True).fill('reviewer@fixture.invalid')
    page.get_by_label('Password', exact=True).fill(f['password'])
    page.get_by_role('button', name='Sign in', exact=True).click()
    page.wait_for_url(web + '/admin')
    passed('Expired session redirects to sign-in and signing in restores the workspace')
    c.close()


def keyboard(browser):
    """ADM-QA-03: skip link, visible focus, drawer/sheet focus handling, reduced motion."""
    c = context(browser, 'full')
    page = c.new_page(); watch(page)
    visit(page, '/admin')
    page.keyboard.press('Tab')
    skip = page.evaluate('document.activeElement.textContent.trim()')
    assert skip == 'Skip to main content', skip
    page.keyboard.press('Enter')
    unseen = []
    for _ in range(25):
        page.keyboard.press('Tab')
        style = page.evaluate("""() => { const e = document.activeElement, s = getComputedStyle(e);
          return {tag: e.tagName, name: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40),
            visible: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none'}; }""")
        if not style['visible']:
            unseen.append(style)
    assert not unseen, unseen
    passed('Skip link is first; 25 sequential focus stops all show a visible indicator')

    visit(page, '/admin/bookings')
    opener = page.get_by_role('link', name=re.compile('^Open booking')).first
    opener.focus(); page.keyboard.press('Enter')
    sheet = page.get_by_role('dialog')
    expect(sheet).to_be_visible()
    inside = []
    for _ in range(40):
        page.keyboard.press('Tab')
        # Native modal dialogs pass through the browser chrome (body) but never reach page controls.
        inside.append(page.evaluate('() => document.activeElement === document.body || !!document.activeElement.closest("[role=dialog], dialog")'))
    assert all(inside), 'focus left the booking sheet'
    page.keyboard.press('Escape')
    expect(sheet).to_have_count(0)
    page.wait_for_function('() => document.activeElement && document.activeElement.textContent.includes("Open booking") || (document.activeElement.getAttribute("aria-label")||"").startsWith("Open booking")')
    passed('Booking sheet keeps focus off background controls over 40 Tab presses; Escape closes it and restores focus to the row')

    page.set_viewport_size({'width': 360, 'height': 800})
    visit(page, '/admin/support')
    page.get_by_role('button', name='Open navigation', exact=True).click()
    drawer = page.get_by_role('dialog', name='Admin navigation')
    expect(drawer).to_be_visible()
    for _ in range(30):
        page.keyboard.press('Tab')
        assert page.evaluate('() => document.activeElement === document.body || !!document.activeElement.closest("[role=dialog], dialog")'), 'focus left drawer'
    page.keyboard.press('Escape')
    expect(page.get_by_role('button', name='Open navigation', exact=True)).to_be_focused()
    passed('Mobile navigation drawer keeps focus and restores it on Escape')

    moving = page.evaluate("""() => [...document.querySelectorAll('*')].filter(e => { const s = getComputedStyle(e);
      return s.animationName !== 'none' && parseFloat(s.animationDuration) > 0.01 && s.animationIterationCount === 'infinite'; }).length""")
    durations = page.evaluate("""() => [...document.querySelectorAll('main *')].map(e => parseFloat(getComputedStyle(e).transitionDuration) || 0).filter(x => x > 0.01).length""")
    assert moving == 0 and durations == 0, (moving, durations)
    passed('Reduced motion removes infinite animation and transition durations')
    c.close()


def routes():
    pages = sorted(p.relative_to(root / 'app/(admin)/admin').parent.as_posix() for p in (root / 'app/(admin)/admin').rglob('page.js'))
    return ['/admin' + ('' if p == '.' else '/' + p) for p in pages]


SAMPLES = {
    '/admin/catalogues/[type]': '/admin/catalogues/categories',
    '/admin/content/[kind]': '/admin/content/owner_help',
    '/admin/finance/refunds/new': '/admin/finance/refunds/new?order={paid}',
    '/admin/disputes/new': '/admin/disputes/new?order={paid}',
}
SEEDS = ['/admin', '/admin/applications?status=all', '/admin/properties?status=all', '/admin/reviews', '/admin/bookings?tab=all',
         '/admin/booking-cases?state=all', '/admin/clients?status=all', '/admin/customers?status=all', '/admin/finance/payments?environment=all',
         '/admin/finance/refunds?environment=all', '/admin/finance/statements?environment=all', '/admin/finance/payouts?environment=all',
         '/admin/disputes', '/admin/support?state=all', '/admin/notifications', '/admin/operations', '/admin/privacy', '/admin/audit',
         '/admin/audit/exports', '/admin/catalogues/categories', '/admin/security']


def sweep(browser):
    """ADM-QA-02/03: every admin page at four widths, contained, error-free and axe-clean."""
    c = context(browser, 'full')
    page = c.new_page(); watch(page)
    found = set()
    for seed in SEEDS:
        page.goto(web + seed); settle(page)
        found.update(page.evaluate("() => [...document.querySelectorAll('main a[href^=\"/admin/\"]')].map(a => a.getAttribute('href').split(/[?#]/)[0])"))
    targets, missing = [], []
    for route in routes():
        if route in ['/admin/login', '/admin/enroll']:
            continue
        if route in SAMPLES:
            targets.append((route, SAMPLES[route].format(paid=f['bookings']['paidOrder']))); continue
        if '[' not in route:
            targets.append((route, route)); continue
        pattern = '^' + re.sub(r'\\\[[^/]+?\\\]', '[^/]+', re.escape(route)) + '$'
        hit = sorted(h for h in found if re.match(pattern, h) and not re.search('/(new|history|exports)$', h))
        (targets.append((route, hit[0])) if hit else missing.append(route))
    r['routesNotDiscovered'] = missing
    for route, path in targets:
        row = {'route': route, 'path': path, 'widths': []}
        for width in WIDTHS:
            page.set_viewport_size({'width': width, 'height': 900})
            response = page.goto(web + path); settle(page)
            assert response.status < 500, (path, response.status)
            expect(page.get_by_role('heading', level=1).first).to_be_visible()
            assert not page.get_by_text('This page could not load', exact=False).count(), path
            contained(page, f'{path} @ {width}')
            if width in [320, 1280]:
                audit(page, f'{route}@{width}')
            row['widths'].append(width)
        r['routes'].append(row)
        print('  route', route, flush=True)
    for name, path, roleless in [('login', '/admin/login', True), ('enroll', '/admin/enroll', True)]:
        a = context(browser, None if roleless else 'full', width=320)
        p = a.new_page(); watch(p); visit(p, path); audit(p, name + '@320'); a.close()
    page.set_viewport_size({'width': 320, 'height': 900})
    for name, path in [('dashboard', '/admin'), ('bookings', '/admin/bookings?tab=all'), ('payments', '/admin/finance/payments?environment=all')]:
        visit(page, path)
        page.screenshot(path=str(out / f'{name}-320.png'), full_page=True)
    passed(f'{len(targets) + 2} admin pages at {WIDTHS} px: no page overflow, contained tables, no load failures, axe-clean at 320/1280')
    c.close()


def permissions(browser):
    """ADM-QA-05: API capability matrix plus direct URLs for an operator with no grants."""
    manifest = json.loads(Path(os.environ['ADMIN_API_ROUTES']).read_text())
    c = context(browser)
    ids = {'id': '00000000-0000-4000-8000-000000000000', 'orderId': '00000000-0000-4000-8000-000000000000', 'code': 'fixture', 'type': 'categories', 'kind': 'owner_help'}
    leaks, readable, read_writes = [], 0, []
    for row in manifest:
        if not row['capability']:
            continue
        path = re.sub(r':(\w+)', lambda m: ids.get(m.group(1), ids['id']), row['path'])
        for role in ['searchEmpty', 'readonly']:
            if role == 'readonly' and row['capability'].endswith('.read'):
                continue
            response = c.request.fetch(api + '/admin' + path, method=row['method'], headers={'Cookie': 'rentra_admin=' + f['tokens'][role]}, data={} if row['method'] != 'GET' else None, max_redirects=0)
            if response.status != 403:
                leaks.append({'role': role, 'method': row['method'], 'path': row['path'], 'status': response.status})
            if role == 'readonly':
                read_writes.append(row['path'])
        if row['method'] == 'GET':
            status = c.request.get(api + '/admin' + path, headers={'Cookie': 'rentra_admin=' + f['tokens']['readonly']}).status
            assert status != 403, ('readonly denied read', row['path'], status)
            readable += 1
    r['permissions'] = {'routes': len(manifest), 'protected': sum(1 for x in manifest if x['capability']), 'readonlyWritesRefused': len(read_writes), 'readonlyReadsAllowed': readable, 'unexpected': leaks}
    assert not leaks, leaks
    passed(f"API matrix: {r['permissions']['protected']} protected routes refuse the no-grant operator; {len(read_writes)} writes refuse read-only; {readable} reads allow read-only")

    a = context(browser, 'searchEmpty', width=768)
    page = a.new_page(); watch(page)
    exposed = []
    for route in routes():
        if '[' in route or route in ['/admin/login', '/admin/enroll', '/admin/help', '/admin']:
            continue
        response = page.goto(web + route); settle(page)
        assert response.status < 500, (route, response.status)
        if page.locator('main table tbody tr').count():
            exposed.append(route)
    assert not exposed, exposed
    visit(page, '/admin')
    expect(page.get_by_role('heading', name='No dashboard modules assigned', exact=True)).to_be_visible()
    audit(page, 'no-grant-home')
    passed('No-grant operator direct URLs render no records and no server errors')
    a.close()


with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        for name, step in [('journey', journey), ('recovery', recovery), ('keyboard', keyboard), ('sweep', sweep), ('permissions', permissions)]:
            if not only or name in only:
                step(browser)
        assert not r['pageErrors'], r['pageErrors']
        assert not r['consoleErrors'], r['consoleErrors']
        passed('Zero page errors and zero hydration console errors')
    finally:
        name = 'browser-results.json' if not only else 'browser-results-partial.json'
        (out / name).write_text(json.dumps(r, indent=2) + '\n')
        browser.close()
