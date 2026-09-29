"""Phase 4 home QA with actual public listing data and an isolated read-only API.

python scripts/verification/redesign-home.py
No database, provider, real session or server-side write is used.
Guest saves affect only disposable browser storage; saved/guest is a metadata read.
"""
import json
import os
from pathlib import Path
import socket
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs
from urllib.request import urlopen
from copy import deepcopy
from playwright.sync_api import sync_playwright

out = Path('.impeccable/redesign/phase-4')
out.mkdir(parents=True, exist_ok=True)
report = {'phase': '4', 'baseline': False, 'environment': 'Isolated Next dev, read-only in-memory API; no database/provider', 'checks': [], 'captures': [], 'runtimeErrors': [], 'consoleErrors': [], 'apiWrites': []}
origin = 'http://127.0.0.1:3124'
with urlopen('http://127.0.0.1:4000/api/v1/discovery/listings?limit=16') as response:
    listings=json.load(response)['data']
with urlopen('http://127.0.0.1:4000/api/v1/discovery/registry') as response:
    registry=json.load(response)['data']
state=['normal']

class API(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        path = urlparse(self.path).path
        status, data = 200, None
        if path == '/api/v1/discovery/listings':
            data=deepcopy(listings)
            if state[0]=='empty': data=[]
            if state[0]=='failed': status=503; data=None
            if state[0]=='mixed': data[0]['priceNote']='Layout sample: this property has distinct price conditions.'
            if state[0]=='stress':
                data[0].update(title='Layout sample with an exceptionally long property name for wrapping verification', rating=4.8, reviewCount=127)
                data[1].update(price=None, priceMinor=None)
                data[2]['photo']=None
        elif path == '/api/v1/discovery/registry': data=registry
        elif path == '/api/v1/discovery/search': data={'items':listings[:2],'total':2,'totalPages':1,'page':1,'errors':[]}
        elif path == '/api/v1/saved': data={'mode':'guest','scope':'guest','entries':[]}
        elif path == '/api/v1/auth/me' or path == '/api/v1/admin/auth/me': status=401
        else: status=404
        payload = {'success': status == 200, 'data': data}
        if status != 200:
            payload.update(code='SHELL_QA_UNAVAILABLE', message='Shell QA unavailable' if status == 503 else 'Shell QA missing session or route')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_POST(self):
        if urlparse(self.path).path=='/api/v1/saved/guest':
            body=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
            entries=[]
            for entry in body.get('entries',[]):
                listing=next((item for item in listings if item['id']==entry['rentableId']),None)
                if listing: entries.append({**listing,**entry,'available':True})
            self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers()
            self.wfile.write(json.dumps({'success':True,'data':{'entries':entries}}).encode())
            return
        report['apiWrites'].append(urlparse(self.path).path)
        self.send_response(405); self.end_headers()

def check(name, passed):
    report['checks'].append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

def snapshot(page, name, width):
    file = out / f'{name}-{width}.png'
    page.screenshot(path=str(file),caret='initial')
    report['captures'].append({'name': name, 'width': width, 'file': str(file)})

for port in [3124, 4124]:
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise RuntimeError(f'QA port {port} already in use; existing process preserved')
api = ThreadingHTTPServer(('127.0.0.1', 4124), API)
threading.Thread(target=api.serve_forever, daemon=True).start()
env = {**os.environ, 'RENTRA_BROWSER_FIXTURE': '1', 'RENTRA_BROWSER_FIXTURE_ID': 'home', 'NEXT_PUBLIC_API_URL': 'http://127.0.0.1:4124/api/v1', 'NEXT_PUBLIC_RENTRA_MEASUREMENT_ENABLED':'false'}
log = (out / 'next.log').open('w', encoding='utf-8')
next_process = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'dev', '-p', '3124', '-H', '127.0.0.1'], env=env, stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
try:
    for attempt in range(120):
        if next_process.poll() is not None:
            raise RuntimeError('Isolated Next server exited; inspect local next.log')
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', 3124)) == 0:
                break
        time.sleep(.25)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.on('pageerror', lambda error: report['runtimeErrors'].append(str(error)))
        page.on('console', lambda msg: report['consoleErrors'].append(msg.text) if msg.type == 'error' else None)
        axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
        context.set_extra_http_headers({'Cache-Control':'no-cache'})
        for width in [320,390,768,1024,1440,1920]:
            page.set_viewport_size({'width':width,'height':844 if width<640 else 960})
            page.goto(origin)
            page.get_by_role('heading',name='Find your kind of getaway').wait_for()
            page.evaluate('document.fonts.ready')
            cards=page.locator('main article')
            search=page.get_by_role('form',name='Find your next visit')
            check(f'Home no overflow at {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
            check(f'All actual listings retained at {width}',cards.count()==len(listings))
            check(f'Exactly one shared price note at {width}',page.get_by_text(listings[0]['priceNote'],exact=True).count()==1)
            check(f'Card title uses full width at {width}',abs(cards.first.locator('h3').bounding_box()['width']-cards.first.bounding_box()['width'])<1)
            check(f'Search controls at least 44px at {width}',all(r['height']>=44 for r in search.locator('input,select').evaluate_all('(nodes)=>nodes.map(n=>n.getBoundingClientRect().toJSON())')))
            if width==390: check('390px search stays in first viewport',search.bounding_box()['y']+search.bounding_box()['height']<=844)
            page.add_script_tag(content=axe)
            violations=page.evaluate("async()=> (await axe.run(document.querySelector('main'),{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>v.id)")
            check(f'Home axe zero at {width}',not violations)
            page.screenshot(path=str(out/f'home-{width}.png'),full_page=True,caret='initial')
        for mode in ['empty','failed','mixed','stress']:
            state[0]=mode
            for width in [390,1440]:
                page.set_viewport_size({'width':width,'height':844 if width==390 else 960})
                page.goto(origin+'/?fixture='+mode)
                page.get_by_role('heading',name='Find your kind of getaway').wait_for()
                if mode=='empty': check(f'Successful empty listings distinguished at {width}',page.get_by_role('heading',name='No places to show yet',exact=True).count()==1)
                if mode=='failed': check(f'Failed listings distinguished at {width}',page.get_by_role('heading',name='Places are temporarily unavailable',exact=True).count()==1)
                if mode=='mixed': check(f'Distinct price conditions stay on cards at {width}',page.locator('#home-price-note').count()==0 and page.get_by_text('Layout sample: this property has distinct price conditions.',exact=True).count()==1 and page.get_by_text(listings[1]['priceNote'],exact=True).count()==len(listings)-1)
                if mode=='stress':
                    check(f'Stress title remains full width at {width}',abs(page.locator('main article h3').first.bounding_box()['width']-page.locator('main article').first.bounding_box()['width'])<1)
                    check(f'Rating stays together at {width}',page.locator('main article').first.get_by_text('(127)',exact=True).evaluate('(n)=>n.getBoundingClientRect().height<30'))
                    check(f'Unknown price has no misleading from qualifier at {width}','from' not in page.locator('main article').nth(1).inner_text())
                    check(f'Absent photo has honest placeholder at {width}',page.locator('main article').nth(2).get_by_text('Photos coming soon',exact=True).count()==1)
                check(f'{mode} no overflow at {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
                page.locator('main > section').last.scroll_into_view_if_needed()
                snapshot(page,mode,width)
        state[0]='normal'
        page.set_viewport_size({'width':390,'height':844})
        page.goto(origin+'/?fixture=interaction')
        save=page.get_by_role('button',name='Save:',exact=False).first
        save.wait_for(state='visible')
        page.wait_for_function("!document.querySelector('main article button').disabled")
        save.click()
        check('Save is independent of property navigation',urlparse(page.url).path=='/')
        page.get_by_role('button',name='Remove from saved:',exact=False).first.wait_for()
        check('Guest save persisted in browser',page.evaluate("JSON.parse(localStorage.getItem('rentra_guest_saved_v1')).length===1"))
        page.goto(origin+'/saved')
        page.get_by_role('button',name='Remove ',exact=False).first.wait_for()
        check('Saved destination recovers local selection',page.get_by_role('heading',name=listings[0]['title'],exact=True).count()==1)
        page.goto(origin+'/?fixture=search')
        search=page.get_by_role('form',name='Find your next visit')
        search.get_by_role('textbox',name='Where',exact=True).fill('  Kamrej  ')
        search.locator('input[type=date]').fill('2026-10-20')
        search.locator('select[name=slot]').select_option('night')
        search.get_by_role('spinbutton',name='Guests',exact=True).fill('4')
        search.get_by_role('button',name='Search',exact=True).click()
        page.wait_for_url('**/search?**')
        query=parse_qs(urlparse(page.url).query)
        check('Search retains location date slot and guests',query=={'q':['Kamrej'],'date':['2026-10-20'],'slot':['night'],'guests':['4']})
        page.get_by_role('heading',name='Find a place',exact=True).wait_for()
        check('Search cards retain their individual price notes',page.get_by_text(listings[0]['priceNote'],exact=True).count()==2)
        page.route('**/_next/image?**',lambda route:route.abort())
        page.goto(origin+'/?fixture=photos')
        page.get_by_role('img',name='Photo unavailable:',exact=False).first.wait_for()
        check('Failed hero photograph has honest fallback',page.get_by_text('Photo unavailable',exact=True).count()>0)
        snapshot(page,'photo-failed',390)
        page.unroute('**/_next/image?**')
        page.goto(origin+'/?fixture=motion')
        page.get_by_role('heading',name='Find your kind of getaway').wait_for()
        page.emulate_media(reduced_motion='reduce')
        image=page.locator('main article img').first
        if image.count(): check('Reduced motion disables image transitions',image.evaluate('(n)=>parseFloat(getComputedStyle(n).transitionDuration)<.001'))
        page.goto(origin+'/?fixture=focus')
        search=page.get_by_role('form',name='Find your next visit')
        search.get_by_role('textbox',name='Where',exact=True).focus()
        check('Search keyboard focus visible',search.get_by_role('textbox',name='Where',exact=True).evaluate('(n)=>parseFloat(getComputedStyle(n).outlineWidth)>=2'))
        check('No unexpected API writes',not report['apiWrites'])
        check('No uncaught browser exceptions',not report['runtimeErrors'])
        report['completed']=True
        browser.close()
finally:
    Path('docs/rentra-ui-redesign-phase-4.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if next_process.poll() is None:
        if os.name=='nt':
            # These ports were verified free before this owned helper launched.
            rows=subprocess.check_output(['netstat','-ano','-p','tcp'],text=True)
            owned=[next_process.pid]
            for row in rows.splitlines():
                parts=row.split()
                if len(parts)==5 and parts[1]=='127.0.0.1:3124' and parts[3]=='LISTENING':
                    owned.append(int(parts[4]))
            subprocess.run(['powershell','-NoProfile','-Command','Stop-Process -Id '+','.join(str(pid) for pid in owned)+' -Force -ErrorAction SilentlyContinue'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            next_process.terminate()
        next_process.wait(timeout=10)
    api.shutdown()
    api.server_close()
    log.close()
    Path('docs/rentra-ui-redesign-phase-4.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if any(not c['passed'] for c in report['checks']):
    raise SystemExit(1)
