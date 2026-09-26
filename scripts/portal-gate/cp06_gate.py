"""CP06 browser/API gate. Requires serve-property-review.mjs and isolated Next on :3106.
GATE_TOKENS points to that disposable fixture's JSON; no configured application data.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

fixture = json.loads(Path(os.environ['GATE_TOKENS']).read_text())
tokens, ids = fixture['tokens'], fixture['ids']
WEB, API = 'http://localhost:3106', 'http://localhost:4106/api/v1'
axe = (Path(__file__).parents[2] / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = []

def settle(page):
    # Streamed segments are swapped in during hydration; wait until the page is quiet.
    try:
        page.wait_for_load_state('networkidle', timeout=10000)
    except Exception:
        page.wait_for_load_state('load')


def check(name, passed):
    results.append({'check': name, 'pass': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

with sync_playwright() as pw:
    chrome = os.environ.get('CHROME', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    browser = pw.chromium.launch(headless=True, executable_path=chrome if Path(chrome).exists() else None)
    def context(kind, width=1280):
        ctx = browser.new_context(viewport={'width': width, 'height': 950})
        ctx.set_default_navigation_timeout(120000)
        cookie = 'rentra_session' if kind in ['owner', 'other'] else 'rentra_admin'
        ctx.add_cookies([{'name': cookie, 'value': tokens[kind], 'url': WEB}])
        return ctx
    admin = context('admin')
    owner, other, limited = context('owner'), context('other'), context('limited')
    check('client cookie rejected by admin API', owner.request.get(f'{API}/admin/properties').status == 401)
    check('limited operator denied queue', limited.request.get(f'{API}/admin/properties').status == 403)
    check('limited operator denied detail', limited.request.get(f'{API}/admin/properties/{ids["listing"]}').status == 403)
    check('foreign owner denied property', other.request.get(f'{API}/partner/listings/{ids["listing"]}').status == 404)
    for status in ['all', 'draft', 'rejected', 'pending_verification']:
        check(f'queue filter {status} loads', admin.request.get(f'{API}/admin/properties?status={status}&assignee=unassigned').status == 200)
    check('malformed property ID rejected', admin.request.get(f'{API}/admin/properties/invalid').status == 400)
    check('limited operator denied private document', limited.request.get(f'{API}/admin/documents/{ids["document"]}/file').status == 403)
    page = admin.new_page()
    for width in [1280, 390]:
        page.set_viewport_size({'width': width, 'height': 950})
        page.goto(f'{WEB}/admin/properties?q=Review')
        settle(page)
        heading = page.get_by_role('heading', name='Property review', exact=True)
        heading.first.wait_for()
        check(f'queue loads at {width}px', heading.filter(visible=True).count() == 1)
        row = page.get_by_role('link', name='Review River Farm', exact=True)
        check(f'queue carries filtered return context {width}px', 'from=' in row.get_attribute('href'))
        check(f'queue has no page overflow {width}px', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.add_script_tag(content=axe)
        violations = page.evaluate("async () => (await axe.run({runOnly:['wcag2a','wcag2aa']})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
        check(f'queue axe serious/critical {width}px', not violations)
        row.click()
        page.get_by_role('heading', name='Submitted revision', exact=False).wait_for()
        check(f'submitted exact address visible only in admin detail {width}px', page.get_by_text('12 Private Lane', exact=True).count() == 1)
        check(f'detail has no page overflow {width}px', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
        page.add_script_tag(content=axe)
        violations = page.evaluate("async () => (await axe.run({runOnly:['wcag2a','wcag2aa']})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
        check(f'detail axe serious/critical {width}px', not violations)
    page.get_by_role('link', name='Review & decision').click()
    page.get_by_text('Reviewer assignment', exact=True).wait_for()
    if page.get_by_role('button', name='Release assignment', exact=True).count():
        page.get_by_role('button', name='Release assignment', exact=True).click()
        page.get_by_role('button', name='Assign to me', exact=True).wait_for()
    page.get_by_role('button', name='Assign to me', exact=True).click()
    page.get_by_role('button', name='Release assignment', exact=True).wait_for()
    check('assignment persists through UI', True)
    submission = fixture['submission']['submissionId']
    second = context('second')
    decision = {'submissionId': submission, 'outcome': 'rejected', 'reason': 'A conflicting reviewer decision'}
    check('different reviewer cannot decide assignment', second.request.post(f'{API}/admin/properties/{ids["listing"]}/decision', data=decision).status == 409)
    page.get_by_label('Reason shown to the client').fill('Please update the house rules and property photos.')
    page.get_by_role('button', name='Record decision', exact=True).click()
    page.get_by_text('Choose at least one section to correct.', exact=True).first.wait_for()
    check('server validates correction sections', True)
    check('failed decision preserves reason', page.get_by_label('Reason shown to the client').input_value().startswith('Please update'))
    page.get_by_role('checkbox', name='rules', exact=True).check()
    page.get_by_role('checkbox', name='photos', exact=True).check()
    page.get_by_role('button', name='Record decision', exact=True).click()
    page.get_by_text('There is no pending submission to decide.', exact=True).wait_for()
    check('correction request persists', admin.request.get(f'{API}/admin/properties/{ids["listing"]}').json()['data']['property']['status'] == 'draft')
    client = owner.new_page()
    client.goto(f'{WEB}/partner/listings/{ids["listing"]}')
    settle(client)
    client.get_by_text('Sections to correct:', exact=False).first.wait_for()
    check('client sees correction reason', client.get_by_text('Please update the house rules and property photos.', exact=False).count() > 0)
    check('client sees requested sections', client.get_by_text('Sections to correct:', exact=False).count() > 0)
    check('other client cannot resubmit', other.request.post(f'{API}/partner/listings/{ids["listing"]}/submit', data={'id': ids['listing']}).status != 200)
    # Resubmission through the client's own Submit button (no database editing).
    client.get_by_role('button', name='Submit for review', exact=True).click()
    client.get_by_text('Submitted for review.', exact=False).first.wait_for(timeout=30000)
    check('client resubmits through the UI and sees confirmation', 'submitted=1' in client.url)
    current = admin.request.get(f'{API}/admin/properties/{ids["listing"]}').json()['data']['current']
    check('new submission has distinct identity and next pass', current['id'] != submission and current['passNumber'] == 2)
    check('old reviewer screen is rejected', admin.request.post(f'{API}/admin/properties/{ids["listing"]}/decision', data=decision).status == 409)
    page.goto(f'{WEB}/admin/properties/{ids["listing"]}?tab=decision')
    settle(page)
    page.locator('select[name="outcome"]').select_option('approved_for_visit')
    page.get_by_label('Reason shown to the client').fill('The submitted revision is ready for verification.')
    page.get_by_role('button', name='Record decision', exact=True).click()
    page.get_by_text('There is no pending submission to decide.', exact=True).wait_for()
    state = admin.request.get(f'{API}/admin/properties/{ids["listing"]}').json()['data']
    check('approval stops at pending verification', state['property']['status'] == 'pending_verification')
    check('decision history retains both passes', len(state['history']) == 2)
    check('publication outcome rejected by server', admin.request.post(f'{API}/admin/properties/{ids["listing"]}/decision', data={'submissionId': current['id'], 'outcome': 'published', 'reason': 'Attempted publication'}).status == 422)
    client.reload()
    settle(client)
    client.get_by_text('Verification visit next', exact=True).first.wait_for()
    check('client sees verification next state', client.get_by_text('Verification visit next', exact=True).count() > 0)
    browser.close()

Path(os.environ.get('GATE_RESULTS', 'cp06-gate-results.json')).write_text(json.dumps(results, indent=2))
print(f'{sum(item["pass"] for item in results)}/{len(results)} passed')
raise SystemExit(0 if all(item['pass'] for item in results) else 1)
