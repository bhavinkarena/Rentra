"""Phase 1 read-only source/public/auth-gate audit; no account mutations.

Run from frontend root: python scripts/verification/redesign-audit.py
Uses the running localhost frontend and existing Python Playwright/axe.
Private content coverage is recorded separately from anonymous gate coverage.
"""
import json
import re
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

origin = 'http://localhost:3000'
out = Path('.impeccable/redesign/phase-1')
out.mkdir(parents=True, exist_ok=True)
report = {'phase': 1, 'scope': 'Read-only source, public pages and anonymous customer gates',
          'origin': origin, 'sources': [], 'public': [], 'gates': []}
source_pages = sorted(p for group in ['(marketing)', '(app)', '(customer)']
                      for p in (Path('app') / group).rglob('page.js'))
for source in source_pages:
    content = source.read_text(encoding='utf-8')
    route = '/' + '/'.join(part for part in source.parts[1:-1] if not part.startswith('('))
    report['sources'].append({'route': route, 'source': source.as_posix(),
                              'imports': re.findall(r"from ['\"]([^'\"]+)", content),
                              'reads': re.findall(r'(?:customerApi|bookingApi|discoveryApi|disputesApi)\.[\w]+', content),
                              'protected': '(customer)' in source.parts})

axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')

def save():
    Path('docs/rentra-ui-redesign-phase-1.json').write_text(json.dumps(report, indent=2), encoding='utf-8')

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    page.set_default_timeout(15000)
    errors, console = [], []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: console.append(msg.text) if msg.type == 'error' else None)
    page.goto(origin)
    page.wait_for_timeout(1200)
    listing_links = page.locator('main article h3 a')
    listing = listing_links.first.get_attribute('href') if listing_links.count() else None
    footer_routes = page.locator('footer a').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("href")).filter(h=>h?.startsWith("/")&&!h.startsWith("/policies")&&!h.startsWith("/partner")&&!h.startsWith("/search")&&!h.startsWith("/help"))')
    public_routes = [('home', '/'), ('search', '/search'), ('search-empty', '/search?q=zzzz-ui-qa-no-match'),
                     ('saved', '/saved'), ('login', '/login'), ('help', '/help'),
                     ('terms', '/policies/terms'), ('privacy', '/policies/privacy'), ('cancellation', '/policies/cancellation'),
                     ('help-history-missing', '/help/history/help/phase-1-unpublished-version'),
                     ('contact-history-missing', '/help/history/contact/phase-1-unpublished-version')]
    if listing:
        public_routes.append(('listing', listing))
    if footer_routes:
        public_routes.append(('location', footer_routes[0]))
    for name, route in public_routes:
        for width in [390, 1440]:
            errors.clear()
            console.clear()
            page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 960})
            response = page.goto(origin + route)
            page.wait_for_timeout(1200)
            page.evaluate('document.fonts.ready')
            page.screenshot(path=str(out / f'{name}-{width}.png'), full_page=True)
            page.add_script_tag(content=axe)
            violations = page.evaluate("async()=> (await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>({id:v.id,impact:v.impact,targets:v.nodes.map(n=>n.target)}))")
            text = page.locator('body').inner_text()
            record = {'name': name, 'route': route, 'width': width, 'status': response.status,
                      'url': page.url, 'headings': page.locator('h1').all_text_contents(),
                      'text': text[:1800], 'overflow': page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),
                      'axe': violations, 'runtimeErrors': list(errors), 'consoleErrors': list(console),
                      'contentUnavailable': bool(re.search(r'temporarily unavailable|could not load|couldn.t load|404|not found', text, re.I)),
                      'layout': page.evaluate("""() => ({footerHeight: document.querySelector('footer')?.getBoundingClientRect().height ?? 0,
                        footerLinks: document.querySelectorAll('footer a').length,
                        controlFonts: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].map(el=>({name:el.name,fontSize:getComputedStyle(el).fontSize})),
                        homeSearchBottom: document.querySelector('form[aria-label="Find your next visit"]')?.getBoundingClientRect().bottom ?? null})"""),
                      'screenshot': (out / f'{name}-{width}.png').as_posix()}
            report['public'].append(record)
            print(f"PUBLIC {name} {width}: status={record['status']} overflow={record['overflow']} axe={len(violations)} unavailable={record['contentUnavailable']}", flush=True)
            save()
    for entry in report['sources']:
        if not entry['protected']:
            continue
        route = re.sub(r'\[[^\]]+\]', '00000000-0000-4000-8000-000000000000', entry['route'])
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(origin + route)
        page.wait_for_timeout(500)
        gate = {'pattern': entry['route'], 'requested': route, 'url': page.url,
                'loginRedirect': urlparse(page.url).path == '/login',
                'contentVerified': False}
        report['gates'].append(gate)
        print(f"GATE {entry['route']}: login={gate['loginRedirect']}", flush=True)
        save()
    browser.close()
save()
assert len(report['sources']) == 29
assert len(report['gates']) == 20
print('Source patterns: 29. Protected gates: 20. Successful protected content is not claimed.', flush=True)
