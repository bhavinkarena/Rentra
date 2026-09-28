"""CP30 production customer continuation against an owned disposable fixture.

Set CP06_GATE_FIXTURE to the private JSON produced by serve-property-review.
No hosted provider calls or configured database access are performed.
"""
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright, TimeoutError

fixture = json.loads(Path(os.environ['CP06_GATE_FIXTURE']).read_text(encoding='utf-8-sig'))
assert urlparse(fixture['databaseUrl']).hostname == '127.0.0.1'
assert urlparse(fixture['databaseUrl']).path.startswith('/rentra_test_')
origin = 'http://localhost:3116'
checks = []


def check(name, condition):
    print(name, condition, flush=True)
    checks.append({'name': name, 'passed': bool(condition)})
    assert condition, name


def settle(page):
    try:
        page.wait_for_load_state('networkidle', timeout=5000)
    except TimeoutError:
        page.wait_for_load_state('domcontentloaded')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1280, 'height': 900})
    page = context.new_page()
    page.set_default_timeout(15000)
    selection = fixture['customerContinuation']
    path = selection['listingPath']
    page.goto(f"{origin}{path}?dates={selection['day']}&slot=day&guests=2")
    settle(page)
    text = page.locator('body').inner_text()
    check('Anonymous listing shows approximate area and address privacy',
          'Dumas, Surat' in text and 'Exact location provided after booking.' in text
          and '12 Private Lane' not in text)
    check('Anonymous selection displays price and guest count', '₹1,080' in text and '2 guests' in text)
    page.get_by_role('button', name='Log in to book', exact=True).click()
    page.wait_for_url('**/login**')
    settle(page)
    check('Booking starts fresh login', '/login' in page.url)
    page.get_by_label('Mobile number').fill(selection['phone'])
    page.get_by_role('button', name='Continue', exact=True).click()
    page.get_by_label('Digit 1 of 6', exact=True).wait_for()
    check('Disposable login explicitly identifies development OTP', 'Development login' in page.locator('body').inner_text())
    for i, digit in enumerate('123456', 1):
        page.get_by_label(f'Digit {i} of 6', exact=True).fill(digit)
    page.get_by_role('button', name='Verify & log in', exact=True).click()
    settle(page)
    page.wait_for_url('**/listing/**')
    settle(page)
    page.get_by_role('link', name='Review booking', exact=True).wait_for()
    page.get_by_text('2 guests', exact=True).wait_for()
    check('Login restores saved listing selection', '2 guests' in page.locator('body').inner_text())
    page.locator('input[type=checkbox]:visible').first.check()
    page.get_by_role('link', name='Review booking', exact=True).click()
    page.wait_for_url('**/checkout/review/**')
    settle(page)
    page.locator('#checkout-purpose').wait_for()
    check('Checkout review retains quoted amount', '₹1,080' in page.locator('body').inner_text())
    page.locator('#checkout-purpose').fill('Synthetic local acceptance picnic')
    page.get_by_role('checkbox').check()
    page.get_by_role('button', name='Continue to payment', exact=True).click()
    page.wait_for_url('**/checkout/*')
    page.get_by_role('heading', name='Complete your payment', exact=False).wait_for()
    check('Checkout creates a persisted unpaid hold', '/checkout/' in page.url and '/review/' not in page.url)
    page.reload()
    settle(page)
    check('Checkout hold survives refresh', '₹1,080' in page.locator('body').inner_text())
    page.goto(origin + '/account/privacy')
    settle(page)
    page.get_by_role('button', name='Submit privacy request', exact=True).wait_for()
    page.locator('select[name=kind]').select_option('access')
    page.get_by_role('button', name='Submit privacy request', exact=True).click()
    page.get_by_text('Request recorded.', exact=False).wait_for()
    check('Privacy access form acknowledges request', 'Request recorded.' in page.locator('body').inner_text())
    page.reload()
    settle(page)
    page.get_by_text('Account data copy', exact=False).wait_for()
    check('Privacy request persists on refresh', True)
    page.goto(origin + '/support/new?orderId=' + fixture['booking']['order'])
    settle(page)
    page.get_by_role('button', name='Send support request', exact=True).wait_for()
    page.locator('input[name=subject]').fill('Synthetic CP30 customer acceptance')
    page.locator('textarea[name=body]').fill('This is a disposable local customer support acceptance message.')
    page.get_by_role('button', name='Send support request', exact=True).click()
    page.wait_for_url('**/support/*')
    page.get_by_role('button', name='Save reply and status', exact=True).wait_for()
    check('Customer support form opens scoped conversation', 'Synthetic CP30 customer acceptance' in page.locator('body').inner_text())
    page.locator('textarea[name=body]').fill('Synthetic follow-up retained after refresh.')
    page.get_by_role('button', name='Save reply and status', exact=True).click()
    page.locator('p:visible').filter(has_text='Synthetic follow-up retained after refresh.').first.wait_for()
    page.reload()
    page.locator('p:visible').filter(has_text='Synthetic follow-up retained after refresh.').first.wait_for()
    check('Support reply persists after refresh', True)
    page.goto(origin + '/bookings/' + fixture['reviewOrder'] + '/reviews')
    settle(page)
    page.get_by_role('button', name='Submit review', exact=True).wait_for()
    page.locator('select[name=rating]').select_option('4')
    review = 'Synthetic completed-visit review for disposable local acceptance.'
    page.locator('textarea[name=body]').fill(review)
    page.get_by_role('button', name='Submit review', exact=True).click()
    page.locator('p:visible').filter(has_text=review).first.wait_for()
    check('Completed visit review is accepted into moderation', True)
    page.reload()
    page.locator('p:visible').filter(has_text=review).first.wait_for()
    check('Review persists and cannot be submitted twice', page.get_by_role('button', name='Submit review', exact=True).count() == 0)
    page.goto(origin + path)
    settle(page)
    check('Unmoderated customer review remains absent publicly', review not in page.locator('body').inner_text())
    page.set_viewport_size({'width': 390, 'height': 844})
    for route in [path, '/account/privacy', '/support', '/bookings/' + fixture['reviewOrder'] + '/reviews']:
        page.goto(origin + route)
        settle(page)
        check('Customer route has no mobile horizontal overflow: ' + route.split('/')[1],
              page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'))
    browser.close()

Path('docs/rentra-client-admin-part30-customer-gate.json').write_text(json.dumps({
    'part': 'CP30', 'acceptance': 'CA23', 'environment': 'production frontend / disposable local API',
    'provider': 'not exercised', 'checks': checks,
}, indent=2), encoding='utf-8')
















