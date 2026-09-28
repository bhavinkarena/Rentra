"""CP27 acceptance against disposable API 4107, fault proxy 4108, frontend 3107."""
import json
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[2]
f=json.loads(Path(os.environ['CP27_GATE_FIXTURE']).read_text())
web,api,proxy='http://localhost:3107','http://localhost:4107/api/v1','http://localhost:4108'
results=[]
completed=False
def check(label,ok):
    results.append({'check':label,'pass':bool(ok)})
    print(('PASS ' if ok else 'FAIL ')+label,flush=True)
    assert ok,label
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    try:
        contexts={}
        for kind in ['admin','readonly','limited','customer','foreign','anonymous']:
            c=browser.new_context(viewport={'width':1280,'height':950})
            if kind!='anonymous':
                c.add_cookies([{'name':'rentra_session' if kind in ['customer','foreign'] else 'rentra_admin','value':f['tokens'][kind],'url':web}])
            contexts[kind]=c
        a=contexts['admin']
        def get(id):
            response=a.request.get(api+'/admin/privacy/requests/'+id)
            assert response.ok,response.status
            return response.json()['data']
        def wait_job(id,state):
            deadline=time.time()+25
            while time.time()<deadline:
                d=get(id)
                if d['job'] and d['job']['state']==state:return d
                time.sleep(.25)
            raise AssertionError('Job did not reach '+state)
        for kind in ['anonymous','customer','foreign']:
            check(kind+' cannot read admin privacy API',contexts[kind].request.get(api+'/admin/privacy/requests').status==401)
        check('missing privacy capability denied',contexts['limited'].request.get(api+'/admin/privacy/requests').status==403)
        check('read-only mutation denied',contexts['readonly'].request.post(api+'/admin/privacy/requests/'+f['ids']['access'],data={'command':'review','version':1,'reason':'Reviewed browser privacy scope','confirmed':True}).status==403)
        page=a.new_page()
        page.goto(web+'/admin/privacy',wait_until='networkidle')
        expect(page.get_by_role('heading',name='Customer privacy requests',exact=True)).to_be_visible()
        check('authoritative directory count', '2 matching requests' in page.locator('main').inner_text())
        axe=(ROOT/'node_modules/axe-core/axe.min.js').read_text()
        def audit(label):
            for width in [1280,390]:
                page.set_viewport_size({'width':width,'height':950})
                check(label+f' {width}px no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                page.add_script_tag(content=axe)
                issues=page.evaluate("async()=> (await axe.run({runOnly:['wcag2a','wcag2aa']})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
                check(label+f' {width}px axe',not issues)
            page.set_viewport_size({'width':1280,'height':950})
        audit('directory')
        page.get_by_role('link',name='Account data copy',exact=True).click()
        expect(page.get_by_role('heading',name='Account data copy',exact=True)).to_be_visible()
        audit('detail')
        readonly=contexts['readonly'].new_page()
        readonly.goto(web+'/admin/privacy/'+f['ids']['access'],wait_until='networkidle')
        check('read-only detail has no approval controls',readonly.get_by_role('button',name='Record review',exact=True).count()==0)
        check('detail omits artifact keys and authentication secrets',not any(s in json.dumps(get(f['ids']['access'])) for s in ['artifact_ciphertext','photo_key','code_hash','token_ciphertext']))
        # Read outages and rejected commands retain the review input.
        a.request.get(proxy+'/__fault/set?re=admin/privacy/requests')
        outage=a.new_page()
        for path in ['/admin/privacy','/admin/privacy/'+f['ids']['access']]:
            outage.goto(web+path,wait_until='networkidle')
            expect(outage.get_by_role('heading',name='This page could not load',exact=True)).to_be_visible()
            check('retryable outage '+path,outage.get_by_role('button',name='Try again',exact=True).count()==1)
        page.get_by_label('Identity / authority review reference',exact=True).fill('Browser verified identity')
        page.get_by_label('Verified receipt-delivery reference',exact=True).fill('Browser verified support handoff')
        page.get_by_label('Reason',exact=True).fill('Reviewed browser privacy request scope')
        page.get_by_label('I verified the scope and consequences of this command.').check()
        page.get_by_role('button',name='Record review',exact=True).click()
        expect(page.get_by_role('alert').filter(has_text='Service unavailable.')).to_be_visible()
        check('failed review preserves reason',page.get_by_label('Reason',exact=True).input_value()=='Reviewed browser privacy request scope')
        check('failed review writes nothing',get(f['ids']['access'])['request']['version']==1)
        a.request.get(proxy+'/__fault/set')
        page.get_by_role('button',name='Record review',exact=True).click()
        expect(page.get_by_role('button',name='Preview fulfillment',exact=True)).to_be_visible()
        check('identity review committed',get(f['ids']['access'])['request']['review']['policy']=='rentra-retention-v1')
        page.get_by_role('button',name='Preview fulfillment',exact=True).click()
        expect(page.get_by_role('button',name='Approve and queue',exact=True)).to_be_visible()
        check('preview does not create a job',get(f['ids']['access'])['job'] is None)
        page.get_by_role('button',name='Approve and queue',exact=True).click()
        wait_job(f['ids']['access'],'completed')
        page.get_by_role('button',name='Refresh status',exact=True).click()
        expect(page.get_by_role('heading',name='Outcome receipt',exact=True)).to_be_visible()
        check('admin data copy download',a.request.get(web+'/admin/privacy/'+f['ids']['access']+'/export').status==200)
        check('admin receipt download',a.request.get(web+'/admin/privacy/'+f['ids']['access']+'/receipt').status==200)
        check('read-only authorized export download',contexts['readonly'].request.get(api+'/admin/privacy/requests/'+f['ids']['access']+'/export').status==200)
        a.request.get('http://localhost:4107/__fixture/revoke-readonly')
        check('revoked admin session cannot download',contexts['readonly'].request.get(api+'/admin/privacy/requests/'+f['ids']['access']+'/export').status==401)
        check('foreign customer export denied',contexts['foreign'].request.get(api+'/customer/account/privacy/'+f['ids']['access']+'/export').status==404)
        check('anonymous export denied',contexts['anonymous'].request.get(api+'/customer/account/privacy/'+f['ids']['access']+'/export').status==401)
        customer=contexts['customer'].new_page()
        customer.goto(web+'/account/privacy',wait_until='networkidle')
        expect(customer.get_by_role('link',name='Download scoped data copy',exact=True)).to_be_visible()
        with customer.expect_download() as dl:
            customer.get_by_role('link',name='Download scoped data copy',exact=True).click()
        downloaded=json.loads(Path(dl.value.path()).read_text())
        check('customer same-origin authorized download',downloaded['account']['id']==f['ids']['customer'] and len(downloaded['bookings'])==1)
        check('export exclusions are explicit',len(downloaded['exclusions'])==2)
        a.request.get('http://localhost:4107/__fixture/expire')
        check('expired admin download denied',a.request.get(api+'/admin/privacy/requests/'+f['ids']['access']+'/export').status==409)
        check('expired customer download denied',contexts['customer'].request.get(api+'/customer/account/privacy/'+f['ids']['access']+'/export').status==409)
        page.goto(web+'/admin/privacy/'+f['ids']['deletion'],wait_until='networkidle')
        page.get_by_label('Identity / authority review reference',exact=True).fill('Browser closure verification')
        page.get_by_label('Verified receipt-delivery reference',exact=True).fill('Browser verified closure handoff')
        page.get_by_label('Approve partial live-profile anonymization',exact=False).check()
        page.get_by_label('Reason',exact=True).fill('Reviewed partial closure and retained evidence')
        page.get_by_label('I verified the scope and consequences of this command.').check()
        page.get_by_role('button',name='Record review',exact=True).click()
        expect(page.get_by_role('button',name='Preview fulfillment',exact=True)).to_be_visible()
        page.get_by_role('button',name='Preview fulfillment',exact=True).click()
        expect(page.get_by_role('button',name='Approve and queue',exact=True)).to_be_visible()
        page.get_by_role('button',name='Approve and queue',exact=True).click()
        failed=wait_job(f['ids']['deletion'],'failed')
        check('partial failure has checkpoint and no receipt',failed['job']['stage']==2 and failed['request']['receipt'] is None)
        check('closure approval revoked customer session',contexts['customer'].request.get(api+'/customer/account').status==401)
        page.get_by_role('button',name='Refresh status',exact=True).click()
        expect(page.get_by_role('button',name='Retry failed stage',exact=True)).to_be_visible()
        page.get_by_label('Reason',exact=True).fill('Retry the reviewed failure from its saved checkpoint')
        page.get_by_label('I verified the scope and consequences of this command.').check()
        page.get_by_role('button',name='Retry failed stage',exact=True).click()
        done=wait_job(f['ids']['deletion'],'completed')
        page.get_by_role('button',name='Refresh status',exact=True).click()
        expect(page.get_by_role('heading',name='Outcome receipt',exact=True)).to_be_visible()
        check('successful retry reports partial anonymization',done['request']['receipt']['outcome']=='partial_anonymization_complete' and not done['request']['receipt']['fullDeletion'])
        check('receipt reports retained identity and external work',len(done['request']['receipt']['retained'])==4 and len(done['request']['receipt']['outstanding'])==5)
        check('live identifiers removed',done['customer']['name'] is None and done['customer']['email'] is None and done['customer']['phone'] is None)
        check('completed closure cannot be approved again',page.get_by_role('button',name='Approve and queue',exact=True).count()==0)
        check('receipt shows actual removed preference count','Removed favourites: 1' in page.locator('main').inner_text())
        audit('completed detail')
        page.screenshot(path=str(ROOT/'docs/rentra-client-admin-part27-detail.png'),full_page=True)
        completed=True
    finally:
        browser.close()
        (ROOT/'docs/rentra-client-admin-part27-gate.json').write_text(json.dumps({'completed':completed,'checks':results},indent=2))
