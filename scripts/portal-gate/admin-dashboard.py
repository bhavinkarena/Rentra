"""Phase 4 dashboard gate; disposable localhost fixture, no provider calls."""
import json
import os
import re
import subprocess
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect

web = os.environ.get('GATE_WEB_ORIGIN', 'http://127.0.0.1:3162')
api = os.environ.get('GATE_API_ORIGIN', 'http://127.0.0.1:4162/api/v1')
assert all(urlparse(url).hostname in ['127.0.0.1', 'localhost'] for url in [web, api])
fixture = json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
root = Path(__file__).resolve().parents[2]
output = root / 'docs/evidence/admin-phase4'
output.mkdir(parents=True, exist_ok=True)
axe = (root / 'node_modules/axe-core/axe.min.js').read_text(encoding='utf-8')
results = {'scope':'Disposable local fixture; no production/provider requests', 'checks':[], 'pageErrors':[], 'accessibility':[]}

def passed(name):
    results['checks'].append(name)
    print('PASS', name, flush=True)

def visit(page, path):
    page.goto(web + path)
    page.wait_for_load_state('networkidle')
    expect(page.get_by_role('heading', level=1)).to_be_visible()
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), path

def audit(page, name):
    page.add_script_tag(content=axe)
    violations = page.evaluate("""async () => (await axe.run(document, {runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>n.target)}))""")
    results['accessibility'].append({'screen':name,'violations':violations})
    assert not violations, json.dumps(violations)
    passed(name + ' axe checks')

with sync_playwright() as p:
    browser = p.chromium.launch(channel='chrome', headless=True)
    try:
        context = browser.new_context(viewport={'width':1280,'height':900}, reduced_motion='reduce')
        context.add_cookies([{'name':'rentra_admin','value':fixture['tokens']['full'],'url':web}])
        page = context.new_page()
        page.on('pageerror', lambda error: results['pageErrors'].append(str(error)))
        for width in [1280,768,360]:
            page.set_viewport_size({'width':width,'height':900})
            visit(page,'/admin?period=7d&environment=live')
            expect(page.get_by_role('heading',name='Dashboard',exact=True)).to_be_visible()
            expect(page.get_by_role('button',name='Refresh',exact=True)).to_be_visible()
            expect(page.get_by_label(re.compile('^IST period'))).to_have_value('7d')
            for control in page.locator('main button,main select').all():
                if control.is_visible(): assert control.bounding_box()['height'] >= 44
            table = page.get_by_role('region',name='Needs attention',exact=True)
            table.focus(); expect(table).to_be_focused()
            assert table.evaluate('e=>getComputedStyle(e).outlineStyle') != 'none'
            assert table.locator('th[scope="col"]').count() == 3
            if width == 360:
                assert table.evaluate('e=>e.scrollWidth>e.clientWidth')
                page.keyboard.press('ArrowRight')
                page.wait_for_function('e=>e.scrollLeft>0',arg=table.element_handle())
            passed(f'{width}px containment, semantic tables, focus and controls')
            page.get_by_text('View bookings created data',exact=True).click()
            expect(page.get_by_role('region',name='Bookings created data',exact=True).locator('tbody tr')).to_have_count(7)
            passed(f'{width}px zero-filled accessible trend data')
            page.evaluate('window.scrollTo(0,0)')
            page.screenshot(path=str(output/f'dashboard-{width}.png'),full_page=True)
            audit(page,f'dashboard-{width}')

        page.set_viewport_size({'width':1280,'height':900})
        for label, path, required in [
            ('Open bookings created','/admin/bookings',{'environment':'live','createdFrom':None,'createdTo':None}),
            ('Open booked rent','/admin/bookings',{'rentOnly':'1','environment':'live'}),
            ("Open today's visits",'/admin/bookings',{'tab':'today','unit':'visits','environment':'live'}),
            ('Open captured payments','/admin/finance/payments',{'basis':'capture','environment':'live','from':None,'to':None}),
            ('Open successful refunds','/admin/finance/refunds',{'dashboard':'success','environment':'live'}),
            ('Open refunds pending','/admin/finance/refunds',{'dashboard':'pending','environment':'live'}),
            ('Open properties awaiting review','/admin/properties',{'submitted':'1','status':'pending_review'}),
        ]:
            visit(page,'/admin?period=7d&environment=live')
            page.get_by_role('link',name=label,exact=True).click()
            page.wait_for_url(lambda url: urlparse(url).path == path)
            page.wait_for_load_state('networkidle')
            parsed=urlparse(page.url); assert parsed.path==path
            query=parse_qs(parsed.query)
            for key,value in required.items(): assert key in query and (value is None or query[key]==[value]), (key,query)
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            expect(page.get_by_role('heading',level=1)).to_be_visible()
            assert 'could not' not in page.locator('main').inner_text().lower()
            if label == 'Open booked rent': expect(page.get_by_role('columnheader',name='Rent (INR)',exact=True)).to_be_visible()
            if label == "Open today's visits":
                expect(page.get_by_text('No payment',exact=True)).to_have_count(0)
                expect(page.get_by_role('region',name='Booking records table')).to_contain_text('succeeded')
            if label == 'Open captured payments':
                page.get_by_role('button',name='Filter',exact=True).click(); page.wait_for_load_state('networkidle')
                assert parse_qs(urlparse(page.url).query)['basis']==['capture']
            passed(label+' matching drill-down')
        visit(page,'/admin?period=7d&environment=live')
        throughput=page.get_by_role('heading',name='Review throughput',exact=True).locator('..')
        throughput.get_by_role('link',name='Open matching records',exact=True).click();page.wait_for_url('**/admin/applications/history?**');page.wait_for_load_state('networkidle')
        expect(page.get_by_role('heading',name='Application decision history',exact=True)).to_be_visible()
        expect(page.get_by_role('region',name='Application decision history',exact=True).locator('tbody tr')).to_have_count(1)
        passed('Review throughput opens matching decision events')
        audit(page,'decision-history')

        visit(page,'/admin?period=today&environment=simulated')
        expect(page.get_by_text('Unavailable',exact=True)).to_be_visible()
        expect(page.get_by_text('No provider capture evidence in this scope.',exact=True)).to_be_visible()
        expect(page.get_by_role('region',name="Today's visits",exact=True)).to_contain_text('No visits scheduled')
        passed('Simulated captures unavailable and zero visits remain distinct')
        visit(page,'/admin?period=7d&environment=test')
        page.get_by_role('button',name='Refresh',exact=True).click();page.wait_for_load_state('networkidle')
        assert parse_qs(urlparse(page.url).query)=={'period':['7d'],'environment':['test']}
        expect(page.get_by_label(re.compile('^Environment'))).to_have_value('test')
        passed('Refresh preserves selected period and environment')
        page.get_by_label(re.compile('^Environment')).select_option('live')
        page.get_by_role('button',name='Apply',exact=True).click();page.wait_for_url('**environment=live**');page.wait_for_load_state('networkidle')
        assert parse_qs(urlparse(page.url).query)['environment']==['live']
        passed('Native environment selector applies URL filters')
        visit(page,'/admin?status=approved&page=2')
        assert urlparse(page.url).path=='/admin/applications'
        passed('Legacy application bookmarks still redirect')

        for role, expected in [('restricted',['bookings']),('finance',['finance']),('applications',['applications']),('customerReader',[]),('empty',[])]:
            c=browser.new_context(viewport={'width':360,'height':900})
            c.add_cookies([{'name':'rentra_admin','value':fixture['tokens'][role],'url':web}])
            restricted=c.new_page(); visit(restricted,'/admin')
            response=c.request.get(api+'/admin/dashboard',headers={'Cookie':'rentra_admin='+fixture['tokens'][role]})
            assert response.status==200
            assert sorted(response.json()['data']['modules'])==expected
            if not expected: expect(restricted.get_by_role('heading',name='No dashboard modules assigned',exact=True)).to_be_visible()
            if role=='finance': expect(restricted.get_by_role('heading',name='Bookings created',exact=True)).to_have_count(0)
            if role=='restricted': expect(restricted.get_by_role('heading',name='Captured payments',exact=True)).to_have_count(0)
            audit(restricted,role+'-360')
            passed(role+' authorized home and omitted modules')
            c.close()
        assert context.request.get(api+'/admin/dashboard',headers={'Cookie':''}).status==401
        assert context.request.get(api+'/admin/dashboard?period=1y',headers={'Cookie':'rentra_admin='+fixture['tokens']['full']}).status==400
        assert context.request.get(api+'/admin/dashboard?environment=all',headers={'Cookie':'rentra_admin='+fixture['tokens']['full']}).status==400
        assert context.request.get(api+'/admin/applications/history?from=2026-02-30&to=2026-10-05',headers={'Cookie':'rentra_admin='+fixture['tokens']['full']}).status==400
        assert context.request.get(api+'/admin/applications/history?from=2026-10-01&to=2026-10-05',headers={'Cookie':'rentra_admin='+fixture['tokens']['finance']}).status==403
        passed('API authentication, invalid filters and decision-history capability')

        if os.environ.get('ADMIN_DASHBOARD_PSQL'):
            dburl=fixture['databaseUrl']; parsed=urlparse(dburl)
            assert parsed.hostname=='127.0.0.1' and parsed.path.startswith('/rentra_test_')
            def sql(command):
                subprocess.run([os.environ['ADMIN_DASHBOARD_PSQL'],dburl,'-v','ON_ERROR_STOP=1','-c',command],check=True,capture_output=True)
            sql('ALTER TABLE service_health RENAME TO fixture_hidden_health')
            try:
                visit(page,'/admin?period=7d&environment=live')
                expect(page.get_by_role('heading',name='Service health unavailable',exact=True)).to_be_visible()
                expect(page.get_by_role('heading',name='Bookings created',exact=True)).to_have_count(2)
                expect(page.get_by_role('button',name='Try again',exact=True)).to_be_visible()
                page.screenshot(path=str(output/'partial-failure-1280.png'),full_page=True)
                audit(page,'partial-failure')
                passed('Failed module shows retry, retains authorized booking panels')
            finally: sql('ALTER TABLE fixture_hidden_health RENAME TO service_health')
            page.get_by_role('button',name='Try again',exact=True).click(); page.wait_for_load_state('networkidle')
            expect(page.get_by_role('heading',name='Service health',exact=True)).to_be_visible()
            passed('Panel retry recovers without dropping filters')
        assert not results['pageErrors'],results['pageErrors']
    finally:
        (output/'browser-checks.json').write_text(json.dumps(results,indent=2)+'\n',encoding='utf-8')
        browser.close()
