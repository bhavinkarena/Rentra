"""Read-only Phase 2 foundation checks against the running localhost UI.

python scripts/verification/redesign-foundation.py
Captures live controls and tokens without submitting forms or changing accounts.
"""
import json
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path('.impeccable/redesign/phase-2')
out.mkdir(parents=True, exist_ok=True)
css = Path('app/globals.css').read_text(encoding='utf-8')
design = Path('DESIGN.md').read_text(encoding='utf-8')
sidecar = json.loads(Path('.impeccable/design.json').read_text(encoding='utf-8'))
palette = dict(re.findall(r"^  ([\w-]+): '(#[0-9a-fA-F]{6})'$", design.split('typography:')[0], re.M))
runtime_palette = dict(re.findall(r'--color-([\w-]+): (#[0-9a-fA-F]{6});', css))
report = {'phase': 2, 'origin': 'http://localhost:3000', 'checks': [], 'pages': [], 'contrast': []}

def check(name, passed):
    report['checks'].append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

check('All 36 documented palette values match runtime CSS source', len(palette) == 36 and all(runtime_palette.get(k) == v for k, v in palette.items()))
check('Structured design references use schema 2', sidecar['schemaVersion'] == 2)
check('Home and loading skeleton retain narrow 16:8 media', all('aspect-[16/8]' in Path(p).read_text() for p in ['app/(marketing)/page.js', 'components/loading/ScreenSkeleton.jsx']))
check('Design narrative matches the 16:8 narrow home media', '16:8 below 768px' in design and '16:8 below 768px' in sidecar['narrative']['overview'])
documented_type = design.split('typography:\n', 1)[1].split('rounded:', 1)[0]
root_roles = ['display', 'h1', 'h2', 'h3', 'h4', 'body-lg', 'body', 'meta', 'tiny']
for role in root_roles:
    block = re.search(r'^  ' + role + r':\n((?:    .*\n)+)', documented_type, re.M).group(1)
    matches = True
    for field, suffix in [('fontSize', ''), ('fontWeight', '--font-weight'), ('lineHeight', '--line-height'), ('letterSpacing', '--letter-spacing')]:
        value = re.search(r'^    ' + field + r': (.+)$', block, re.M)
        if value:
            actual = re.search(r'--text-' + role + suffix + r': ([^;]+);', css)
            matches = matches and bool(actual) and actual.group(1) == value.group(1).strip("'\"")
    check(f'Documented {role} typography matches CSS', matches)
font_path = 'assets/fonts/PlusJakartaSans-latin-variable.woff2'
check('Public and portal use the same existing local font asset', Path(font_path).is_file() and all(font_path in Path(p).read_text() and 'next/font/local' in Path(p).read_text() for p in ['app/layout.js','lib/portal-font.js']))
check('All five documented shadow values match CSS', all(re.search(r'--shadow-' + shadow['name'] + r': ([^;]+);', css).group(1) == shadow['value'] for shadow in sidecar['extensions']['shadows']))

def luminance(color):
    values = [int(color[i:i+2], 16) / 255 for i in [1, 3, 5]]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return sum(v * weight for v, weight in zip(linear, [.2126, .7152, .0722]))

for foreground, background in [('brand-600','ink-0'),('brand-700','ink-0'),('ink-400','ink-0'),('ink-400','ink-25'),('ink-500','brand-50'),('danger','danger-bg'),('warning','warning-bg'),('info','info-bg')]:
    light, dark = sorted([luminance(palette[foreground]), luminance(palette[background])], reverse=True)
    ratio = (light + .05) / (dark + .05)
    report['contrast'].append({'foreground': foreground, 'background': background, 'ratio': round(ratio, 3)})
    check(f'{foreground} on {background}: normal-text contrast >= 4.5', ratio >= 4.5)

axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for width in [390, 768, 1440]:
        page.set_viewport_size({'width': width, 'height': 844 if width == 390 else 960})
        page.goto(report['origin'] + '/login')
        page.wait_for_timeout(1000)
        page.evaluate('document.fonts.ready')
        phone = page.locator('input[data-slot=input]')
        button = page.get_by_role('button', name='Continue', exact=True)
        page.keyboard.press('Tab')
        phone.focus()
        focus = phone.evaluate("el=>{const s=getComputedStyle(el);return {outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,outlineColor:s.outlineColor,boxShadow:s.boxShadow,fontSize:s.fontSize,height:el.getBoundingClientRect().height,radius:s.borderRadius}}")
        page.screenshot(path=str(out / f'input-focus-{width}.png'), full_page=True)
        button.focus()
        button_style = button.evaluate("el=>{const s=getComputedStyle(el);return {outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,outlineColor:s.outlineColor,boxShadow:s.boxShadow,height:el.getBoundingClientRect().height,radius:s.borderRadius,transitionDuration:s.transitionDuration}}")
        check(f'Login input at {width}: responsive 16/14 px type', focus['fontSize'] == ('16px' if width < 768 else '14px'))
        check(f'Login controls at {width}: at least 44 px', focus['height'] >= 44 and button_style['height'] >= 44)
        check(f'Input at {width}: visible keyboard outline', float(focus['outlineWidth'].replace('px','')) >= 2 and focus['outlineStyle'] != 'none')
        check(f'Button at {width}: visible keyboard outline', float(button_style['outlineWidth'].replace('px','')) >= 2 and button_style['outlineStyle'] != 'none')
        page.screenshot(path=str(out / f'login-focus-{width}.png'), full_page=True)
        page.add_script_tag(content=axe)
        violations = page.evaluate("async()=> (await axe.run(document,{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>({id:v.id,impact:v.impact}))")
        check(f'Login at {width}: no axe violations', not violations)
        check(f'Login at {width}: no horizontal overflow', not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
        report['pages'].append({'route':'/login','width':width,'input':focus,'button':button_style,'axe':violations})
        page.goto(report['origin'])
        page.wait_for_timeout(700)
        tokens = page.evaluate("""() => {
          const s=getComputedStyle(document.documentElement);
          const properties=['--radius-sm','--radius-md','--radius-lg','--radius-xl','--container-page','--primary','--background','--ring','--font-sans'];
          const values=Object.fromEntries(properties.map(p=>[p,s.getPropertyValue(p).trim()]));
          const hero=document.querySelector('main a[href^="/listing/"]')?.closest('div.relative');
          return {values,bodyFont:getComputedStyle(document.body).fontFamily,heroRatio:hero?getComputedStyle(hero).aspectRatio:null,searchBottom:document.querySelector('form[aria-label="Find your next visit"]')?.getBoundingClientRect().bottom};
        }""")
        check(f'Runtime radii at {width}: 6/10/14/20 px', [tokens['values'].get('--radius-'+n) for n in ['sm','md','lg','xl']] == ['6px','10px','14px','20px'])
        check(f'Runtime page width at {width}: 1280 px', tokens['values']['--container-page'] == '1280px')
        check(f'Home media at {width}: documented ratio', tokens['heroRatio'] == ('16 / 8' if width < 768 else '4 / 3'))
        if width == 390:
            check('Mobile search remains inside 844 px viewport', tokens['searchBottom'] <= 844)
        page.screenshot(path=str(out / f'home-{width}.png'), full_page=True)
        report['pages'].append({'route':'/','width':width,'tokens':tokens})
    page.emulate_media(reduced_motion='reduce')
    page.goto(report['origin'] + '/login')
    page.wait_for_timeout(700)
    duration = page.get_by_role('button', name='Continue', exact=True).evaluate('el=>getComputedStyle(el).transitionDuration')
    check('Reduced motion constrains button transitions', all(float(v.strip().rstrip('s')) <= .00001 for v in duration.split(',')))
    report['reducedMotionButtonDuration'] = duration
    page.emulate_media(forced_colors='active')
    page.keyboard.press('Tab')
    forced = {}
    for selector in ['input[data-slot=input]', 'button[data-slot=button]']:
        control = page.locator(selector).first
        control.focus()
        forced[selector] = control.evaluate("el=>{const s=getComputedStyle(el);return {outlineWidth:s.outlineWidth,outlineStyle:s.outlineStyle,outlineColor:s.outlineColor}}")
    check('Forced colors preserves input/button keyboard outlines', all(float(s['outlineWidth'].replace('px','')) >= 2 and s['outlineStyle'] != 'none' for s in forced.values()))
    report['forcedColors'] = forced
    check('No uncaught browser exceptions', not errors)
    report['runtimeErrors'] = errors
    browser.close()
Path('docs/rentra-ui-redesign-phase-2.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
if any(not item['passed'] for item in report['checks']):
    raise SystemExit(1)
