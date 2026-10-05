"""Phase 6 booking gate. Explicit disposable localhost fixture only."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs, quote
from playwright.sync_api import sync_playwright, expect

web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3166')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4166/api/v1')
assert all(urlparse(url).hostname in ['127.0.0.1', 'localhost'] for url in [web, api])
fixture = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
assert urlparse(fixture['databaseUrl']).path.startswith('/rentra_test_')
root = Path(__file__).resolve().parents[2]
output = root / 'docs/evidence/admin-phase6'
output.mkdir(parents=True, exist_ok=True)
axe = (root / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = {'date': '2026-10-05', 'scope': 'Disposable localhost fixture; no production/provider access', 'checks': [], 'pageErrors': [], 'accessibility': []}

def passed(name):
    results['checks'].append(name)
    print('PASS', name, flush=True)

def visit(page, path):
    page.goto(web + path)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', level=1).first).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path

def audit(page, name):
    page.add_script_tag(content=axe)
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}))""")
    results['accessibility'].append({'screen': name, 'violations': violations})
    assert not violations, json.dumps(violations)
    passed(name + ' axe checks')

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        context = browser.new_context(viewport={'width':1280, 'height':900}, reduced_motion='reduce')
        context.add_cookies([{'name':'rentra_admin', 'value':fixture['tokens']['full'], 'url':web}])
        page = context.new_page()
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        order = fixture['booking']['order']
        case = fixture['bookings']['operationalCase']
        headers = {'Cookie':'rentra_admin=' + fixture['tokens']['full']}

        # A refused save must retain draft input and prevent Escape dismissal.
        visit(page, f'/admin/booking-cases?state=open&case={case}')
        sheet = page.get_by_role('dialog')
        form = sheet.locator('form').filter(has=page.locator('select[name="assigneeId"]'))
        version = form.locator('input[name="version"]').input_value()
        response = context.request.post(api + '/admin/records/cases/assign', headers=headers, multipart={'caseId':case, 'version':version, 'assigneeId':fixture['ids']['second']})
        assert response.status == 200, response.text()
        form.locator('select[name="assigneeId"]').select_option(fixture['ids']['admin'])
        form.get_by_role('button', name='Save assignment', exact=True).click()
        expect(form.get_by_role('alert')).to_contain_text('changed')
        expect(form.locator('select[name="assigneeId"]')).to_have_value(fixture['ids']['admin'])
        dialogs = []
        def refuse(dialog):
            dialogs.append(dialog.message)
            dialog.dismiss()
        page.on('dialog', refuse)
        page.keyboard.press('Escape')
        expect(sheet).to_be_visible()
        assert len(dialogs) == 1, 'Failed save lost unsaved-change protection'
        passed('Stale assignment retains input and blocks sheet close after failed save')
        page.remove_listener('dialog', refuse)
        page.once('dialog', lambda dialog: dialog.accept())
        sheet.get_by_role('link', name='Close', exact=False).click()
        page.wait_for_url('**/admin/booking-cases?state=open')
        if os.environ.get('GUARD_ONLY') == '1':
            raise SystemExit(0)

        for width in [1280, 768, 360]:
            page.set_viewport_size({'width':width, 'height':900})
            visit(page, '/admin/bookings')
            table = page.get_by_role('region', name='Booking records', exact=True)
            expect(table.locator('th[scope="col"]')).to_have_count(7)
            expect(table).to_contain_text('Property Owner')
            expect(table).to_contain_text('Fixture Guest')
            table.focus()
            expect(table).to_be_focused()
            if width < 1280:
                assert table.evaluate('e => e.scrollWidth > e.clientWidth')
            page.screenshot(path=str(output / f'bookings-{width}.png'), full_page=True)
            audit(page, f'bookings-{width}')
            for tab in ['visits', 'payments', 'guest', 'cases', 'records']:
                visit(page, f'/admin/bookings?tab=all&q=River&booking={order}&recordTab={tab}')
                sheet = page.get_by_role('dialog')
                expect(sheet).to_be_visible()
                expect(sheet.get_by_role('navigation', name='Record sections').locator('[aria-current="page"]')).to_have_count(1)
                assert sheet.evaluate('e => e.scrollWidth <= e.clientWidth')
                if tab == 'visits':
                    expect(sheet.get_by_role('heading', name='Visit lifecycle', exact=True)).to_be_visible()
                    expect(sheet.get_by_text('ADMIN6-CANCELLED', exact=True)).to_be_visible()
                if tab == 'records':
                    expect(sheet.get_by_role('heading', name='Accepted policy', exact=True)).to_be_visible()
                    expect(sheet.get_by_role('heading', name='Booking history', exact=True)).to_be_visible()
                    assert context.request.get(web + f'/admin/bookings/{order}/summary').status == 200
                    assert context.request.get(web + f'/admin/bookings/{order}/calendar').status == 200
                page.screenshot(path=str(output / f'booking-{tab}-{width}.png'), full_page=True)
                if tab in ['visits', 'records']:
                    audit(page, f'booking-{tab}-{width}')
                passed(f'Booking {tab} sheet at {width}px')
            visit(page, f'/admin/booking-cases?state=open&case={case}')
            page.screenshot(path=str(output / f'case-{width}.png'), full_page=True)
            audit(page, f'case-{width}')

        page.set_viewport_size({'width':1280, 'height':900})
        back = '/admin/bookings?tab=all&q=River&createdTo=2099-12-31'
        visit(page, back)
        page.get_by_role('link', name='Open booking ORD-CP08', exact=True).click()
        page.wait_for_url('**booking=**')
        sheet = page.get_by_role('dialog')
        sheet.get_by_role('navigation', name='Record sections').get_by_role('link', name='History & policy').click()
        page.wait_for_url('**recordTab=records**')
        page.reload()
        expect(page.get_by_role('dialog').get_by_role('heading', name='Accepted policy')).to_be_visible()
        full = sheet.get_by_role('link', name='Full page').get_attribute('href')
        retained = parse_qs(urlparse(full).query)['from'][0]
        assert parse_qs(urlparse(retained).query)['q'] == ['River']
        assert parse_qs(urlparse(retained).query)['createdTo'] == ['2099-12-31']
        page.keyboard.press('Escape')
        page.wait_for_url(web + retained)
        page.go_back()
        expect(page.get_by_role('dialog')).to_be_visible()
        visit(page, full)
        expect(page.get_by_role('dialog')).to_have_count(0)
        expect(page.get_by_role('heading', name='Accepted policy')).to_be_visible()
        passed('Open/tab/refresh/Escape/Back/full-page retain complete list context')

        # Previewed cancellation through real Server Actions, with persistent outcome.
        paid_case = fixture['bookings']['case']
        visit(page, f'/admin/booking-cases?state=open&case={paid_case}')
        sheet = page.get_by_role('dialog')
        sheet.get_by_label('Cancel the listed visits (previewed)', exact=True).check()
        expect(sheet.get_by_role('button', name='Preview before confirming', exact=True)).to_be_disabled()
        sheet.get_by_label('Resolution note', exact=True).fill('The owner cannot host this visit; refund the verified Test payment.')
        sheet.get_by_role('button', name='Preview effects', exact=True).click()
        expect(sheet.get_by_role('status', name='Resolution preview')).to_be_visible()
        sheet.get_by_role('button', name='Confirm: cancel', exact=False).click()
        page.wait_for_load_state('networkidle')
        expect(sheet.get_by_role('heading', name='Resolve', exact=True)).to_have_count(0)
        expect(sheet).to_contain_text('The owner cannot host this visit')
        page.reload()
        expect(page.get_by_role('dialog')).to_contain_text('The owner cannot host this visit')
        passed('Case preview/confirm resolves once, refreshes sheet and retains outcome')

        record_response = context.request.get(api + '/admin/records/' + fixture['bookings']['paidOrder'], headers=headers)
        paid_record = record_response.json()['data']
        assert [v['state'] for v in paid_record['visits']].count('cancelled') == 1
        assert [v['state'] for v in paid_record['visits']].count('confirmed') == 1
        assert sum(len(p['refunds']) for p in paid_record['payments']) == 1
        passed('Previewed case affects exact visit and creates one refund obligation')
        for payment_order, expected in [(fixture['bookings']['paidOrder'], '₹0'), (fixture['bookings']['liveOrder'], '₹1,080')]:
            visit(page, f'/admin/bookings/{payment_order}?tab=payments')
            metric = page.get_by_text('verified Live captures only', exact=True).locator('..')
            expect(metric).to_contain_text(expected)
        passed('Test capture excluded from Live totals; verified Live capture remains visible')
        visit(page, f'/admin/bookings?booking={order}')
        sheet = page.get_by_role('dialog')
        expect(sheet.get_by_role('button', name='Yes, complete', exact=True)).to_have_count(0)
        lifecycle = sheet.locator('form').filter(has=page.locator('input[name="phase"][value="handover"]'))
        lifecycle.locator('textarea[name="note"]').fill('Actual arrival recorded during disposable browser verification.')
        lifecycle.get_by_role('button', name='Record check-in', exact=True).click()
        expect(sheet.get_by_text('Actual arrival recorded during disposable browser verification.', exact=True)).to_be_visible()
        expect(sheet.get_by_role('button', name='Record check-out', exact=True)).to_be_visible()
        expect(sheet.get_by_role('button', name='Yes, complete', exact=True)).to_have_count(0)
        page.reload()
        expect(page.get_by_role('dialog').get_by_text('Actual arrival recorded during disposable browser verification.', exact=True)).to_be_visible()
        passed('Lifecycle prerequisites retained; check-in refreshes sheet and durable evidence')

        for role in ['readonly', 'restricted', 'customerReader']:
            c = browser.new_context(viewport={'width':360, 'height':900})
            c.add_cookies([{'name':'rentra_admin', 'value':fixture['tokens'][role], 'url':web}])
            r = c.new_page()
            r.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
            visit(r, f'/admin/bookings/{order}?tab=visits')
            if role == 'customerReader':
                expect(r.get_by_text('Fixture Guest', exact=True)).to_have_count(0)
            else:
                expect(r.get_by_role('heading', name='Read-only access')).to_be_visible()
                expect(r.get_by_role('button', name='Record check-in', exact=True)).to_have_count(0)
                expect(r.get_by_role('button', name='Report incident', exact=True)).to_have_count(0)
                visit(r, f'/admin/bookings/{order}?tab=cases')
                expect(r.get_by_role('button', name='Open case', exact=True)).to_have_count(0)
                visit(r, f'/admin/booking-cases/{case}')
                expect(r.get_by_role('button', name='Save assignment', exact=True)).to_have_count(0)
                expect(r.get_by_role('button', name='Add update', exact=True)).to_have_count(0)
            refusal = c.request.post(api + '/admin/records/cases/assign', headers={'Cookie':'rentra_admin=' + fixture['tokens'][role]}, multipart={'caseId':case, 'version':'1', 'assigneeId':fixture['ids']['admin']})
            assert refusal.status == 403
            audit(r, role + '-direct-url')
            passed(role + ' direct URL and write API enforce permissions')
            c.close()
        assert not results['pageErrors'], results['pageErrors']
    finally:
        (output / 'browser-checks.json').write_text(json.dumps(results, indent=2) + '\n', encoding='utf-8')
        browser.close()
