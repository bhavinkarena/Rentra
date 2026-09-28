"""CP28 synthetic acceptance: disposable API 4117, proxy 4118, frontend 3108."""
import json, os, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT=Path(__file__).resolve().parents[2]
f=json.loads(Path(os.environ['CP28_GATE_FIXTURE']).read_text())
web,api,proxy='http://localhost:3108','http://localhost:4117/api/v1','http://localhost:4118'
results=[];completed=False
def check(name,ok):
    results.append({'check':name,'pass':bool(ok)});print(('PASS ' if ok else 'FAIL ')+name,flush=True);assert ok,name
with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True)
    try:
        contexts={}
        for k in ['admin','other','readonly','limited','anonymous']:
            c=browser.new_context(viewport={'width':1280,'height':950})
            if k!='anonymous':c.add_cookies([{'name':'rentra_admin','value':f['tokens'][k],'url':web}])
            contexts[k]=c
        a=contexts['admin'];page=a.new_page()
        check('anonymous API denied',contexts['anonymous'].request.get(api+'/admin/audit/events').status==401)
        check('missing audit capability denied',contexts['limited'].request.get(api+'/admin/audit/events').status==403)
        check('read-only export creation denied',contexts['readonly'].request.post(api+'/admin/audit/exports',data={}).status==403)
        page.goto(web+'/admin/audit?action=fixture_change',wait_until='networkidle')
        expect(page.get_by_role('heading',name='Audit history',exact=True)).to_be_visible()
        check('search returns authoritative total','1 matching events' in page.locator('main').inner_text())
        check('URL filters populate form',page.get_by_label('Exact action',exact=True).input_value()=='fixture_change')
        axe=(ROOT/'node_modules/axe-core/axe.min.js').read_text()
        def audit(name):
            for width in [1280,390]:
                page.set_viewport_size({'width':width,'height':950})
                check(name+f' {width}px no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                page.add_script_tag(content=axe)
                violations=page.evaluate("async()=> (await axe.run({runOnly:['wcag2a','wcag2aa']})).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)")
                check(name+f' {width}px axe',not violations)
            page.set_viewport_size({'width':1280,'height':950})
        audit('audit directory')
        page.get_by_role('link',name='fixture_change',exact=True).click()
        expect(page.get_by_role('heading',name='Audit event',exact=True)).to_be_visible()
        body=page.locator('main').inner_text()
        check('detail removes secret fields and free text',not any(x in body for x in ['SECRET','PRIVATE@','password']))
        check('safe difference shown','Before: "active"' in body and 'After: "blocked"' in body)
        check('reason presence accurately recorded','free text withheld' in body)
        audit('audit detail')
        page.goto(web+'/admin/audit/events/'+f['ids']['operation'],wait_until='networkidle')
        expect(page.get_by_role('heading',name='Committed operation receipt',exact=True)).to_be_visible()
        check('calendar receipt shows committed counts','Attempted: 4' in page.locator('main').inner_text() and 'Added: 4' in page.locator('main').inner_text())
        readonly=contexts['readonly'].new_page();readonly.goto(web+'/admin/audit',wait_until='networkidle')
        check('read-only browser has no queue control',readonly.get_by_role('button',name='Queue export',exact=True).count()==0)
        page.goto(web+'/admin/audit?action=fixture_change',wait_until='networkidle')
        page.get_by_label('Export reason',exact=True).fill('Investigate synthetic scope with injected failure')
        page.get_by_label('I verified the dataset and scope. This copy expires after 24 hours.',exact=True).check()
        a.request.get(proxy+'/__fault/set?re=admin/audit')
        outage=a.new_page()
        for path in ['/admin/audit','/admin/audit/events/'+f['ids']['event'],'/admin/audit/exports']:
            outage.goto(web+path,wait_until='networkidle')
            expect(outage.get_by_role('heading',name='This page could not load',exact=True)).to_be_visible()
            check('retryable outage '+path,outage.get_by_role('button',name='Try again',exact=True).count()==1)
        a.request.get(proxy+'/__fault/set')
        page.goto(web+'/admin/audit?action=fixture_change',wait_until='networkidle')
        page.get_by_label('Export reason',exact=True).fill('Investigate synthetic scope with injected failure')
        page.get_by_label('I verified the dataset and scope. This copy expires after 24 hours.',exact=True).check()
        a.request.get(proxy+'/__fault/set?re=admin/audit/exports')
        page.get_by_role('button',name='Queue export',exact=True).click()
        expect(page.get_by_role('alert').filter(has_text='Service unavailable.')).to_be_visible()
        check('rejected command preserves export reason',page.get_by_label('Export reason',exact=True).input_value()=='Investigate synthetic scope with injected failure')
        a.request.get(proxy+'/__fault/set')
        page.get_by_role('button',name='Queue export',exact=True).click()
        page.wait_for_url('**/admin/audit/exports/*')
        failed_id=page.url.rsplit('/',1)[1]
        def get(id):
            response=a.request.get(api+'/admin/audit/exports/'+id);assert response.ok,response.status;return response.json()['data']['job']
        def wait_job(id,state):
            deadline=time.time()+25
            while time.time()<deadline:
                j=get(id)
                if j['state']==state:return j
                time.sleep(.25)
            raise AssertionError('Did not reach '+state)
        failed=wait_job(failed_id,'failed')
        check('failed generation has no success receipt',failed['receipt'] is None and failed['errorCode']=='EXPORT_FAILED')
        page.get_by_role('button',name='Refresh status',exact=True).click()
        expect(page.get_by_role('button',name='Retry failed export',exact=True)).to_be_visible()
        page.get_by_label('Retry reason',exact=True).fill('Retry the reviewed synthetic export failure')
        page.get_by_label('I reviewed this scope and failure.',exact=True).check()
        page.get_by_role('button',name='Retry failed export',exact=True).click()
        done=wait_job(failed_id,'completed')
        check('retry completed same job with actual receipt',done['attempts']==2 and done['receipt']['rowCount']==1)
        page.get_by_role('button',name='Refresh status',exact=True).click()
        expect(page.get_by_role('link',name='Download scoped JSON',exact=True)).to_be_visible()
        audit('completed export')
        with page.expect_download() as info:page.get_by_role('link',name='Download scoped JSON',exact=True).click()
        payload=json.loads(Path(info.value.path()).read_text())
        check('actual authorized browser download',payload['dataset']=='audit_events' and len(payload['items'])==1)
        check('portable export redacts secrets','SECRET' not in json.dumps(payload) and 'PRIVATE@' not in json.dumps(payload))
        check('receipt download is authorized',a.request.get(web+'/admin/audit/exports/'+failed_id+'/receipt').status==200)
        check('foreign operator detail denied',contexts['other'].request.get(api+'/admin/audit/exports/'+failed_id).status==404)
        check('foreign operator download denied',contexts['other'].request.get(web+'/admin/audit/exports/'+failed_id+'/download').status==404)
        check('anonymous download denied',contexts['anonymous'].request.get(web+'/admin/audit/exports/'+failed_id+'/download').status==401)
        page.goto(web+'/admin/audit',wait_until='networkidle')
        page.get_by_label('Dataset',exact=True).select_option('payment_orders')
        page.get_by_label('Payment environment',exact=True).select_option('test')
        page.get_by_label('Export reason',exact=True).fill('Review synthetic Test payment orders only')
        page.get_by_label('I verified the dataset and scope. This copy expires after 24 hours.',exact=True).check()
        page.get_by_role('button',name='Queue export',exact=True).click();page.wait_for_url('**/admin/audit/exports/*');payment_id=page.url.rsplit('/',1)[1]
        wait_job(payment_id,'completed');payment=a.request.get(web+'/admin/audit/exports/'+payment_id+'/download')
        check('payment export has one explicit environment',payment.status==200 and len(payment.json()['items'])==1 and all(x['environment']=='test' for x in payment.json()['items']))
        a.request.get('http://localhost:4117/__fixture/expire/'+failed_id)
        check('expired data download denied',a.request.get(web+'/admin/audit/exports/'+failed_id+'/download').status==409)
        check('expired-copy receipt still authorized',a.request.get(web+'/admin/audit/exports/'+failed_id+'/receipt').status==200)
        page.goto(web+'/admin/audit/exports/'+failed_id,wait_until='networkidle')
        check('expired UI removes data link',page.get_by_role('link',name='Download scoped JSON',exact=True).count()==0)
        page.goto(web+'/admin/audit/exports',wait_until='networkidle');audit('export directory')
        page.screenshot(path=str(ROOT/'docs/rentra-client-admin-part28-exports.png'),full_page=True)
        a.request.get('http://localhost:4117/__fixture/revoke')
        check('revoked session cannot download data',a.request.get(web+'/admin/audit/exports/'+payment_id+'/download').status==401)
        check('revoked session cannot download receipt',a.request.get(web+'/admin/audit/exports/'+payment_id+'/receipt').status==401)
        completed=True
    finally:
        browser.close();(ROOT/'docs/rentra-client-admin-part28-gate.json').write_text(json.dumps({'completed':completed,'checks':results},indent=2))
