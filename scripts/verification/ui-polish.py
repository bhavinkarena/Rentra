"""Visual/interaction QA. Public checks are read-only except anonymous local saves.

python scripts/verification/ui-polish.py --origin http://localhost:3000
Optional --fixture path enables existing disposable-fixture account/portal checks.
Screenshots and machine-readable evidence go to --out (default .next/ui-review).
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--origin', default='http://localhost:3000')
parser.add_argument('--out', default='.next/ui-review')
parser.add_argument('--fixture')
parser.add_argument('--only-fixture', action='store_true')
args = parser.parse_args()
out = Path(args.out)
out.mkdir(parents=True, exist_ok=True)
evidence = {'pages': [], 'checks': [], 'runtimeErrors': [], 'consoleErrors': []}
axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')


def check(name, passed):
    evidence['checks'].append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)
    (out / 'evidence.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')


def settled(page):
    page.wait_for_load_state('domcontentloaded')
    page.wait_for_timeout(900)
    page.evaluate('document.fonts.ready')


def capture(page, name, path, width):
    page.set_viewport_size({'width': width, 'height': 960 if width >= 768 else 844})
    response = page.goto(args.origin + path)
    settled(page)
    # Trigger lazy images before returning to the document top for a valid capture.
    page.evaluate('async () => { for (let y = 0; y < document.body.scrollHeight; y += 650) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,80)); } window.scrollTo(0,0); }')
    page.wait_for_timeout(1000)
    page.screenshot(path=str(out / f'{name}-{width}.png'), full_page=True)
    page.add_script_tag(content=axe)
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly: ['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))""")
    overflow = page.evaluate('document.documentElement.scrollWidth > window.innerWidth + 1')
    broken = page.locator('img').evaluate_all('(images) => images.filter(i => i.complete && i.naturalWidth === 0).map(i => i.alt)')
    evidence['pages'].append({'name': name, 'path': path, 'width': width, 'status': response.status if response else None, 'url': page.url, 'overflow': overflow, 'axe': violations, 'brokenImages': broken})
    check(f'{name} at {width}px: no horizontal overflow', not overflow)
    check(f'{name} at {width}px: WCAG serious/critical', not [v for v in violations if v['impact'] in ['serious','critical']])
    if name == 'home' and width == 390:
        check('Mobile home search is visible in the first viewport', page.get_by_role('form', name='Find your next visit').bounding_box()['y'] + page.get_by_role('form', name='Find your next visit').bounding_box()['height'] <= page.viewport_size['height'])


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 960})
    page = context.new_page()
    page.set_default_timeout(20000)
    page.on('pageerror', lambda err: evidence['runtimeErrors'].append(str(err)))
    page.on('console', lambda msg: evidence['consoleErrors'].append(msg.text) if msg.type == 'error' else None)
    for width in ([] if args.only_fixture else [390, 768, 1024, 1440, 1920]):
        capture(page, 'home', '/', width)
    if not args.only_fixture:
        listings = page.locator('main article h3 a')
        listing = listings.first.get_attribute('href') if listings.count() else None
        for name, path in ([] if args.only_fixture else [('search', '/search'), ('empty-search', '/search?q=zzzz-ui-qa-no-match'), ('saved', '/saved'), ('login', '/login'), ('partner-login', '/partner/login'), ('admin-login', '/admin/login'), ('staff-login', '/staff/login'), ('help', '/help'), ('privacy', '/policies/privacy')]):
            for width in [390, 1440]:
                capture(page, name, path, width)
        if listing:
            for width in [390, 1440]:
                capture(page, 'listing', listing, width)
            page.get_by_role('button', name='Open photos of', exact=False).click()
            check('Gallery opens', page.get_by_role('dialog').is_visible())
            page.keyboard.press('ArrowRight')
            page.keyboard.press('Escape')
            page.get_by_role('dialog').wait_for(state='hidden')
            page.wait_for_timeout(100)
            check('Gallery Escape closes and restores focus', not page.get_by_role('dialog').count() and page.evaluate("document.activeElement.getAttribute('aria-label')?.startsWith('Open photos of')"))
            page.get_by_role('button', name='Choose arrival and departure dates').click()
            check('Availability dialog opens', page.get_by_role('dialog').is_visible())
            page.keyboard.press('Escape')
            check('Availability Escape closes', not page.get_by_role('dialog').count())
        page.goto(args.origin)
        settled(page)
        search = page.get_by_role('form', name='Find your next visit')
        search.get_by_role('textbox', name='Where').fill('Kamrej')
        search.get_by_role('spinbutton', name='Guests').fill('4')
        search.get_by_role('button', name='Search', exact=True).click()
        page.wait_for_url('**/search?**')
        check('Search preserves location, visit type and guests in URL', all(x in page.url for x in ['q=Kamrej', 'slot=day', 'guests=4']))
        page.goto(args.origin + '/search')
        settled(page)
        page.get_by_label('Sort', exact=True).select_option('price_asc')
        page.get_by_role('button', name='Apply', exact=True).click()
        page.wait_for_url('**sort=price_asc**')
        check('Sorting remains URL-backed', 'sort=price_asc' in page.url)
        page.goto(args.origin)
        settled(page)
        save = page.get_by_role('button', name='Save:', exact=False).first
        if save.count():
            save.wait_for(state='visible')
            save.click()
            check('Saving does not navigate to property', urlparse(page.url).path == '/')
            page.goto(args.origin + '/saved')
            settled(page)
            check('Anonymous save appears in saved places', page.get_by_role('button', name='Remove', exact=False).count() > 0)
        page.emulate_media(reduced_motion='reduce')
        page.goto(args.origin)
        settled(page)
        check('Reduced motion applies to skeletons', page.evaluate("() => {const el=document.createElement('span');el.className='rentra-skeleton';document.body.append(el);const ok=parseFloat(getComputedStyle(el).animationDuration)<0.001;el.remove();return ok;}"))
    if args.fixture:
        fixture = json.loads(Path(args.fixture).read_text(encoding='utf-8-sig'))
        database = urlparse(fixture['databaseUrl'])
        assert database.hostname == '127.0.0.1' and database.path.startswith('/rentra_test_')
        for role, cookie, token, routes in [
            ('customer', 'rentra_session', fixture['tokens']['customer'], [('account','/account'), ('bookings','/bookings'), ('booking',f"/bookings/{fixture['booking']['order']}"), ('support','/support'), ('notifications','/account/notifications')]),
            ('partner', 'rentra_session', fixture['tokens']['owner'], [('dashboard','/partner'), ('listings','/partner/listings'), ('property',f"/partner/listings/{fixture['ids']['listing']}"), ('calendar',f"/partner/listings/{fixture['ids']['listing']}/calendar"), ('setup',f"/partner/listings/{fixture['ids']['listing']}/setup/basics")]),
            ('admin', 'rentra_admin', fixture['tokens']['admin'], [('dashboard','/admin'), ('clients','/admin/clients'), ('bookings','/admin/bookings'), ('booking',f"/admin/bookings/{fixture['booking']['order']}"), ('privacy','/admin/privacy')]),
        ]:
            context.clear_cookies()
            context.add_cookies([{'name': cookie, 'value': token, 'url': args.origin}])
            for name, path in routes:
                for width in [390, 1440]:
                    capture(page, role + '-' + name, path, width)
        if fixture.get('uiHoldOrder'):
            context.clear_cookies()
            context.add_cookies([{'name': 'rentra_session', 'value': fixture['tokens']['qaCustomer'], 'url': args.origin}])
            for width in [390, 1440]:
                capture(page, 'checkout-payment', f"/checkout/{fixture['uiHoldOrder']}", width)
    check('No uncaught browser runtime errors', not evidence['runtimeErrors'])
    browser.close()
(out / 'evidence.json').write_text(json.dumps(evidence, indent=2), encoding='utf-8')
if any(not c['passed'] for c in evidence['checks']):
    raise SystemExit(1)
