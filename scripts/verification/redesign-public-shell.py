"""Read-only signed-out shell checks against the existing localhost:3000 app."""
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

report = {'environment': 'Existing frontend/backend, signed out', 'checks': [], 'runtimeErrors': []}
out = Path('.impeccable/redesign/phase-3-2')
out.mkdir(parents=True, exist_ok=True)

def check(name, passed):
    report['checks'].append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda error: report['runtimeErrors'].append(str(error)))
    axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width': width, 'height': 960})
        page.goto('http://localhost:3000/saved')
        nav = page.get_by_role('navigation', name='Customer navigation')
        nav.get_by_role('link', name='Log in', exact=True).wait_for()
        check(f'Live guest destinations at {width}', nav.locator('a').count()==3)
        check(f'Live guest shell fits at {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
        check(f'Live guest targets are 44px at {width}',all(r['width']>=44 and r['height']>=44 for r in nav.locator('a').evaluate_all('(nodes)=>nodes.map(n=>n.getBoundingClientRect().toJSON())')))
        page.add_script_tag(content=axe)
        violations=page.evaluate("async()=> (await axe.run(document.querySelector('header'),{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>v.id)")
        check(f'Live guest header axe zero at {width}',not violations)
        page.evaluate("document.documentElement.style.fontSize='32px'")
        check(f'Live guest 200 percent text fits at {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
        page.locator('header').first.screenshot(path=str(out / f'live-guest-text-200-{width}.png'))
    page.evaluate("document.documentElement.style.fontSize=''")
    nav.get_by_role('link',name='Log in',exact=True).click()
    page.wait_for_url(lambda url:urlparse(url).path=='/login')
    check('Live guest login link retains its route',urlparse(page.url).path=='/login')
    check('No live guest browser exceptions',not report['runtimeErrors'])
    browser.close()
Path('docs/rentra-ui-redesign-phase-3-2-live.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if any(not c['passed'] for c in report['checks']):
    raise SystemExit(1)
