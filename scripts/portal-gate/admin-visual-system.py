"""Phase 3 visual-system gate; disposable localhost fixture only."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3162')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4162/api/v1')
assert all(urlparse(url).hostname in ['127.0.0.1', 'localhost'] for url in [web, api])
fixture = json.loads(Path(os.environ['ADMIN_NAV_FIXTURE']).read_text())
root = Path(__file__).resolve().parents[2]
output = root / 'docs/evidence/admin-phase3'
output.mkdir(parents=True, exist_ok=True)
axe = (root / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = {'scope': 'Disposable local PostgreSQL fixture; no production provider calls', 'checks': [], 'pageErrors': [], 'accessibility': []}

def passed(name):
    results['checks'].append(name)
    print('PASS', name, flush=True)

def visit(page, path):
    page.goto(web + path)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', level=1)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path

def audit(page, name):
    page.add_script_tag(content=axe)
    data = page.evaluate("""async () => {
      const r = await axe.run(document, {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return r.violations.map(v => ({id:v.id, impact:v.impact, nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}));
    }""")
    results['accessibility'].append({'screen': name, 'violations': data})
    assert not data, json.dumps(data)
    passed(name + ' WCAG axe checks')

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        context = browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
        context.add_cookies([{'name': 'rentra_admin', 'value': fixture['tokens']['full'], 'url': web}])
        page = context.new_page()
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        for width in [1280, 768, 360]:
            page.set_viewport_size({'width': width, 'height': 900})
            for name, path, label in [
                ('queue', '/admin/applications', 'Owner applications'),
                ('payments', '/admin/finance/payments?environment=test', 'Payment records'),
            ]:
                visit(page, path)
                table = page.get_by_role('region', name=label, exact=True)
                expect(table.locator('table caption')).to_have_text(label)
                assert table.locator('th[scope="col"]').count() >= 6
                expect(table.locator('tbody tr')).to_have_count(1)
                table.focus()
                expect(table).to_be_focused()
                assert table.evaluate("e => getComputedStyle(e).outlineStyle") != 'none'
                if width < 1024:
                    assert table.evaluate('e => e.scrollWidth > e.clientWidth')
                    page.keyboard.press('ArrowRight')
                    page.wait_for_function('(e) => e.scrollLeft > 0', arg=table.element_handle())
                for control in page.locator('main button, main select, main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').all():
                    if control.is_visible():
                        assert control.bounding_box()['height'] >= 44
                passed(f'{name} {width}px semantic table, local scroll, focus and controls')
                page.evaluate("window.scrollTo(0,0)")
                page.screenshot(path=str(output / f'{name}-{width}.png'), full_page=True)
                if width in [1280, 360]:
                    audit(page, f'{name}-{width}')
            for name, path in [
                ('application-detail', f'/admin/applications/{fixture["application"]}?tab=decision&from=%2Fadmin%2Fapplications%3Fq%3DFixture'),
                ('gateway-form', '/admin/payments'),
                ('operator-detail', f'/admin/security/{fixture["operator"]}'),
            ]:
                visit(page, path)
                page.evaluate("window.scrollTo(0,0)")
                page.screenshot(path=str(output / f'{name}-{width}.png'), full_page=True)
                if width in [1280, 360]:
                    audit(page, f'{name}-{width}')
                if name == 'operator-detail':
                    expect(page.get_by_text('05 Oct 2026, 00:00 IST', exact=False)).to_be_visible()
                if name == 'application-detail':
                    expect(page.get_by_role('button', name='Approve', exact=True)).to_be_visible()
                    expect(page.get_by_role('button', name='Assign to me', exact=True)).to_be_visible()
                    passed(f'{width}px full-access review controls preserved')
                passed(f'{name} {width}px layout and deterministic render')
        # URL-backed record tabs retain the exact filtered list context.
        visit(page, f'/admin/applications/{fixture["application"]}?from=%2Fadmin%2Fapplications%3Fq%3DFixture%26page%3D2')
        page.get_by_role('navigation', name='Record sections').get_by_role('link', name='Documents', exact=False).click()
        page.wait_for_url('**tab=documents')
        assert 'from=%2Fadmin%2Fapplications%3Fq%3DFixture%26page%3D2' in page.url
        page.reload()
        page.wait_for_load_state('networkidle')
        expect(page.get_by_role('navigation', name='Record sections').get_by_role('link', name='Documents', exact=False)).to_have_attribute('aria-current', 'page')
        passed('record tabs preserve context through navigation and refresh')
        visit(page, '/admin/applications?q=no-such-owner')
        expect(page.get_by_role('heading', name='No applications match this search')).to_be_visible()
        expect(page.get_by_text('This page could not load', exact=True)).to_have_count(0)
        passed('filtered empty queue remains distinct from failed load')
        context.close()
        context = browser.new_context(viewport={'width': 360, 'height': 900}, reduced_motion='reduce')
        context.add_cookies([{'name': 'rentra_admin', 'value': fixture['tokens']['readonly'], 'url': web}])
        page = context.new_page()
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        visit(page, f'/admin/applications/{fixture["application"]}?tab=decision')
        expect(page.get_by_text('Decisions require applications write permission.', exact=False)).to_be_visible()
        expect(page.get_by_text('Assignment changes require applications write permission.', exact=False)).to_be_visible()
        for label in ['Assign to me', 'Approve', 'Need more info', 'Reject']:
            expect(page.get_by_role('button', name=label, exact=True)).to_have_count(0)
        response = context.request.post(api + '/admin/applications/more-info', data={'applicationId': fixture['application'], 'expectedVersion': 1, 'reason': 'Refuse this command', 'flagged': ['details']})
        assert response.status == 403
        page.screenshot(path=str(output / 'read-only-decision-360.png'), full_page=True)
        passed('read-only reviewer treatment hides mutation controls; API still refuses writes')
        context.close()
        context = browser.new_context(viewport={'width': 360, 'height': 900}, reduced_motion='reduce')
        context.add_cookies([{'name': 'rentra_admin', 'value': fixture['tokens']['records'], 'url': web}])
        page = context.new_page()
        visit(page, '/admin/applications')
        expect(page.get_by_role('heading', name='You do not have access to this')).to_be_visible()
        passed('forbidden queue is an explicit access state')
        context.close()
        # Owner CSS remains outside the new admin data attribute.
        context = browser.new_context(viewport={'width': 360, 'height': 900}, reduced_motion='reduce')
        context.add_cookies([{'name': 'rentra_session', 'value': fixture['tokens']['activeOwner'], 'url': web}])
        page = context.new_page()
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        for path in ['/partner/help', f'/partner/listings/{fixture["property"]}/overview']:
            visit(page, path)
            expect(page.locator('[data-admin-workspace]')).to_have_count(0)
        page.screenshot(path=str(output / 'owner-property-360.png'), full_page=True)
        passed('owner help and shared SectionCard property page retain independent shell')
        context.close()
        assert not results['pageErrors'], results['pageErrors']
    finally:
        browser.close()
        (output / 'browser-checks.json').write_text(json.dumps(results, indent=2) + '\n')
