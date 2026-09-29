"""Read-only Phase 3 navigation/footer QA. Run --baseline before the change.

python scripts/verification/redesign-navigation.py --baseline
python scripts/verification/redesign-navigation.py
"""
import argparse
import json
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
out = Path('.impeccable/redesign/phase-3')
out.mkdir(parents=True, exist_ok=True)
report = {'phase': 3, 'baseline': args.baseline, 'pages': [], 'checks': [], 'runtimeErrors': []}
origin = 'http://localhost:3000'
axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')

def check(name, passed):
    report['checks'].append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('pageerror', lambda error: report['runtimeErrors'].append(str(error)))
    for width in [390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 960})
        page.goto(origin)
        page.wait_for_timeout(900)
        footer = page.locator('footer')
        footer.scroll_into_view_if_needed()
        links = footer.locator('a').evaluate_all('(nodes)=>nodes.map(n=>({href:n.getAttribute("href"),text:n.textContent.trim()}))')
        data = {'width':width,'height':footer.bounding_box()['height'],'links':links}
        footer.screenshot(path=str(out / f'footer-{width}{"-before" if args.baseline else ""}.png'))
        report['pages'].append(data)
        if args.baseline:
            continue
        before = json.loads(Path('docs/rentra-ui-redesign-phase-3-before.json').read_text())
        check(f'All original footer destinations retained at {width}', set(l['href'] for l in links)==set(l['href'] for l in before['pages'][0]['links']))
        old = next(item for item in before['pages'] if item['width']==width)
        check(f'Destination browser footer is smaller at {width}', data['height']<old['height']*.75)
        check(f'No horizontal overflow at {width}', not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
        tabs = footer.get_by_role('tab')
        city_select = footer.get_by_label('Choose a city')
        mobile = width < 640
        controls = city_select if mobile else tabs
        check(f'City controls are at least 44 px at {width}', all(el['height']>=44 for el in controls.evaluate_all('(nodes)=>nodes.map(n=>n.getBoundingClientRect().toJSON())')))
        check(f'Exactly one city panel is visible at {width}',footer.get_by_role('tabpanel').count()==1)
        initial_height=footer.bounding_box()['height']
        cities=footer.locator('[role="tab"]').evaluate_all('(nodes)=>nodes.map(n=>n.id.replace("footer-city-", ""))')
        heights=[]
        for slug in cities:
            if mobile:
                city_select.select_option(slug)
            else:
                footer.locator('#footer-city-'+slug).click()
            heights.append(footer.bounding_box()['height'])
            panel=footer.get_by_role('tabpanel')
            check(f'{slug} exposes its existing routes at {width}',panel.locator('a:visible').count()>=4 and all(link.startswith('/'+slug+'/') for link in panel.locator('a').evaluate_all('(nodes)=>nodes.map(n=>n.getAttribute("href"))')))
        check(f'City switching never changes footer height at {width}', all(abs(height-initial_height)<1 for height in heights))
        panel=footer.get_by_role('tabpanel')
        check(f'Concise intent labels at {width}',panel.get_by_role('link',name='With pool in',exact=False).inner_text()=='With pool' and panel.get_by_role('link',name='Bonfire allowed in',exact=False).inner_text()=='Bonfire allowed')
        if mobile:
            city_select.focus()
            page.keyboard.press('ArrowUp')
            page.keyboard.press('Enter')
            page.keyboard.press('Escape')
            check(f'Native selector works from keyboard at {width}',city_select.input_value()==cities[-2])
        else:
            tabs.last.focus()
            page.keyboard.press('ArrowRight')
            check(f'Arrow keys wrap to first city at {width}',tabs.first.get_attribute('aria-selected')=='true' and tabs.first.evaluate('(n)=>n===document.activeElement'))
            page.keyboard.press('End')
            check(f'End selects last city at {width}',tabs.last.get_attribute('aria-selected')=='true')
            page.keyboard.press('Home')
            check(f'Home selects first city at {width}',tabs.first.get_attribute('aria-selected')=='true')
        page.keyboard.press('Tab')
        check(f'Tab reaches selected city link at {width}',page.evaluate("document.activeElement.matches('footer [role=tabpanel]:not([hidden]) a')"))
        focus=page.evaluate('getComputedStyle(document.activeElement).outlineWidth')
        check(f'City link has visible keyboard focus at {width}',float(focus.rstrip('px'))>=2)
        check(f'Hidden city links leave tab order at {width}',footer.locator('[role="tabpanel"][hidden] a:visible').count()==0)
        footer.screenshot(path=str(out / f'footer-selected-{width}.png'))
        page.add_script_tag(content=axe)
        violations=page.evaluate("async()=> (await axe.run(document.querySelector('footer'),{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>({id:v.id,impact:v.impact}))")
        data['axe']=violations
        check(f'Footer has no axe violations at {width}',not violations)
        # Existing public navigation remains route-aware.
        page.goto(origin+'/saved')
        page.wait_for_timeout(500)
        check(f'Saved navigation remains active at {width}',page.get_by_role('navigation',name='Customer navigation').get_by_role('link',name='Saved',exact=True).get_attribute('aria-current')=='page')
    if not args.baseline:
        report['edgeWidths']=[]
        for width in [320,1024,1920]:
            page.set_viewport_size({'width':width,'height':960})
            page.goto(origin)
            page.wait_for_timeout(700)
            footer=page.locator('footer')
            footer.scroll_into_view_if_needed()
            check(f'Edge width has no overflow: {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
            height=footer.bounding_box()['height']
            if width<640:
                footer.get_by_label('Choose a city').select_option('vadodara')
            else:
                footer.get_by_role('tab',name='Vadodara',exact=True).click()
            check(f'Edge width city switch has no reflow: {width}',abs(footer.bounding_box()['height']-height)<1)
            footer.screenshot(path=str(out / f'footer-edge-{width}.png'))
            report['edgeWidths'].append({'width':width,'height':height})
        # Layout stress only: manipulate a copy of actual DOM, not API/account data.
        report['layoutStress']=[]
        for count in [1,30]:
            page.set_viewport_size({'width':768,'height':960})
            page.goto(origin)
            page.wait_for_timeout(700)
            stress=page.evaluate("""count=> {
              const nav=document.querySelector('footer [role="tablist"]');
              const sample=nav.firstElementChild.cloneNode(true);
              nav.replaceChildren();
              for(let i=0;i<count;i++) {
                const city=sample.cloneNode(true);
                if(i===0)city.textContent='A very long destination name for layout verification';
                nav.append(city);
              }
              document.querySelector('#footer-city option').textContent='A very long destination name for layout verification';
              return {count,overflow:document.documentElement.scrollWidth>innerWidth+1,footerHeight:document.querySelector('footer').getBoundingClientRect().height};
            }""",count)
            report['layoutStress'].append(stress)
            check(f'DOM layout stress with {count} cities and long label: no overflow',not stress['overflow'])
        page.goto(origin)
        page.wait_for_timeout(700)
        page.keyboard.press('Tab')
        check('Public skip link is first keyboard destination',page.evaluate("document.activeElement.textContent.trim().startsWith('Skip to main content')"))
        page.keyboard.press('Enter')
        check('Skip link moves focus to main content',page.evaluate("document.activeElement.id==='main-content'"))
        first_city=page.locator('footer [role=tabpanel]:not([hidden])')
        destination=first_city.locator('a').first.get_attribute('href')
        first_city.locator('a').first.click()
        page.wait_for_url(lambda url:urlparse(url).path==destination)
        check('City browse link navigates to its existing discovery route',urlparse(page.url).path==destination)
        page.locator('footer').get_by_role('link',name='Search all places',exact=True).click()
        page.wait_for_url(lambda url:urlparse(url).path=='/search')
        check('Search all places navigates to existing search',urlparse(page.url).path=='/search')
        gates=json.loads(Path('docs/rentra-ui-redesign-phase-1.json').read_text())['gates']
        report['gates']=[]
        for gate in gates:
            page.goto(origin+gate['requested'])
            page.wait_for_url(lambda url: urlparse(url).path=='/login',timeout=10000)
            report['gates'].append({'pattern':gate['pattern'],'url':page.url})
            check(f"Anonymous gate preserved: {gate['pattern']}",urlparse(page.url).path=='/login')
        check('No uncaught browser exceptions',not report['runtimeErrors'])
    browser.close()
target=Path('docs/rentra-ui-redesign-phase-3'+('-before' if args.baseline else '')+'.json')
target.write_text(json.dumps(report,indent=2),encoding='utf-8')
if any(not item['passed'] for item in report['checks']):
    raise SystemExit(1)
