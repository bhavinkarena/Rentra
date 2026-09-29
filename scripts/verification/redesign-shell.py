"""Phase 3.2 shell QA with a read-only in-memory API and isolated Next dev.

python scripts/verification/redesign-shell.py --baseline
python scripts/verification/redesign-shell.py
No database, provider, real session or application write is used.
"""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

parser = argparse.ArgumentParser()
parser.add_argument('--baseline', action='store_true')
args = parser.parse_args()
out = Path('.impeccable/redesign/phase-3-2')
out.mkdir(parents=True, exist_ok=True)
report = {'phase': '3.2', 'baseline': args.baseline, 'environment': 'Isolated Next dev, read-only in-memory API; no database/provider', 'checks': [], 'captures': [], 'runtimeErrors': [], 'consoleErrors': [], 'apiWrites': []}
origin = 'http://127.0.0.1:3123'
user = {'id': 'shell-qa', 'name': 'Navigation layout verification customer', 'role': 'customer', 'accountStatus': 'active'}
account = {**user, 'phone': '9999900000', 'email': None, 'dateOfBirth': None, 'photoUrl': None}

class API(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        path = urlparse(self.path).path
        mode = next((mode for mode in ['customer', 'client', 'blocked', 'outage'] if f'rentra_session=shell-{mode}' in self.headers.get('Cookie', '')), 'guest')
        actor = {**user, 'role': 'client' if mode == 'client' else 'customer', 'accountStatus': 'blocked' if mode == 'blocked' else 'active'}
        status, data = 200, None
        if path == '/api/v1/auth/me':
            status = 503 if mode == 'outage' else 401 if mode == 'guest' else 200
            data = {'user': actor} if status == 200 else None
        elif path == '/api/v1/admin/auth/me':
            status = 401
        elif path == '/api/v1/saved':
            data = {'mode': 'customer' if mode == 'customer' else 'other' if mode == 'client' else 'guest', 'profile': account if mode == 'customer' else None, 'scope': 'shell-qa', 'owner': 'shell-qa', 'entries': []}
        elif path == '/api/v1/customer/account':
            data = account
        elif path == '/api/v1/customer/notifications':
            data = []
        elif path == '/api/v1/discovery/registry':
            data = {'cities': [], 'categories': [], 'areas': []}
        else:
            status = 404
        payload = {'success': status == 200, 'data': data}
        if status != 200:
            payload.update(code='SHELL_QA_UNAVAILABLE', message='Shell QA unavailable' if status == 503 else 'Shell QA missing session or route')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_POST(self):
        report['apiWrites'].append(urlparse(self.path).path)
        self.send_response(405)
        self.end_headers()

def check(name, passed):
    report['checks'].append({'name': name, 'passed': bool(passed)})
    print(('PASS ' if passed else 'FAIL ') + name, flush=True)

def snapshot(page, name, width):
    file = out / f'{name}-{width}{"-before" if args.baseline else ""}.png'
    page.screenshot(path=str(file))
    report['captures'].append({'name': name, 'width': width, 'file': str(file)})

for port in [3123, 4123]:
    with socket.socket() as probe:
        if probe.connect_ex(('127.0.0.1', port)) == 0:
            raise RuntimeError(f'QA port {port} already in use; existing process preserved')
api = ThreadingHTTPServer(('127.0.0.1', 4123), API)
threading.Thread(target=api.serve_forever, daemon=True).start()
env = {**os.environ, 'RENTRA_BROWSER_FIXTURE': '1', 'RENTRA_BROWSER_FIXTURE_ID': 'navigation', 'NEXT_PUBLIC_API_URL': 'http://127.0.0.1:4123/api/v1'}
log = (out / 'next.log').open('w', encoding='utf-8')
next_process = subprocess.Popen(['node', 'node_modules/next/dist/bin/next', 'dev', '-p', '3123', '-H', '127.0.0.1'], env=env, stdout=log, stderr=log, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
try:
    for attempt in range(120):
        if next_process.poll() is not None:
            raise RuntimeError('Isolated Next server exited; inspect local next.log')
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1', 3123)) == 0:
                break
        time.sleep(.25)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        page.on('pageerror', lambda error: report['runtimeErrors'].append(str(error)))
        page.on('console', lambda msg: report['consoleErrors'].append(msg.text) if msg.type == 'error' else None)
        axe = Path('node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
        context.add_cookies([{'name': 'rentra_session', 'value': 'shell-customer', 'url': origin}])
        for width in [320,390,768,1024,1440]:
            page.set_viewport_size({'width':width,'height':844 if width<640 else 960})
            page.goto(origin+'/account/payment-methods')
            page.get_by_role('heading',name='Payment methods',exact=True).wait_for()
            nav=page.get_by_role('navigation',name='Customer navigation')
            check(f'Customer shell has no overflow at {width}', not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
            check(f'Four customer destinations at {width}',nav.locator('a').count()==4)
            check(f'Header targets at least 44px at {width}',all(r['width']>=44 and r['height']>=44 for r in nav.locator('a').evaluate_all('(nodes)=>nodes.map(n=>n.getBoundingClientRect().toJSON())')))
            active=nav.get_by_role('link',name='Your account')
            check(f'Nested account has current state at {width}',active.get_attribute('aria-current')=='page')
            active_shadow=active.evaluate('(n)=>getComputedStyle(n).boxShadow')
            snapshot(page,'customer-account',width)
            page.keyboard.press('Tab')
            check(f'Customer skip link first at {width}',page.evaluate("document.activeElement.textContent.trim()==='Skip to account content'"))
            page.keyboard.press('Enter')
            check(f'Customer skip link focuses main at {width}',page.evaluate("document.activeElement.id==='customer-content'"))
            nav.get_by_role('link',name='Saved',exact=True).focus()
            check(f'Navigation focus visible at {width}',nav.get_by_role('link',name='Saved',exact=True).evaluate('(n)=>parseFloat(getComputedStyle(n).outlineWidth)>=2'))
            page.add_script_tag(content=axe)
            violations=page.evaluate("async()=> (await axe.run(document.querySelector('header'),{runOnly:['wcag2a','wcag2aa','wcag21aa']})).violations.map(v=>v.id)")
            check(f'Customer header axe zero at {width}',not violations)
            page.goto(origin+'/saved')
            nav=page.get_by_role('navigation',name='Customer navigation')
            nav.get_by_role('link',name='Bookings',exact=True).wait_for()
            check(f'Public customer shell has no overflow at {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
            check(f'Saved active state at {width}',nav.get_by_role('link',name='Saved',exact=True).get_attribute('aria-current')=='page')
            inactive_shadow=nav.get_by_role('link',name='Your account').evaluate('(n)=>getComputedStyle(n).boxShadow')
            check(f'Account selection visually differs from inactive at {width}',active_shadow!=inactive_shadow)
            snapshot(page,'public-customer',width)
            # Text enlargement keeps the viewport width fixed, to expose label collisions.
            page.evaluate("document.documentElement.style.fontSize='32px'")
            check(f'Public header fits 200 percent text at {width}',not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
            check(f'Enlarged header leaves content space at {width}',page.locator('header').first.bounding_box()['height']<page.viewport_size['height']*.4)
            snapshot(page,'public-text-200',width)
            page.evaluate("document.documentElement.style.fontSize=''")
            nav.get_by_role('link',name='Your account').click()
            page.wait_for_url(lambda url:urlparse(url).path=='/account')
            check(f'Account navigation works across public/protected layouts at {width}',page.get_by_role('navigation',name='Customer navigation').get_by_role('link',name='Your account').get_attribute('aria-current')=='page')
        context.clear_cookies()
        context.add_cookies([{'name':'rentra_session','value':'shell-blocked','url':origin}])
        blocked=context.request.get(origin+'/account/payment-methods',max_redirects=0)
        check('Blocked customer guard redirects to blocked login',(blocked.status==307 and 'blocked=1' in blocked.headers.get('location','')) or (blocked.status==200 and '/login?blocked=1' in blocked.text()))
        for mode in ['guest','client','outage']:
            context.clear_cookies()
            if mode!='guest':
                context.add_cookies([{'name':'rentra_session','value':'shell-'+mode,'url':origin}])
            page.goto(origin+'/account/payment-methods')
            if mode=='outage':
                page.get_by_role('heading',name='This page could not load',exact=True).wait_for()
                check('Session outage retains failure state without login redirect',urlparse(page.url).path=='/account/payment-methods' and not page.get_by_role('heading',name='Payment methods',exact=True).count())
            else:
                page.wait_for_url(lambda url:urlparse(url).path=='/login')
                check(f'{mode} protected role/status gate preserved',urlparse(page.url).path=='/login' and (mode!='blocked' or 'blocked=1' in page.url))
        check('Fixture made no API writes',not report['apiWrites'])
        check('No uncaught browser exceptions',not report['runtimeErrors'])
        browser.close()
finally:
    Path('docs/rentra-ui-redesign-phase-3-2'+('-before' if args.baseline else '')+'.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    if next_process.poll() is None:
        if os.name=='nt':
            # These ports were verified free before this owned helper launched.
            rows=subprocess.check_output(['netstat','-ano','-p','tcp'],text=True)
            owned=[next_process.pid]
            for row in rows.splitlines():
                parts=row.split()
                if len(parts)==5 and parts[1]=='127.0.0.1:3123' and parts[3]=='LISTENING':
                    owned.append(int(parts[4]))
            subprocess.run(['powershell','-NoProfile','-Command','Stop-Process -Id '+','.join(str(pid) for pid in owned)+' -Force -ErrorAction SilentlyContinue'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,creationflags=subprocess.CREATE_NO_WINDOW)
        else:
            next_process.terminate()
        next_process.wait(timeout=10)
    api.shutdown()
    api.server_close()
    log.close()
    Path('docs/rentra-ui-redesign-phase-3-2'+('-before' if args.baseline else '')+'.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
if not args.baseline and any(not c['passed'] for c in report['checks']):
    raise SystemExit(1)
