"""Phase 11 search gate: disposable localhost, no providers or production data."""
import json, os, re
from pathlib import Path
from urllib.parse import urlparse, urlencode, parse_qs
from playwright.sync_api import sync_playwright, expect

expect.set_options(timeout=15000)
web=os.environ.get('GATE_WEB_ORIGIN','http://127.0.0.1:3171')
api=os.environ.get('GATE_API_ORIGIN','http://127.0.0.1:4171/api/v1')
assert all(urlparse(x).hostname in ['localhost','127.0.0.1'] for x in [web,api])
f=json.loads(Path(os.environ['ADMIN_BASELINE_FIXTURE']).read_text())
assert urlparse(f['databaseUrl']).path.startswith('/rentra_test_')
root=Path(__file__).resolve().parents[2]
out=root/'docs/evidence/admin-phase11';out.mkdir(parents=True,exist_ok=True)
axe=(root/'node_modules/axe-core/axe.min.js').read_text()
r={'scope':'Disposable localhost; no providers or deployment','checks':[],'accessibility':[],'pageErrors':[]}
types=[('clients','Owners','/admin/clients',{'status':'all'}),('customers','Customers','/admin/customers',{'status':'all'}),('applications','Applications','/admin/applications',{'status':'all'}),('properties','Properties','/admin/properties',{'status':'all'}),('bookings','Bookings','/admin/records',{'tab':'all'}),('cases','Booking cases','/admin/records/cases',{'state':'all'})]

def passed(name):r['checks'].append(name);print('PASS',name,flush=True)
def visit(page,path):
 page.goto(web+path);expect(page.get_by_role('heading',level=1).first).to_be_visible();page.evaluate('document.fonts.ready')
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),path
 assert 'WITHHELD-PRIVATE' not in page.locator('main').inner_text()
def audit(page,name):
 page.add_script_tag(content=axe)
 v=page.evaluate("async()=> (await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))")
 r['accessibility'].append({'screen':name,'violations':v});assert not v,json.dumps(v)

with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True);c=b.new_context(viewport={'width':1280,'height':900},reduced_motion='reduce',permissions=['clipboard-read','clipboard-write']);page=c.new_page()
 page.on('pageerror',lambda e:r['pageErrors'].append(str(e)))
 def role(name):
  c.clear_cookies();c.add_cookies([{'name':'rentra_admin','value':f['tokens'][name],'url':web}])
 def request(key,q,page_number=1):
  _,_,path,filters=next(t for t in types if t[0]==key)
  return c.request.get(api+path+'?'+urlencode({**filters,'q':q,'page':page_number}))
 try:
  role('full')
  for width in [1280,768,360]:
   page.set_viewport_size({'width':width,'height':900})
   visit(page,'/admin/search?q=Search%20fixture')
   expect(page.get_by_role('combobox',name='Record type',exact=True).locator('option')).to_have_count(7)
   for key,label,_,_ in types:
    region=page.get_by_role('region',name=label+' search results',exact=True)
    expect(region.locator('tbody tr')).to_have_count(20)
    assert not region.locator('th:not([scope="col"])').count()
    region.focus();page.keyboard.press('ArrowRight')
    if width==360:assert region.evaluate('el=>el.scrollWidth>el.clientWidth')
   page.evaluate('window.scrollTo(0,0)');audit(page,'all-types-'+str(width))
   page.screenshot(path=str(out/('search-'+str(width)+'.png')))
   visit(page,'/admin/search?q=Search%20fixture&type=properties&propertiesPage=2')
   region=page.get_by_role('region',name='Properties search results',exact=True)
   expect(region.locator('tbody tr')).to_have_count(3)
   audit(page,'property-page2-'+str(width));page.screenshot(path=str(out/('property-page2-'+str(width)+'.png')),full_page=True)
   passed('Six semantic search queues and paginated property filter at '+str(width)+'px')
  page.set_viewport_size({'width':1280,'height':900})
  for key,_,_,_ in types:
   first=request(key,'Search fixture').json()['data'];second=request(key,'Search fixture',2).json()['data']
   assert first['total']==second['total']==23,key
   assert len(first['items'])==20 and len(second['items'])==3,key
   assert not set(x['id'] for x in first['items']) & set(x['id'] for x in second['items']),key
   for query in ['%','_','WITHHELD-PRIVATE']:
    response=request(key,query);assert response.status==200,(key,response.status)
    assert response.json()['data']['total']==0,(key,query)
  passed('All six APIs use literal wildcard matching, omit private bodies and paginate 23 records without overlap')
  for key,query in [('properties',f['search']['property']['public_code']),('bookings',f['search']['order']['reference']),('bookings',f['search']['visit']),('cases',f['search']['case']['reference'])]:
   response=request(key,query);assert response.status==200
   assert response.json()['data']['total']==1,(key,query)
  passed('Exact property, booking, visit and case references find the matching record')
  visit(page,'/admin/search?q=Search%20fixture&clientsPage=2')
  expect(page.get_by_role('region',name='Owners search results',exact=True).locator('tbody tr')).to_have_count(3)
  page.get_by_role('navigation',name='Properties search pages',exact=True).get_by_role('link',name='Next page',exact=True).click()
  expect(page).to_have_url(re.compile('.*clientsPage=2.*propertiesPage=2'))
  expect(page.get_by_role('region',name='Owners search results',exact=True).locator('tbody tr')).to_have_count(3)
  expect(page.get_by_role('region',name='Properties search results',exact=True).locator('tbody tr')).to_have_count(3)
  page.reload();expect(page.get_by_role('region',name='Bookings search results',exact=True).locator('tbody tr')).to_have_count(20)
  passed('Independent pagination preserves other sections and survives refresh')
  for key,label,_,_ in types:
   path='/admin/search?'+urlencode({'q':'Search fixture','type':key,key+'Page':2})
   visit(page,path)
   region=page.get_by_role('region',name=label+' search results',exact=True)
   chip=region.get_by_role('button',name=re.compile('^Copy')).first
   value=chip.get_attribute('aria-label').split(': ',1)[1];chip.click()
   expect(chip).to_contain_text(label+' reference copied')
   assert page.evaluate('navigator.clipboard.readText()')==value
   if key=='cases':
    page.evaluate("() => { navigator.clipboard.writeText=async()=>{throw new Error('Fixture denied')}; }");chip.click()
    expect(region.get_by_role('alert')).to_have_text('Could not copy. Select the value and copy it manually.')
   link=region.get_by_role('link',name=re.compile('^Open')).first
   href=link.get_attribute('href');context=parse_qs(urlparse(href).query)['from'][0]
   assert context==path,(key,context,path)
   directory=page.get_by_role('link',name='Open '+label.lower()+' directory',exact=True).get_attribute('href')
   assert parse_qs(urlparse(directory).query)['q']==['Search fixture']
   assert parse_qs(urlparse(directory).query)['page']==['2']
   link.click();expect(page.get_by_role('heading',level=1).first).to_be_visible()
   back=page.get_by_role('link',name='Search results',exact=True).first;expect(back).to_have_attribute('href',path)
   tabs=page.get_by_role('navigation',name='Record sections').get_by_role('link')
   if tabs.count()>1:
    tabs.nth(1).click();expect(page.get_by_role('link',name='Search results',exact=True).first).to_have_attribute('href',path)
   page.reload();page.get_by_role('link',name='Search results',exact=True).first.click();expect(page).to_have_url(web+path)
  passed('Six record types copy references, open full pages and retain search type/page through tabs and reload')
  visit(page,'/admin/search?q=Search%20fixture&type=properties&propertiesPage=2&clientsPage=2')
  page.get_by_label('Search term',exact=True).fill('srch001');page.get_by_role('button',name='Search records',exact=True).click()
  expect(page).to_have_url(re.compile('.*/admin/search\\?q=srch001&type=properties$'))
  expect(page.get_by_role('region',name='Properties search results',exact=True).locator('tbody tr')).to_have_count(1)
  passed('A changed search term resets all independent pages')
  for name,keys in [('searchOwner',['clients']),('searchCustomer',['customers']),('searchApplication',['applications']),('searchProperty',['properties']),('searchRecords',['bookings','cases']),('searchSupport',[]),('searchEmpty',[])]:
   role(name);visit(page,'/admin/search?q=Search%20fixture')
   assert page.locator('main table').count()==len(keys),name
   assert page.locator('#admin-search').count()==(1 if keys else 0),name
   if keys:assert page.get_by_role('combobox',name='Record type',exact=True).locator('option').count()==len(keys)+1
   for key,_,_,_ in types:
    response=request(key,'Search fixture');assert response.status==(200 if key in keys else 403),(name,key,response.status)
   audit(page,'role-'+name)
  passed('Five eligible restricted roles retain search; support/empty roles have no affordance or cross-role API access')
  role('searchProperty');visit(page,'/admin/search?q=Search%20fixture&type=clients')
  expect(page.locator('main table')).to_have_count(0)
  expect(page.get_by_role('heading',name='No permitted search type',exact=True)).to_be_visible()
  passed('Direct unauthorized type URLs cannot display another directory')
  role('full');control=api.removesuffix('/api/v1')+'/fixture/search-failure/'
  assert c.request.post(control+'on').status==204
  try:
   visit(page,'/admin/search?q=Search%20fixture');expect(page.get_by_text('This directory could not load.',exact=False)).to_be_visible()
   expect(page.get_by_role('region',name='Bookings search results',exact=True).locator('tbody tr')).to_have_count(20)
   audit(page,'partial-failure');page.get_by_role('heading',name='Properties',exact=True).locator('xpath=ancestor::section[1]').screenshot(path=str(out/'partial-failure.png'))
  finally:assert c.request.post(control+'off').status==204
  page.get_by_role('button',name='Retry search',exact=True).click();expect(page.get_by_role('region',name='Properties search results',exact=True)).to_be_visible()
  passed('A real directory 503 preserves permitted results and retry recovers it')
  visit(page,'/admin?status=all&q=Search%20fixture&page=2');expect(page).to_have_url(re.compile('.*/admin/applications\\?'))
  assert parse_qs(urlparse(page.url).query)['q']==['Search fixture']
  passed('Legacy root application search bookmarks retain the matching queue and page')
  assert not r['pageErrors'],r['pageErrors']
 finally:
  (out/'browser-results.json').write_text(json.dumps(r,indent=2)+'\n')
  b.close()
