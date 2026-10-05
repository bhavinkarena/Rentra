"""Phase 8 finance gate; disposable localhost fixtures and stubbed ledger only."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse, urlencode
from playwright.sync_api import sync_playwright, expect

web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3168')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4168/api/v1')
assert all(urlparse(u).hostname in ['127.0.0.1', 'localhost'] for u in [web, api])
f = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
assert urlparse(f['databaseUrl']).path.startswith('/rentra_test_')
root = Path(__file__).resolve().parents[2]
out = root / 'docs/evidence/admin-phase8'
out.mkdir(parents=True, exist_ok=True)
axe = (root / 'node_modules/axe-core/axe.min.js').read_text()
result = {'scope': 'Disposable localhost; no provider or production access', 'checks': [], 'accessibility': [], 'pageErrors': []}

def passed(name):
    result['checks'].append(name)
    print('PASS', name, flush=True)

def visit(page, path):
    page.goto(web + path)
    expect(page.get_by_role('heading', level=1).first).to_be_visible()
    page.evaluate('document.fonts.ready')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path
    assert 'Actual bank money' not in page.locator('main').inner_text()

def audit(page, name):
    page.add_script_tag(content=axe)
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly: {type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v => ({id:v.id,nodes:v.nodes.map(n => ({target:n.target,summary:n.failureSummary}))}))""")
    result['accessibility'].append({'screen':name,'violations':violations})
    assert not violations, json.dumps(violations)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    context = browser.new_context(viewport={'width':1280,'height':900}, reduced_motion='reduce')
    def role(name):
        context.clear_cookies()
        context.add_cookies([{'name':'rentra_admin','value':f['tokens'][name],'url':web}])
    page = context.new_page()
    page.on('pageerror', lambda e: result['pageErrors'].append(str(e)))
    try:
        role('readonly')
        for path in [f"/admin/finance/payments/{f['finance']['test']['paymentId']}", f"/admin/finance/refunds/{f['refunds'][0]}", f"/admin/finance/refunds/new?order={f['finance']['test']['orderId']}", '/admin/disputes/new']:
            visit(page, path)
            expect(page.get_by_role('heading', name='Read-only access', exact=True).first).to_be_visible()
            expect(page.locator('main form')).to_have_count(0)
            passed('Read-only commands hidden: ' + path.split('?')[0])
        visit(page, '/admin/disputes')
        expect(page.get_by_role('link', name='Open a dispute', exact=True)).to_have_count(0)
        visit(page, '/admin/disputes/' + f['dispute'])
        expect(page.locator('main form')).to_have_count(0)
        expect(page.get_by_role('link', name='Review refund in authoritative workflow')).to_have_count(0)
        passed('Read-only dispute evidence without write actions')
        headers = {'Cookie':'rentra_admin=' + f['tokens']['readonly']}
        for path in ['/admin/payments/orders/reconcile','/admin/payments/refunds/request','/admin/payments/refunds/reconcile','/admin/payments/disputes']:
            response = context.request.post(api + path, headers=headers, multipart={'requestKey':'00000000-0000-4000-8000-000000000001'})
            assert response.status == 403, (path, response.status)
        passed('Direct finance mutations denied for read-only role')
        role('full')
        period = f['finance']['period']
        paths = [('/admin/finance/payments?environment=test', 'Payment records'), ('/admin/finance/refunds?environment=live','Refund obligations'), (f'/admin/finance/statements?period={period}&environment=live','Statement allocations'), (f'/admin/finance/payouts?period={period}&environment=live','Payout records'), ('/admin/disputes','Disputes')]
        for width in [1280,768,390]:
            page.set_viewport_size({'width':width,'height':900})
            for path, label in paths:
                visit(page,path)
                region = page.get_by_role('region',name=label,exact=True)
                expect(region).to_be_visible()
                region.focus()
                page.keyboard.press('ArrowRight')
                if width == 390:
                    assert region.evaluate('(el) => el.scrollWidth > el.clientWidth'), label
                audit(page, f'{label}-{width}')
                page.evaluate('window.scrollTo(0,0)')
                page.screenshot(path=str(out / f'{label.lower().replace(" ","-")}-{width}.png'),full_page=True)
            passed(f'Five finance tabs: tables, keyboard scroll, accessibility, viewport {width}')
        page.set_viewport_size({'width':1280,'height':900})
        for path, label in [(f"/admin/finance/payments/{f['finance']['live']['paymentId']}",'payment-detail'), (f"/admin/finance/refunds/{f['refunds'][0]}",'refund-detail'), (f"/admin/finance/allocations/{f['finance']['live']['allocationId']}",'allocation-detail'), (f"/admin/finance/payouts/{f['finance']['payoutId']}",'payout-detail'), ('/admin/disputes/' + f['dispute'],'dispute-detail')]:
            visit(page,path)
            audit(page,label)
            page.screenshot(path=str(out / (label + '.png')),full_page=True)
        passed('Payment, refund, allocation, payout and dispute detail evidence retained')
        visit(page, '/admin/finance/refunds/new?order=' + f['paid']['order'])
        page.get_by_label('rent',exact=True).fill('100')
        page.get_by_role('button',name='Preview refund',exact=True).click()
        expect(page.get_by_role('region', name='Refund preview')).to_be_visible()
        confirm = page.get_by_role('button',name='Request this refund',exact=True)
        expect(confirm).to_be_enabled()
        dialogs = []
        def keep_preview(dialog):
            dialogs.append(dialog.message)
            dialog.dismiss()
        page.once('dialog', keep_preview)
        page.get_by_role('link', name='All refunds', exact=True).click()
        assert dialogs and 'unsaved changes' in dialogs[0]
        expect(page.get_by_label('rent', exact=True)).to_have_value('100')
        passed('Preview remains protected from leaving without saving')

        page.get_by_label('Reason (kept on the refund record)').fill('Fixture preview only; no provider command')
        page.get_by_label('rent',exact=True).fill('101')
        expect(confirm).to_be_disabled()
        expect(page.get_by_text('The amounts changed: preview again first.')).to_be_visible()
        audit(page,'refund-preview')
        page.screenshot(path=str(out / 'refund-preview.png'),full_page=True)
        passed('Refund preview requires a matching amount before confirmation')
        # Download proxy retains period/environment, and its API independently authorizes role.
        q = urlencode({'period':period,'environment':'test'})
        csv = context.request.get(web + f'/admin/finance/statements/{period}/download?' + q)
        assert csv.status == 200, csv.status
        body = csv.text()
        assert 'IST month' in body and '"test"' in body
        assert f['finance']['test']['allocationId'] in body
        assert f['finance']['live']['allocationId'] not in body
        passed('Statement CSV retains IST period and Test scope')
        q = urlencode({'period':period,'environment':'live'})
        response = context.request.get(api + '/admin/payments/finance?' + q)
        assert response.status == 200
        data = response.json()['data']
        assert data['totals']['collectedMinor'] == '216000'
        assert data['totals']['refundedMinor'] == '20000'
        allocation = context.request.get(api + '/admin/payments/finance/allocations/' + f['finance']['live']['allocationId']).json()['data']
        assert allocation['collectedMinor'] == '100000' and allocation['refundedMinor'] == '20000'
        passed('Statement totals and allocation details reconcile seeded evidence')
        role('customerReader')
        csv = context.request.get(web + f'/admin/finance/statements/{period}/download?' + q)
        assert csv.status == 403, csv.status
        passed('Statement download denied without Finance read access')
        assert not result['pageErrors'], result['pageErrors']
    finally:
        (out / 'browser-results.json').write_text(json.dumps(result,indent=2) + '\n')
        browser.close()
