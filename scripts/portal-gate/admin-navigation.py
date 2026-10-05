"""Phase 2 navigation gate against the disposable admin-navigation-browser fixture."""
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3162')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4162/api/v1')
assert all(urlparse(url).hostname in ['127.0.0.1', 'localhost'] for url in [web, api])
fixture = json.loads(Path(os.environ['ADMIN_NAV_FIXTURE']).read_text())
output = Path(__file__).resolve().parents[2] / 'docs/evidence/admin-phase2'
output.mkdir(parents=True, exist_ok=True)
results = {'scope': 'Disposable localhost fixture; no production providers', 'checks': [], 'pageErrors': []}

def passed(name):
    results['checks'].append(name)
    print('PASS', name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        for role, target, label in [
            ('full', '/admin/applications', 'Owner applications'),
            ('readonly', '/admin/applications', 'Owner applications'),
            ('records', '/admin/bookings', 'Booking records'),
            ('customers', '/admin/customers', 'Customers'),
            ('finance', '/admin/finance/payments', 'Payments'),
            ('applications', '/admin/applications', 'Owner applications'),
            ('empty', '/admin/help', 'Guide'),
        ]:
            context = browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
            context.add_cookies([{'name': 'rentra_admin', 'value': fixture['tokens'][role], 'url': web}])
            page = context.new_page()
            page.on('pageerror', lambda e, role=role: results['pageErrors'].append({'role': role, 'message': str(e)}))
            page.goto(web + '/admin')
            page.wait_for_load_state('networkidle')
            expect(page.get_by_role('heading', name='Admin workspace', exact=True)).to_be_visible()
            expect(page.get_by_text('This page could not load', exact=True)).to_have_count(0)
            if role == 'empty':
                expect(page.get_by_text('No operational workspaces are assigned', exact=False)).to_be_visible()
            else:
                expect(page.locator(f'main a[href="{target}"]')).to_be_visible()
            passed(role + ' authorized home')
            if role == 'full':
                expect(page.locator('aside nav[aria-label="Admin navigation"] a')).to_have_count(7)
                expect(page.locator('aside nav[aria-label="Help and support"] a')).to_have_count(2)
                passed('seven main destinations and footer Help/Support')
            if role in ['records', 'customers', 'finance', 'applications', 'empty']:
                response = context.request.get(api + '/admin/applications')
                assert response.status == (200 if role == 'applications' else 403)
                passed(role + ' direct application API permissions')
            page.goto(web + target)
            page.wait_for_load_state('networkidle')
            expect(page.locator('main nav[aria-label$=" sections"] a[aria-current="page"]')).to_have_count(1)
            expect(page.locator('main nav[aria-label$=" sections"] a[aria-current="page"]')).to_have_text(label)
            expect(page.locator('aside a[aria-current="page"]')).to_have_count(1)
            if role in ['readonly', 'records', 'customers', 'finance', 'applications']:
                expect(page.get_by_text('Read-only access', exact=False)).to_be_visible()
            passed(role + ' section navigation and read-only state')
            if role in ['records', 'customers', 'finance', 'applications']:
                for link in page.locator('main nav[aria-label$=" sections"] a').all():
                    assert link.get_attribute('href') in {
                        'records': ['/admin/bookings', '/admin/booking-cases'],
                        'customers': ['/admin/customers'],
                        'finance': ['/admin/finance/payments', '/admin/finance/refunds', '/admin/finance/statements', '/admin/finance/payouts', '/admin/disputes'],
                        'applications': ['/admin/applications'],
                    }[role]
                passed(role + ' hides unauthorized tabs')
            if role == 'full':
                page.goto(web + '/admin?status=all&assignee=unassigned&q=Fixture&page=1&decided=approved')
                page.wait_for_load_state('networkidle')
                assert urlparse(page.url).path == '/admin/applications'
                expect(page.get_by_text('Approved. They can add properties now', exact=False)).to_be_visible()
                passed('legacy filters and decision feedback redirect')
                page.goto(web + '/admin/applications?q=Fixture&assignee=unassigned')
                page.wait_for_load_state('networkidle')
                queue_link = page.locator(f'main a[href^="/admin/applications/{fixture["application"]}?"]').first
                queue_link.click()
                page.wait_for_url(web + f'/admin/applications/{fixture["application"]}?*')
                page.wait_for_load_state('networkidle')
                expect(page.locator('main nav[aria-label="Reviews & approvals sections"] a[aria-current="page"]')).to_have_text('Owner applications')
                expect(page.locator('main nav[aria-label="Breadcrumb"] a[href="/admin/applications?assignee=unassigned&q=Fixture"]:visible')).to_be_visible()
                passed('application detail parent and filtered breadcrumb')
                page.screenshot(path=str(output / 'application-detail-1280.png'), full_page=True)
                # Section changes discard incompatible application filters.
                page.locator('main nav[aria-label="Reviews & approvals sections"]').get_by_role('link', name='Property review').click()
                page.wait_for_url(web + '/admin/properties')
                page.wait_for_load_state('networkidle')
                assert urlparse(page.url).path == '/admin/properties' and not urlparse(page.url).query
                passed('section change resets incompatible filters')
                page.goto(web + '/admin/payments')
                page.wait_for_load_state('networkidle')
                expect(page.locator('aside a[aria-current="page"]')).to_have_text('Settings & content')
                expect(page.locator('main nav[aria-label$=" sections"] a[aria-current="page"]')).to_have_text('Gateway settings')
                passed('gateway settings separate from finance payments')
                for width in [1280, 768, 360]:
                    page.set_viewport_size({'width': width, 'height': 900})
                    page.goto(web + '/admin/applications')
                    page.wait_for_load_state('networkidle')
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    page.screenshot(path=str(output / f'applications-{width}.png'), full_page=True)
                    if width < 1024:
                        page.get_by_role('button', name='Open navigation', exact=True).click()
                        expect(page.get_by_role('dialog', name='Admin navigation')).to_be_visible()
                        dialog = page.get_by_role('dialog', name='Admin navigation')
                        dialog.get_by_role('link', name='Help & guide').focus()
                        page.keyboard.press('Enter')
                        page.wait_for_url(web + '/admin/help')
                        page.wait_for_load_state('networkidle')
                        expect(dialog).not_to_be_visible()
                        expect(page.get_by_role('heading', level=1)).to_be_focused()
                        page.get_by_role('button', name='Open navigation', exact=True).click()
                        page.keyboard.press('Escape')
                        expect(dialog).not_to_be_visible()
                        expect(page.get_by_role('button', name='Open navigation', exact=True)).to_be_focused()
                    passed(f'{width}px containment, mobile drawer and keyboard navigation')
            if role in ['customers', 'applications']:
                page.goto(web + '/admin/search?q=Fixture')
                page.wait_for_load_state('networkidle')
                expect(page.get_by_text('You do not have access to this directory.', exact=True)).to_have_count(0)
                expect(page.locator('main section')).to_have_count(1)
                passed(role + ' search only loads permitted directory')
            context.close()
        # The API action returns the migrated queue destination and durable feedback.
        context = browser.new_context(viewport={'width': 1280, 'height': 900})
        context.add_cookies([{'name': 'rentra_admin', 'value': fixture['tokens']['full'], 'url': web}])
        detail = context.request.get(api + '/admin/applications/' + fixture['application']).json()['data']
        response = context.request.post(api + '/admin/applications/more-info', data={
            'applicationId': fixture['application'], 'expectedVersion': detail['review']['reviewVersion'],
            'reason': 'Please clarify your registered address.', 'flagged': ['details'],
        })
        assert response.status == 200, response.text()
        assert response.json()['redirect'] == '/admin/applications?decided=more_info'
        page = context.new_page()
        page.goto(web + response.json()['redirect'])
        page.wait_for_load_state('networkidle')
        expect(page.get_by_text('Sent back with questions.', exact=False)).to_be_visible()
        passed('real decision command redirects to new queue with durable feedback')
        page.get_by_role('button', name='Sign out', exact=True).click()
        page.wait_for_url(web + '/admin/login')
        passed('sign-out returns to admin login')
        context.close()
        context = browser.new_context()
        context.add_cookies([{'name': 'rentra_admin', 'value': fixture['tokens']['readonly'], 'url': web}])
        response = context.request.post(api + '/admin/applications/more-info', data={
            'applicationId': fixture['application'], 'expectedVersion': 1, 'reason': 'Must be refused.',
        })
        assert response.status == 403
        passed('read-only write API remains forbidden')
        context.close()
        # The shared footer extension is opt-in; existing owner navigation stays available.
        context = browser.new_context(viewport={'width': 360, 'height': 900}, reduced_motion='reduce')
        context.add_cookies([{'name': 'rentra_session', 'value': fixture['tokens']['owner'], 'url': web}])
        page = context.new_page()
        page.goto(web + '/partner/help')
        page.wait_for_load_state('networkidle')
        expect(page.locator('nav[aria-label="Help and support"]')).to_have_count(0)
        expect(page.get_by_role('heading', level=1)).to_be_visible()
        passed('owner shared shell remains independent')
        context.close()
    finally:
        browser.close()
        (output / 'browser-checks.json').write_text(json.dumps(results, indent=2) + '\n')
