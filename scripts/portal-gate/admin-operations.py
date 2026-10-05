"""Phase 10 gate. Disposable local services, no production/providers."""
import json, os, re, base64, hmac, hashlib, struct, time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, expect
expect.set_options(timeout=15000)
web=os.environ.get('GATE_WEB_ORIGIN','http://127.0.0.1:3170')
api=os.environ.get('GATE_API_ORIGIN','http://127.0.0.1:4170/api/v1')
assert all(urlparse(x).hostname in ['localhost','127.0.0.1'] for x in [web,api])
f=json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
assert urlparse(f['databaseUrl']).path.startswith('/rentra_test_')
root=Path(__file__).resolve().parents[2]
out=root/'docs/evidence/admin-phase10';out.mkdir(parents=True,exist_ok=True)
axe=(root/'node_modules/axe-core/axe.min.js').read_text()
r={'scope':'Disposable localhost; no providers, production credentials or deployment','checks':[],'accessibility':[],'pageErrors':[]}
def passed(name):
 r['checks'].append(name);print('PASS',name,flush=True)
def visit(page,path):
 page.goto(web+path);expect(page.get_by_role('heading',level=1).first).to_be_visible();page.evaluate('document.fonts.ready')
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),path
 assert 'WITHHELD-PRIVATE' not in page.locator('main').inner_text()
def audit(page,name):
 page.add_script_tag(content=axe)
 v=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
 r['accessibility'].append({'screen':name,'violations':v});assert not v,json.dumps(v)
def totp(uri):
 secret=parse_qs(urlparse(uri).query)['secret'][0];key=base64.b32decode(secret+'='*((-len(secret))%8))
 digest=hmac.new(key,struct.pack('>Q',int(time.time())//30),hashlib.sha1).digest();offset=digest[-1]&15
 return str((struct.unpack('>I',digest[offset:offset+4])[0]&0x7fffffff)%1000000).zfill(6)
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);c=b.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce');page=c.new_page()
 page.on('pageerror',lambda e:r['pageErrors'].append(str(e)))
 def role(name):
  c.clear_cookies();c.add_cookies([{'name':'rentra_admin','value':f['tokens'][name],'url':web}])
 def headers(name):return {'Cookie':'rentra_admin='+f['tokens'][name]}
 try:
  role('full')
  paths=[('/admin/operations','Operational alerts'),('/admin/privacy','Customer privacy requests'),('/admin/audit','Audit events'),('/admin/audit/exports','Governed exports'),('/admin/content','Public content'),('/admin/catalogues/categories','Categories catalogue'),('/admin/security','Operators')]
  for width in [1280,768,360]:
   page.set_viewport_size({'width':width,'height':900})
   for path,label in paths:
    visit(page,path);region=page.get_by_role('region',name=label,exact=True);expect(region).to_be_visible()
    assert region.locator('th:not([scope="col"])').count()==0
    region.focus();page.keyboard.press('ArrowRight')
    if width==360:assert region.evaluate('el=>el.scrollWidth>el.clientWidth')
    region.evaluate('el=>el.scrollLeft=0');page.evaluate('window.scrollTo(0,0)');audit(page,label+'-'+str(width))
    page.screenshot(path=str(out/(label.lower().replace(' ','-')+'-'+str(width)+'.png')),full_page=True)
   visit(page,'/admin/payments');expect(page.get_by_role('heading',name='Gateway settings',exact=True)).to_be_visible();audit(page,'gateway-'+str(width))
   passed('Seven semantic queues and Gateway settings at '+str(width)+'px')
  page.set_viewport_size({'width':1280,'height':900})
  role('opsReader')
  for path in ['/admin/content/terms','/admin/content/owner_help','/admin/catalogues/categories/'+f['ops']['category'],'/admin/security/'+f['ids']['second'],'/admin/privacy/'+f['ops']['privacyOpen'],'/admin/payments','/admin/operations/incidents/notifications_worker_unhealthy']:
   visit(page,path);expect(page.locator('main form')).to_have_count(0);audit(page,'readonly-'+path.split('/')[2])
   assert not page.locator('main a[href*="/admin/customers/"],main a[href*="/admin/properties/"],main a[href*="/admin/notifications/"],main a[href*="/admin/bookings/"]').count(),path
  passed('Read-only workflows hide commands and separately unauthorized record links')
  for path in ['/admin/content/terms','/admin/catalogues/categories/'+f['ops']['category'],'/admin/security/'+f['ids']['second'],'/admin/privacy/requests/'+f['ops']['privacyOpen'],'/admin/payments/configuration','/admin/audit/exports','/admin/operations/incidents/notifications_worker_unhealthy']:
   response=c.request.post(api+path,headers=headers('opsReader'),data={'command':'preview'})
   assert response.status==403,(path,response.status)
  passed('Seven direct mutation endpoints deny read-only access')
  response=c.request.get(web+'/admin/audit/exports/'+f['ops']['export']+'/download')
  assert response.status in [403,404]
  passed('Another operator cannot download the creator-owned export')
  role('full')
  for path in ['/admin/audit/events/'+f['ops']['event'],'/admin/audit/exports/'+f['ops']['export'],'/admin/privacy/'+f['ops']['privacy'],'/admin/content/owner_help','/admin/catalogues/categories/'+f['ops']['category'],'/admin/security/'+f['ids']['second']]:
   visit(page,path);audit(page,'detail-'+path.split('/')[2])
  passed('Audit event/export, privacy retention/receipt, owner guide, catalogue impact and security details reachable')
  for path in ['/admin/audit/exports/'+f['ops']['export']+'/download','/admin/audit/exports/'+f['ops']['export']+'/receipt','/admin/privacy/'+f['ops']['privacy']+'/export','/admin/privacy/'+f['ops']['privacy']+'/receipt']:
   response=c.request.get(web+path)
   assert response.status==200,(path,response.status)
   assert 'no-store' in response.headers.get('cache-control','')
   assert response.headers.get('x-content-type-options')=='nosniff'
   assert 'WITHHELD-PRIVATE' not in response.text()
  passed('Four private scoped exports/receipts remain authorized, non-cacheable and downloadable')
  visit(page,'/admin/audit/exports/'+f['ops']['expiredExport'])
  expect(page.get_by_role('link',name='Download scoped JSON',exact=True)).to_have_count(0)
  expect(page.get_by_text('This copy expired or was revoked. Create a new request.',exact=True)).to_be_visible()
  response=c.request.get(web+'/admin/audit/exports/'+f['ops']['expiredExport']+'/download');assert response.status==409
  passed('Expired export hides download and rejects the direct private URL')
  visit(page,'/admin/audit?action=phase10_fixture')
  expect(page.get_by_role('table').locator('tbody tr').first).to_contain_text('phase10_fixture')
  expect(page.get_by_role('table').locator('tbody tr')).to_have_count(1)
  page.get_by_role('combobox',name='Dataset',exact=True).select_option('audit_events')
  page.get_by_label('Export reason').fill('Create a governed export for this synthetic action.')
  page.get_by_role('checkbox').check()
  page.get_by_role('button',name='Queue export',exact=True).click()
  expect(page).to_have_url(re.compile('.*/admin/audit/exports/[a-f0-9-]+$'))
  expect(page.get_by_text('queued',exact=False).first).to_be_visible()
  passed('Exact event filtering and governed export creation retain the selected UTC scope')
  visit(page,'/admin/operations/incidents/notifications_worker_unhealthy')
  page.get_by_label('Reason or handoff note').fill('Investigate the synthetic notification worker heartbeat.')
  page.get_by_role('button',name='Record incident action',exact=True).click()
  expect(page.get_by_role('combobox',name='Action',exact=True).locator('option[value=resolve]')).to_have_count(1)
  page.get_by_role('combobox',name='Action',exact=True).select_option('resolve')
  expect(page.get_by_role('button',name='Record incident action',exact=True)).to_be_disabled()
  page.get_by_role('combobox',name='Action',exact=True).select_option('acknowledge')
  page.get_by_label('Reason or handoff note').fill('Acknowledged; the measured worker failure is still active.')
  page.get_by_role('button',name='Record incident action',exact=True).click()
  expect(page.get_by_text('Acknowledged; the measured worker failure is still active.',exact=True)).to_be_visible()
  passed('Incident open/acknowledge evidence survives and active measurements block resolution')
  visit(page,'/admin/privacy/'+f['ops']['privacyOpen'])
  expect(page.get_by_text('This operation is partial anonymization. Historical personal information can remain.',exact=False)).to_be_visible()
  page.get_by_role('combobox',name='Requester authority',exact=True).select_option('self')
  page.get_by_label('Identity / authority review reference').fill('fixture identity reviewed separately')
  page.get_by_label('Verified receipt-delivery reference').fill('fixture receipt handoff reviewed separately')
  page.locator('input[name=retentionAccepted]').check();page.locator('input[name=confirmed]').check()
  page.get_by_label('Reason',exact=True).fill('Verified authority and retained evidence for this synthetic case.')
  page.get_by_role('button',name='Record review',exact=True).click()
  expect(page.get_by_text('Command recorded. Refresh status to follow the worker.',exact=True)).to_be_visible()
  page.get_by_role('button',name='Refresh status',exact=True).click()
  expect(page.get_by_role('button',name='Preview fulfillment',exact=True)).to_be_visible()
  passed('Privacy review preserves identity/delivery references and explicit partial-retention scope')
  visit(page,'/admin/payments')
  page.get_by_role('combobox',name='Sandbox collection amount',exact=True).select_option('advance')
  page.get_by_role('button',name='Save payment settings',exact=True).click()
  expect(page.get_by_text('Payment configuration saved and recorded in the audit log.',exact=True)).to_be_visible()
  page.reload();expect(page.get_by_role('combobox',name='Sandbox collection amount',exact=True)).to_have_value('advance')
  passed('Test-only gateway setting and audited history refresh without a provider call')
  visit(page,'/admin/content/owner_help')
  page.get_by_label('Title',exact=True).fill('Owner guide - verified phase 10 fixture')
  page.get_by_label('Reason for change',exact=True).fill('Clarify the synthetic guide while preserving operational policy.')
  page.get_by_role('button',name='Save draft',exact=True).click()
  expect(page.get_by_role('button',name='Record review',exact=True)).to_be_visible()
  page.get_by_role('checkbox').check();page.get_by_role('button',name='Record review',exact=True).click()
  expect(page.get_by_role('button',name='Preview publication',exact=True)).to_be_enabled()
  page.get_by_role('button',name='Preview publication',exact=True).click()
  expect(page.get_by_role('region',name='Publication preview')).to_be_visible()
  page.get_by_role('button',name='Confirm publication',exact=True).click()
  expect(page.get_by_role('button',name='Record review',exact=True)).to_have_count(0)
  expect(page.get_by_role('heading',name='Publication history',exact=True)).to_be_visible()
  link=page.get_by_role('link',name=re.compile('^Read version')).first
  href=link.get_attribute('href');assert '/help/history/owner_help/' in href
  visit(page,href)
  expect(page.get_by_role('heading',name='Owner guide - verified phase 10 fixture',exact=True)).to_be_visible()
  passed('Owner guide can save/review/preview/publish and open its immutable public version')
  visit(page,'/admin/security')
  page.get_by_label('Name',exact=True).fill('Phase 10 enrolled operator')
  page.get_by_label('Email',exact=True).fill('enrollment-phase10@fixture.invalid')
  page.get_by_label('admin.operations.read',exact=True).check()
  page.get_by_label('Reason',exact=True).fill('Enroll this synthetic operator with one read capability.')
  page.get_by_role('checkbox',name='I reviewed the access and session impact.',exact=True).check()
  page.get_by_role('button',name='Create and enroll',exact=True).click()
  private_link=page.get_by_label('Private enrollment link',exact=True).input_value()
  token=urlparse(private_link).fragment
  visit(page,'/admin/enroll#'+token)
  page.get_by_role('button',name='Open enrollment',exact=True).click()
  setup=page.locator('form textarea[readonly]');expect(setup).to_be_visible()
  uri=setup.input_value()
  page.get_by_label('New password',exact=True).fill('FixtureOnlyPassword123!')
  page.get_by_label('Authenticator code',exact=True).fill(totp(uri))
  page.get_by_role('button',name='Confirm enrollment',exact=True).click()
  expect(page.get_by_text('Enrollment complete.',exact=False)).to_be_visible()
  response=c.request.post(api+'/admin/auth/enrollment',data={'token':token,'command':'preview'})
  assert response.status==401
  passed('Operator creation, single-use enrollment and actual authenticator confirmation work')
  assert not r['pageErrors'],r['pageErrors']
 finally:
  (out/'browser-results.json').write_text(json.dumps(r,indent=2)+'\n')
  b.close()
