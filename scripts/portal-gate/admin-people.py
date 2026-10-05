"""Phase 7 People gate; disposable localhost fixtures only."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3167')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4167/api/v1')
assert all(urlparse(url).hostname in ['127.0.0.1', 'localhost'] for url in [web, api])
fixture = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
assert urlparse(fixture['databaseUrl']).path.startswith('/rentra_test_')
root = Path(__file__).resolve().parents[2]
output = root / 'docs/evidence/admin-phase7'
output.mkdir(parents=True, exist_ok=True)
axe = (root / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = {'date': '2026-10-05', 'scope': 'Disposable localhost; no production/provider access', 'checks': [], 'pageErrors': [], 'accessibility': []}

def passed(name):
    results['checks'].append(name)
    print('PASS', name, flush=True)

def visit(page, path):
    page.goto(web + path)
    expect(page.get_by_role('heading', level=1).first).to_be_visible()
    page.evaluate('document.fonts.ready')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path

def audit(page, name):
    page.add_script_tag(content=axe)
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}))""")
    results['accessibility'].append({'screen': name, 'violations': violations})
    assert not violations, json.dumps(violations)
    passed(name + ' accessibility')

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        context = browser.new_context(viewport={'width':1280, 'height':900}, reduced_motion='reduce')
        def role(name):
            context.clear_cookies()
            context.add_cookies([{'name':'rentra_admin', 'value':fixture['tokens'][name], 'url':web}])
        page = context.new_page()
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        owner = fixture['ids']['owner']
        customer = fixture['booking']['customer']

        # RED: current People pages expose write forms to read-only operators.
        role('readonly')
        for kind, identifier in [('clients', owner), ('customers', customer)]:
            visit(page, f'/admin/{kind}/{identifier}?tab=account')
            expect(page.locator('main form')).to_have_count(0)
            expect(page.get_by_role('heading', name='Read-only access', exact=True).first).to_be_visible()
            headers = {'Cookie':'rentra_admin=' + fixture['tokens']['readonly']}
            command = 'suspend' if kind == 'clients' else 'restrict'
            denied = context.request.post(api + f'/admin/{kind}/{identifier}/{command}', headers=headers, multipart={'reason':'Unauthorized test', 'expectedVersion':'1'})
            assert denied.status == 403, denied.text()
            passed(kind + ' read-only UI and direct command denial')
        if os.environ.get('READONLY_ONLY') == '1':
            raise SystemExit(0)

        visit(page, f'/admin/clients/{owner}?tab=payout')
        expect(page.get_by_role('button', name='Preview impact', exact=True)).to_have_count(0)
        expect(page.get_by_role('heading', name='Read-only access', exact=True)).to_be_visible()
        passed('Read-only payout method history without failure command')

        role('customerReader')
        visit(page, f'/admin/customers/{customer}?tab=bookings')
        expect(page.get_by_role('link', name='Record', exact=False)).to_have_count(0)
        visit(page, f'/admin/clients/{owner}')
        expect(page.get_by_role('heading', name='You do not have access to this', exact=True)).to_be_visible()
        headers = {'Cookie':'rentra_admin=' + fixture['tokens']['customerReader']}
        for path in [f'/admin/clients/{owner}', f'/admin/documents/{fixture["ids"]["document"]}/file', f'/admin/users/{owner}/documents']:
            response = context.request.get(api + path, headers=headers)
            assert response.status == 403, (path, response.status)
        passed('Customer-only operator: related links hidden and direct owner/document URLs refused')

        role('full')
        for width in [1280, 768, 360]:
            page.set_viewport_size({'width':width, 'height':900})
            for kind, title, identifier in [('clients','Owners',owner), ('customers','Customers',customer)]:
                visit(page, f'/admin/{kind}')
                table = page.get_by_role('region', name=title + ' table', exact=True)
                expect(table.locator('th[scope="col"]')).to_have_count(7)
                expect(table.locator('caption')).to_have_text(title + ' table')
                table.focus()
                expect(table).to_be_focused()
                if width == 360:
                    assert table.evaluate('e => e.scrollWidth > e.clientWidth')
                controls = page.get_by_role('navigation', name='Filter by status').locator('a')
                assert controls.evaluate_all('items => items.every(e => e.getBoundingClientRect().height >= 44)')
                page.evaluate('window.scrollTo(0, 0)')
                page.screenshot(path=str(output / f'{kind}-{width}.png'), full_page=True)
                audit(page, f'{kind}-{width}')
                visit(page, f'/admin/{kind}/{identifier}?tab=account')
                expect(page.get_by_role('heading', name='Account controls', exact=True)).to_be_visible()
                page.screenshot(path=str(output / f'{kind}-account-{width}.png'), full_page=True)
                audit(page, f'{kind}-account-{width}')

        page.set_viewport_size({'width':1280, 'height':900})
        for kind, identifier, search in [('clients',owner,'Property'), ('customers',customer,'0077')]:
            visit(page, f'/admin/{kind}?page=2')
            expect(page.get_by_role('region', name=('Owners' if kind == 'clients' else 'Customers') + ' table', exact=True).locator('tbody tr').first).to_be_visible()
            page.get_by_role('navigation', name='Filter by status').get_by_role('link', name='Active', exact=False).click()
            page.wait_for_url(web + f'/admin/{kind}?status=active')
            passed(kind + ' status change resets pagination')
            back = f'/admin/{kind}?status=active&q={search}'
            visit(page, back)
            expect(page.get_by_role('region', name=('Owners' if kind == 'clients' else 'Customers') + ' table', exact=True).locator('tbody tr')).to_have_count(1)
            page.get_by_role('link', name='View', exact=False).filter(has_text='View').last.click()
            page.wait_for_url(f'**/admin/{kind}/{identifier}?from=**')
            page.get_by_role('navigation', name='Record sections').get_by_role('link', name='Activity log', exact=False).click()
            page.wait_for_url('**tab=history**')
            expect(page.get_by_role('heading', name='Activity log', exact=True)).to_be_visible()
            page.reload()
            expect(page.get_by_role('navigation', name='Record sections').locator('[aria-current="page"]')).to_have_count(1)
            page.get_by_role('navigation', name='Breadcrumb').get_by_role('link', name='Owners' if kind == 'clients' else 'Customers', exact=True).click()
            page.wait_for_url(lambda url: urlparse(url).path == f'/admin/{kind}' and parse_qs(urlparse(url).query) == {'status':['active'], 'q':[search]})
            passed(kind + ' literal search, record tabs, refresh and filtered return')
            visit(page, f'/admin/{kind}?q=no-match-fixture')
            expect(page.get_by_role('heading', name='No owners match this search' if kind == 'clients' else 'No customers match this search', exact=True)).to_be_visible()
            passed(kind + ' filtered empty state')

        for tab in ['overview', 'properties', 'visits', 'application', 'account', 'payout', 'history']:
            visit(page, f'/admin/clients/{owner}?tab={tab}')
            expect(page.get_by_role('navigation', name='Record sections').locator('[aria-current="page"]')).to_have_count(1)
        visit(page, f'/admin/clients/{owner}?tab=properties')
        expect(page.get_by_role('link', name='Review property', exact=False)).to_have_attribute('href', f'/admin/properties/{fixture["ids"]["listing"]}')
        visit(page, f'/admin/clients/{owner}?tab=application')
        expect(page.get_by_role('link', name='Open application review', exact=False)).to_be_visible()
        visit(page, f'/admin/clients/{owner}?tab=visits')
        expect(page.get_by_role('link', name='Booking', exact=False).last).to_have_attribute('href', f'/admin/bookings/{fixture["booking"]["order"]}')
        passed('Owner tabs and authorized application/property/booking links')
        for tab in ['overview', 'bookings', 'support', 'reviews', 'privacy', 'account', 'history']:
            visit(page, f'/admin/customers/{customer}?tab={tab}')
            expect(page.get_by_role('navigation', name='Record sections').locator('[aria-current="page"]')).to_have_count(1)
        passed('Customer record tabs remain reachable')
        visit(page, f'/admin/customers/{customer}?tab=support')
        expect(page.get_by_role('link', name='Open', exact=False).last).to_have_attribute('href', f'/admin/support/{fixture["people"]["support"]}')
        passed('Customer support record link retains real request ID')

        # Payout failure remains preview then apply, with retained reason on refusal.
        visit(page, f'/admin/clients/{owner}?tab=payout')
        disclosure = page.locator('details').filter(has=page.locator('input[name="destinationId"]'))
        disclosure.locator('summary').click()
        payout = disclosure.locator('form').first
        payout.locator('textarea[name="reason"]').fill('The bank account cannot receive payouts')
        payout.get_by_role('button', name='Preview impact', exact=True).click()
        expect(page.get_by_role('status', name='Failure impact preview', exact=True)).to_be_visible()
        headers = {'Cookie':'rentra_admin=' + fixture['tokens']['full']}
        response = context.request.post(api + f'/admin/clients/{owner}/payout-destinations/fail', headers=headers, multipart={'clientId':owner,'destinationId':fixture['people']['destination'],'expectedState':'submitted','reason':'Concurrent failure of payout method','mode':'apply','requestKey':'7216b458-40f7-4278-b155-f7141640bf9e'})
        assert response.status == 200, response.text()
        payout.get_by_role('button', name='Confirm: mark failed', exact=True).click()
        expect(payout.get_by_role('alert')).to_be_visible()
        expect(payout.locator('textarea[name="reason"]')).to_have_value('The bank account cannot receive payouts')
        passed('Payout preview and stale apply retain reason')

        visit(page, f'/admin/clients/{owner}?tab=account')
        lifecycle = page.locator('section#lifecycle form')
        lifecycle.locator('textarea[name="reason"]').fill('Retain owner lifecycle reason')
        lifecycle.locator('input[name="reviewed"]').check()
        response = context.request.post(api + f'/admin/clients/{owner}/suspend', headers=headers, multipart={'reason':'Concurrent suspension','expectedVersion':lifecycle.locator('input[name="expectedVersion"]').input_value()})
        assert response.status == 200, response.text()
        lifecycle.get_by_role('button', name='Suspend account', exact=True).click()
        expect(lifecycle.get_by_role('alert')).to_contain_text('changed')
        expect(lifecycle.locator('textarea[name="reason"]')).to_have_value('Retain owner lifecycle reason')
        expect(lifecycle.locator('input[name="reviewed"]')).to_be_checked()
        page.reload()
        lifecycle = page.locator('section#lifecycle form')
        lifecycle.locator('textarea[name="reason"]').fill('Reinstate after conflict verification')
        lifecycle.locator('input[name="reviewed"]').check()
        lifecycle.get_by_role('button', name='Reinstate account', exact=True).click()
        expect(page.locator('section#lifecycle').get_by_role('status')).to_contain_text('Saved')
        expect(page.locator('section#lifecycle input[name="reviewed"]')).not_to_be_checked()
        visit(page, f'/admin/clients/{owner}?tab=history')
        expect(page.get_by_text('Concurrent suspension', exact=False)).to_be_visible()
        passed('Owner stale lifecycle refusal retains reason; reinstatement and audit history survive refresh')

        # A competing update refuses the stale profile and retains all typed values.
        visit(page, f'/admin/customers/{customer}?tab=account')
        form = page.locator('form').filter(has=page.locator('input[name="command"][value="profile"]'))
        form.locator('input[name="name"]').fill('Kept operator correction')
        form.locator('input[name="email"]').fill('kept@fixture.invalid')
        form.locator('select[name="preferredLocale"]').select_option('gu')
        form.locator('textarea[name="reason"]').fill('Keep this reason after conflict')
        response = context.request.post(api + f'/admin/customers/{customer}/profile', headers={'Cookie':'rentra_admin=' + fixture['tokens']['full']}, multipart={'name':'Concurrent correction','email':'concurrent@fixture.invalid','preferredLocale':'en','reason':'Competing save','expectedVersion':form.locator('input[name="expectedVersion"]').input_value(),'expectedProfileVersion':form.locator('input[name="expectedProfileVersion"]').input_value()})
        assert response.status == 200, response.text()
        form.get_by_role('button', name='Save correction', exact=True).click()
        expect(form.get_by_role('alert')).to_contain_text('changed')
        expect(form.locator('input[name="name"]')).to_have_value('Kept operator correction')
        expect(form.locator('input[name="email"]')).to_have_value('kept@fixture.invalid')
        expect(form.locator('select[name="preferredLocale"]')).to_have_value('gu')
        expect(form.locator('textarea[name="reason"]')).to_have_value('Keep this reason after conflict')
        passed('Stale profile correction refuses lost update and retains every field')

        visit(page, f'/admin/customers/{customer}?tab=account')
        revoke = page.locator('form').filter(has=page.locator('input[name="command"][value="revoke"]'))
        revoke.locator('textarea[name="reason"]').fill('End sessions after account review')
        revoke.get_by_role('button', name='Sign out everywhere', exact=True).click()
        expect(revoke.get_by_role('status')).to_contain_text('Signed out of 1 session')
        lifecycle = page.locator('section#lifecycle form')
        lifecycle.locator('textarea[name="reason"]').fill('Restrict access for account review')
        lifecycle.locator('input[name="reviewed"]').check()
        lifecycle.get_by_role('button', name='Restrict access', exact=True).click()
        expect(page.locator('section#lifecycle').get_by_role('status')).to_contain_text('Restricted')
        page.reload()
        lifecycle = page.locator('section#lifecycle form')
        lifecycle.locator('textarea[name="reason"]').fill('Reinstate access after account review')
        lifecycle.locator('input[name="reviewed"]').check()
        lifecycle.get_by_role('button', name='Reinstate access', exact=True).click()
        expect(page.locator('section#lifecycle').get_by_role('status')).to_contain_text('Active')
        visit(page, f'/admin/customers/{customer}?tab=history')
        expect(page.get_by_text('1 session(s) ended', exact=True)).to_be_visible()
        expect(page.get_by_text('Restrict access for account review', exact=False)).to_be_visible()
        passed('Customer session revocation, restriction, reinstatement and recorded history')
        assert not results['pageErrors'], results['pageErrors']
        passed('Zero browser page errors')
    finally:
        (output / 'browser-checks.json').write_text(json.dumps(results, indent=2) + '\n')
        browser.close()
