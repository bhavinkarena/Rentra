"""Run with the disposable API on 4206 and existing fault-proxy.mjs on 4106."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
root=Path(__file__).resolve().parents[2]
f=json.loads(Path(os.environ['CP26_GATE_FIXTURE']).read_text())
results=[]
completed=False
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    try:
        c=browser.new_context()
        c.add_cookies([{'name':'rentra_admin','value':f['tokens']['admin'],'url':'http://localhost:3106'}])
        page=c.new_page()
        c.request.get('http://localhost:4106/__fault/set?re=admin/security')
        for path in ['/admin/security','/admin/security/'+f['ids']['second']]:
            page.goto('http://localhost:3106'+path,wait_until='networkidle')
            expect(page.get_by_role('heading',name='This page could not load',exact=True)).to_be_visible()
            expect(page.get_by_role('button',name='Try again',exact=True)).to_be_visible()
            results.append({'check':'Retryable outage '+path,'pass':True})
        c.request.get('http://localhost:4106/__fault/set')
        page.goto('http://localhost:3106/admin/security/'+f['ids']['second'],wait_until='networkidle')
        page.get_by_label('Reason',exact=True).fill('Keep this reason through a refused request')
        page.get_by_label('I reviewed the access and session impact.').check()
        c.request.get('http://localhost:4106/__fault/set?re=admin/security')
        page.get_by_role('button',name='Sign out everywhere',exact=True).click()
        expect(page.get_by_role('alert').filter(has_text='Service unavailable.')).to_be_visible()
        expect(page.get_by_label('Reason',exact=True)).to_have_value('Keep this reason through a refused request')
        results.append({'check':'Failed command preserves typed reason','pass':True})
        c.request.get('http://localhost:4106/__fault/set')
        results.append({'check':'Failed command does not revoke sessions','pass':len(c.request.get('http://localhost:4106/api/v1/admin/security/'+f['ids']['second']).json()['data']['sessions'])==1})
        page.goto('http://localhost:3106/admin/login?reauthenticate=1',wait_until='networkidle')
        expect(page.get_by_role('button',name='Sign in',exact=True)).to_be_visible()
        results.append({'check':'Signed-in operator can open reauthentication form','pass':True})
        created=c.request.post('http://localhost:4106/api/v1/admin/security',data={'command':'create','reason':'Check enrollment outage recovery','confirmed':True,'name':'Outage recipient','email':'outage@fixture.invalid','permissions':[]}).json()['data']
        page.goto('http://localhost:3106/admin/enroll#'+created['enrollmentToken'],wait_until='networkidle')
        c.request.get('http://localhost:4106/__fault/set?re=admin/auth/enrollment')
        page.get_by_role('button',name='Open enrollment',exact=True).click()
        expect(page.get_by_role('alert').filter(has_text='Service unavailable.')).to_be_visible()
        expect(page.get_by_role('button',name='Retry enrollment',exact=True)).to_be_visible()
        results.append({'check':'Enrollment outage offers retry after fragment removal','pass':True})
        c.request.get('http://localhost:4106/__fault/set')
        page.get_by_role('button',name='Retry enrollment',exact=True).click()
        expect(page.get_by_label('Authenticator setup URI')).to_be_visible()
        results.append({'check':'Enrollment retry succeeds using retained token','pass':True})
        assert all(r['pass'] for r in results)
        completed=True
        print(f"PASS {len(results)} outage and reauthentication checks")
    finally:
        c.request.get('http://localhost:4106/__fault/set')
        browser.close()
        (root/'docs/rentra-client-admin-part26-outage-gate.json').write_text(json.dumps({'completed':completed,'checks':results},indent=2))
