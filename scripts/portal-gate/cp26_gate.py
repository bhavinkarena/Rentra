"""CP26 disposable browser/API gate. Run with CP26_GATE_FIXTURE set."""
import json
import os
import base64
import hashlib
import hmac
import struct
import time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[2]
f = json.loads(Path(os.environ['CP26_GATE_FIXTURE']).read_text())
web, api = 'http://localhost:3106', 'http://localhost:4106/api/v1'
results = []
completed = False

def check(label, ok):
    results.append({'check': label, 'pass': bool(ok)})
    print(('PASS ' if ok else 'FAIL ') + label, flush=True)
    assert ok, label

def code(secret):
    secret = base64.b32decode(secret + '=' * ((8-len(secret)%8)%8))
    d = hmac.new(secret, struct.pack('>Q', int(time.time())//30), hashlib.sha1).digest()
    offset = d[-1] & 15
    return f'{(struct.unpack(">I", d[offset:offset+4])[0] & 0x7fffffff)%1000000:06d}'

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    try:
        contexts = {}
        for kind in ['admin', 'second', 'readonly', 'limited', 'owner', 'anonymous']:
            c = browser.new_context(viewport={'width':1280,'height':950})
            if kind != 'anonymous':
                c.add_cookies([{'name':'rentra_session' if kind=='owner' else 'rentra_admin', 'value':f['tokens'][kind], 'url':web}])
            contexts[kind] = c
        for kind in ['anonymous','owner']:
            check(kind+' security API denied', contexts[kind].request.get(api+'/admin/security').status == 401)
        check('missing capability denied', contexts['limited'].request.get(api+'/admin/security').status == 403)
        check('read-only mutation denied', contexts['readonly'].request.post(api+'/admin/security/'+f['ids']['second'],data={'command':'revoke','version':1,'reason':'Reviewed session removal','confirmed':True}).status == 403)
        admin = contexts['admin']
        def get(path):
            r=admin.request.get(api+path)
            assert r.ok, r.status
            return r.json()['data']
        def command(id, command, version, **extra):
            return admin.request.post(api+'/admin/security/'+id,data={'command':command,'version':version,'reason':'Reviewed browser security change','confirmed':True,**extra})
        page=admin.new_page()
        page.goto(web+'/admin/security', wait_until='networkidle')
        expect(page.get_by_role('heading',name='Operators & security',exact=True)).to_be_visible()
        check('operator directory rendered', page.get_by_role('link',name='second operator',exact=True).count()==1)
        axe=(ROOT/'node_modules/axe-core/axe.min.js').read_text()
        def audit(label):
            for width in [1280,390]:
                page.set_viewport_size({'width':width,'height':950})
                check(label+f' {width}px no overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
                page.add_script_tag(content=axe)
                issues=page.evaluate("async () => (await axe.run({runOnly:['wcag2a','wcag2aa']})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
                check(label+f' {width}px accessibility',not issues)
            page.set_viewport_size({'width':1280,'height':950})
        audit('directory')
        page.get_by_label('Name',exact=True).fill('Browser operator')
        page.get_by_label('Email',exact=True).fill('browser@fixture.invalid')
        page.get_by_label('admin.records.read',exact=True).check()
        page.get_by_label('Reason',exact=True).fill('Create an operations reviewer')
        page.get_by_label('I reviewed the access and session impact.').check()
        page.get_by_role('button',name='Create and enroll',exact=True).click()
        expect(page.get_by_label('Private enrollment link')).to_be_visible()
        link=page.get_by_label('Private enrollment link').input_value()
        token=link.split('#')[1]
        id=get('/admin/security?q=browser@fixture.invalid')['items'][0]['id']
        check('creation saved with assigned capability',get('/admin/security/'+id)['operator']['capabilities']==['admin.records.read'])
        recipient=contexts['anonymous'].new_page()
        recipient.goto(link,wait_until='networkidle')
        recipient.get_by_role('button',name='Open enrollment',exact=True).click()
        expect(recipient.get_by_label('Authenticator setup URI')).to_be_visible()
        check('enrollment token removed from address', '#' not in recipient.url)
        uri=recipient.get_by_label('Authenticator setup URI').input_value()
        secret=parse_qs(urlparse(uri).query)['secret'][0]
        recipient.get_by_label('New password',exact=True).fill(f['password'])
        recipient.get_by_label('Authenticator code',exact=True).fill(code(secret))
        recipient.get_by_role('button',name='Confirm enrollment').click()
        expect(recipient.get_by_role('status')).to_contain_text('Enrollment complete.')
        check('enrollment link single use',contexts['anonymous'].request.post(api+'/admin/auth/enrollment',data={'token':token,'command':'preview'}).status==401)
        recipient.goto(web+'/admin/login',wait_until='networkidle')
        recipient.get_by_label('Email',exact=True).fill('browser@fixture.invalid')
        recipient.get_by_label('Password',exact=True).fill(f['password'])
        recipient.get_by_label('Authenticator code').fill(code(secret))
        recipient.get_by_role('button',name='Sign in',exact=True).click()
        recipient.wait_for_url(web+'/admin')
        check('enrolled credentials sign in', contexts['anonymous'].request.get(api+'/admin/auth/me').status==200)
        check('new operator security endpoint denied',contexts['anonymous'].request.get(api+'/admin/security').status==403)
        page.goto(web+'/admin/security/'+id,wait_until='networkidle')
        audit('operator detail')
        check('sessions listed',get('/admin/security/'+id)['sessions']!=[])
        page.get_by_label('Reason',exact=True).fill('Recover the lost authenticator')
        page.get_by_label('I reviewed the access and session impact.').check()
        page.get_by_role('button',name='Start factor recovery',exact=True).click()
        expect(page.get_by_label('Private enrollment link')).to_be_visible()
        recovery=page.get_by_label('Private enrollment link').input_value()
        check('recovery revokes active session',contexts['anonymous'].request.get(api+'/admin/auth/me').status==401)
        old=contexts['anonymous'].request.post(api+'/admin/auth/login',data={'email':'browser@fixture.invalid','password':f['password'],'totp':code(secret)})
        check('lost credentials cannot sign in',old.status==422)
        recipient.goto(recovery,wait_until='networkidle')
        recipient.get_by_role('button',name='Open enrollment',exact=True).click()
        expect(recipient.get_by_label('Authenticator setup URI')).to_be_visible()
        new_secret=parse_qs(urlparse(recipient.get_by_label('Authenticator setup URI').input_value()).query)['secret'][0]
        check('recovery factor replaced',new_secret!=secret)
        recipient.get_by_label('New password',exact=True).fill(f['password'])
        recipient.get_by_label('Authenticator code',exact=True).fill(code(new_secret))
        recipient.get_by_role('button',name='Confirm enrollment').click()
        expect(recipient.get_by_role('status')).to_contain_text('Enrollment complete.')
        check('recovery audited',any(h['action']=='operator_recover' for h in get('/admin/security/'+id)['history']))
        version=get('/admin/security/'+id)['operator']['version']
        check('stale command refused',command(id,'access',version-1,active=False,permissions=[]).status==409)
        page.goto(web+'/admin/security/'+id,wait_until='networkidle')
        page.get_by_label('Active',exact=True).uncheck()
        page.get_by_label('Reason',exact=True).fill('Deactivate this temporary operator')
        page.get_by_label('I reviewed the access and session impact.').check()
        page.get_by_role('button',name='Save access',exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('Change saved.')
        expect(page.get_by_label('Active',exact=True)).not_to_be_checked()
        check('deactivation persisted',not get('/admin/security/'+id)['operator']['active'])
        page.get_by_label('Active',exact=True).check()
        page.get_by_label('Reason',exact=True).fill('Restore this temporary operator')
        page.get_by_label('I reviewed the access and session impact.').check()
        page.get_by_role('button',name='Save access',exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('Change saved.')
        expect(page.get_by_label('Active',exact=True)).to_be_checked()
        check('activation persisted',get('/admin/security/'+id)['operator']['active'])
        check('self access change refused',command(f['ids']['admin'],'access',1,active=False,permissions=[]).status==409)
        check('old factor rejected after recovery',contexts['anonymous'].request.post(api+'/admin/auth/login',data={'email':'browser@fixture.invalid','password':f['password'],'totp':code(secret)}).status==422)
        check('replacement factor sign in works',contexts['anonymous'].request.post(api+'/admin/auth/login',data={'email':'browser@fixture.invalid','password':f['password'],'totp':code(new_secret)}).status==200)
        page.goto(web+'/admin/security/'+id,wait_until='networkidle')
        page.get_by_label('Reason',exact=True).fill('End the temporary operator sessions')
        page.get_by_label('I reviewed the access and session impact.').check()
        page.get_by_role('button',name='Sign out everywhere',exact=True).click()
        expect(page.get_by_role('status')).to_contain_text('Change saved.')
        check('explicit session revoke next request denied',contexts['anonymous'].request.get(api+'/admin/auth/me').status==401)
        readonly=contexts['readonly'].new_page()
        readonly.goto(web+'/admin/security/'+id,wait_until='networkidle')
        check('read-only UI has no management form',readonly.get_by_role('button',name='Save access').count()==0)
        data=get('/admin/security/'+id)
        check('management response contains no seeds or passwords',all(s not in json.dumps(data) for s in [secret,new_secret,f['password'],token]))
        page.screenshot(path=str(ROOT/'docs/rentra-client-admin-part26-detail.png'),full_page=True)
        completed=True
    finally:
        (ROOT/'docs/rentra-client-admin-part26-gate.json').write_text(json.dumps({'completed':completed,'checks':results},indent=2))
        browser.close()
