"""Phase 5 review gate; isolated localhost fixture only."""
import json
import os
import re
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse, parse_qs, quote
from playwright.sync_api import sync_playwright, expect

web=os.environ.get('GATE_WEB_ORIGIN','http://127.0.0.1:3163')
api=os.environ.get('GATE_API_ORIGIN','http://127.0.0.1:4163/api/v1')
assert all(urlparse(url).hostname in ['127.0.0.1','localhost'] for url in [web,api])
fixture=json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
root=Path(__file__).resolve().parents[2];output=root/'docs/evidence/admin-phase5';output.mkdir(parents=True,exist_ok=True)
axe=(root/'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results={'scope':'Disposable local fixture; no production/provider requests','checks':[],'pageErrors':[],'accessibility':[]}
property_id=fixture['review']['property'];app=fixture['application']

def passed(name):
    results['checks'].append(name);print('PASS',name,flush=True)

def visit(page,path):
    page.goto(web+path);page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading',level=1)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),path

def audit(page,name):
    page.add_script_tag(content=axe)
    data=page.evaluate("""async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))""")
    results['accessibility'].append({'screen':name,'violations':data});assert not data,json.dumps(data);passed(name+' axe checks')

with sync_playwright() as p:
    browser=p.chromium.launch(channel='chrome',headless=True)
    try:
        context=browser.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce')
        context.add_cookies([{'name':'rentra_admin','value':fixture['tokens']['full'],'url':web}])
        page=context.new_page();page.on('pageerror',lambda error:results['pageErrors'].append(str(error)))
        for width in [1280,768,360]:
            page.set_viewport_size({'width':width,'height':900})
            for name,path in [('property-queue','/admin/properties'),('property-submission',f'/admin/properties/{property_id}'),('property-decision',f'/admin/properties/{property_id}?tab=decision'),('application-documents',f'/admin/applications/{app}?tab=documents')]:
                visit(page,path)
                for control in page.locator('main button,main select,main input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])').all():
                    if control.is_visible():assert control.bounding_box()['height']>=44
                if name=='property-queue':
                    table=page.get_by_role('region',name='Property reviews',exact=True)
                    expect(table.locator('th[scope="col"]')).to_have_count(6);table.focus();expect(table).to_be_focused()
                    assert table.evaluate('e=>getComputedStyle(e).outlineStyle')!='none'
                    if width<1080:
                        assert table.evaluate('e=>e.scrollWidth>e.clientWidth');page.keyboard.press('ArrowRight');page.wait_for_function('e=>e.scrollLeft>0',arg=table.element_handle())
                if name=='property-submission':expect(page.get_by_role('region',name='Revision changes',exact=True)).to_contain_text('Description')
                if name=='application-documents':expect(page.get_by_role('link',name='Open front',exact=True)).to_be_visible()
                page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(output/f'{name}-{width}.png'),full_page=True)
                if width in [1280,360]:audit(page,f'{name}-{width}')
                passed(f'{name} {width}px layout, controls and real data')
        page.set_viewport_size({'width':1280,'height':900})
        visit(page,'/admin/properties?q=River&assignee=me')
        page.get_by_role('link',name='Review property Review River Farm',exact=True).click();page.wait_for_url(f'**/admin/properties/{property_id}?**')
        sections=page.get_by_role('navigation',name='Record sections')
        sections.get_by_role('link',name='Review decision',exact=True).click();page.wait_for_url('**tab=decision**')
        assert 'q=River' in parse_qs(urlparse(page.url).query)['from'][0]
        page.reload();page.wait_for_load_state('networkidle');expect(page.get_by_role('button',name='Record decision',exact=True)).to_be_visible()
        passed('Property open/tab/refresh preserves filtered queue')
        for tab in ['submission','decision','verification','visibility']:
            visit(page,f'/admin/properties/{property_id}?tab={tab}&revision={fixture["review"]["historical"]}')
            expect(page.get_by_text('Historical revision: commands are read-only.',exact=False)).to_be_visible()
            expect(page.get_by_role('button',name='Record decision',exact=True)).to_have_count(0)
            expect(page.get_by_role('link',name='Open private document',exact=True)).to_have_count(0)
            passed('Historical '+tab+' hides commands and evidence previews')
        visit(page,f'/admin/properties/{property_id}?revision=00000000-0000-4000-8000-000000000000')
        expect(page.get_by_role('button',name='Record decision',exact=True)).to_have_count(0)
        expect(page.get_by_role('heading',name='Review River Farm',exact=True)).to_have_count(0)
        passed('Unknown revision never falls back to an actionable current record')
        assert context.request.get(api+'/admin/documents/'+fixture['review']['replacedDocument'],headers={'Cookie':'rentra_admin='+fixture['tokens']['full']}).status==404
        passed('Replaced private evidence direct URL returns 404')
        for role,can_open in [('readonly',True),('appWriter',False),('documentReader',True)]:
            c=browser.new_context(viewport={'width':360,'height':900});c.add_cookies([{'name':'rentra_admin','value':fixture['tokens'][role],'url':web}]);r=c.new_page()
            visit(r,f'/admin/applications/{app}?tab=documents')
            expect(r.get_by_role('button',name='Accept',exact=True)).to_have_count(0)
            expect(r.get_by_role('button',name='Reject',exact=True)).to_have_count(0)
            expect(r.get_by_role('link',name='Open front',exact=True)).to_have_count(1 if can_open else 0)
            assert c.request.post(api+'/admin/documents/review',headers={'Cookie':'rentra_admin='+fixture['tokens'][role]},multipart={'documentId':fixture['review']['document'],'outcome':'accepted'}).status==403
            if not can_open:assert c.request.get(api+'/admin/documents/'+fixture['review']['document'],headers={'Cookie':'rentra_admin='+fixture['tokens'][role]}).status==403
            audit(r,role+'-documents');passed(role+' document permissions enforced in UI/API');c.close()
        c=browser.new_context();c.add_cookies([{'name':'rentra_admin','value':fixture['tokens']['readonly'],'url':web}]);r=c.new_page()
        visit(r,f'/admin/properties/{property_id}?tab=decision');expect(r.get_by_role('button',name='Record decision')).to_have_count(0)
        assert c.request.post(api+'/admin/properties/'+property_id+'/decision',headers={'Cookie':'rentra_admin='+fixture['tokens']['readonly']},multipart={'submissionId':fixture['review']['current'],'outcome':'approved_for_visit','reason':'Fixture refusal'}).status==403
        passed('Read-only property decision UI/API');c.close()

        # Real Server Actions: each committed outcome returns to the exact queue and survives refresh.
        for outcome in ['approve','more_info','reject']:
            target=fixture['review']['decisions'][outcome]
            back='/admin/applications?q=Fixture&assignee=any'
            visit(page,f'/admin/applications/{target}?tab=decision&from={quote(back,safe="")}')
            if outcome=='approve':
                page.get_by_role('button',name='Approve',exact=True).click();page.get_by_role('button',name='Approve and activate',exact=True).click()
            elif outcome=='more_info':
                page.get_by_role('button',name='Need more info',exact=True).click();page.get_by_label('Name / address',exact=True).check();page.get_by_label('Reason for requesting more information',exact=True).fill('Please clarify your address.');page.get_by_role('button',name='Send back with questions',exact=True).click()
            else:
                page.get_by_role('button',name='Reject',exact=True).click();page.get_by_label('Reason for rejection',exact=True).fill('This submitted evidence does not match.');page.locator('form').get_by_role('button',name='Reject',exact=True).click()
            decided={'approve':'approved','more_info':'more_info','reject':'rejected'}[outcome]
            page.wait_for_url('**decided='+decided+'**');page.wait_for_load_state('networkidle')
            query=parse_qs(urlparse(page.url).query);assert query['q']==['Fixture'] and query['assignee']==['any']
            page.reload();page.wait_for_load_state('networkidle')
            expect(page.get_by_text({'approve':'Approved. They can add properties now','more_info':'Sent back with questions. Not counted as a strike.','reject':'Rejected. They can correct it and resubmit.'}[outcome],exact=False)).to_be_visible()
            passed(outcome+' Server Action retains queue and durable feedback')

        visit(page,f'/admin/properties/{property_id}?tab=decision')
        page.locator('select[name="outcome"]').select_option('approved_for_visit');page.get_by_label(re.compile('^Reason shown')).fill('Submission is ready for a verification visit.');page.get_by_role('button',name='Record decision',exact=True).click()
        expect(page.get_by_role('region',name='Latest recorded property decision')).to_contain_text('approved for visit')
        page.reload();page.wait_for_load_state('networkidle');expect(page.get_by_role('region',name='Latest recorded property decision')).to_contain_text('approved for visit')
        passed('Property decision appears in durable backend record')
        visit(page,f'/admin/properties/{property_id}?tab=verification')
        expect(page.get_by_role('button',name='Publish this revision',exact=True)).to_have_count(0)
        page.get_by_label(re.compile(r'^When \(India')).fill((datetime.now()+timedelta(days=3)).strftime('%Y-%m-%dT11:00'))
        page.get_by_role('button',name='Schedule verification',exact=True).click();expect(page.get_by_role('button',name='Record verification outcome',exact=True)).to_be_visible()
        page.locator('select[name="outcome"]').select_option('failed');page.get_by_label(re.compile('^Findings')).fill('The property safety checks failed. Request corrections before review.');page.get_by_role('button',name='Record verification outcome',exact=True).click()
        expect(page.get_by_role('button',name='Record verification outcome',exact=True)).to_have_count(0)
        expect(page.get_by_role('button',name='Publish this revision',exact=True)).to_have_count(0)
        page.reload();page.wait_for_load_state('networkidle');expect(page.get_by_text('The property safety checks failed.',exact=False).first).to_be_visible()
        response=context.request.post(api+'/admin/properties/'+property_id+'/publish',headers={'Cookie':'rentra_admin='+fixture['tokens']['full']},multipart={'submissionId':fixture['review']['current']})
        assert response.status==409
        passed('Unverified and failed verification never expose publication; direct publish denied')
        audit(page,'failed-verification')
        assert not results['pageErrors'],results['pageErrors']
    finally:
        (output/'browser-checks.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8');browser.close()
