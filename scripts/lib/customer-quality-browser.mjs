import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync,closeSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
export async function verifyQualityBrowser({databaseUrl,actor,order,createQuote}) {
 const driver=process.env.CUSTOMER_BROWSER_DRIVER;if(!driver)throw new Error('Set CUSTOMER_BROWSER_DRIVER to Playwright-core');
 const {chromium}=await import(pathToFileURL(driver).href), origin='http://localhost:3204', secret='part18-only-fixture-session-secret-long-enough';
 const env={...process.env,NODE_ENV:'production',RENTRA_BROWSER_FIXTURE:'1',RENTRA_BROWSER_FIXTURE_ID:'quality-'+randomUUID().slice(0,8),DATABASE_URL:databaseUrl,NEXT_PUBLIC_SITE_URL:origin,SESSION_SECRET:secret,CUSTOMER_NOTIFICATION_DELIVERY:'disabled',CUSTOMER_OTP_DELIVERY:'disabled',DEV_OTP_BYPASS:'false'};
 const log=openSync(join(tmpdir(),'rentra-part18-browser.log'),'w');
 const build=spawn(process.execPath,['node_modules/next/dist/bin/next','build','--webpack'],{env,stdio:['ignore',log,log]});
 const [code]=await once(build,'exit');if(code!==0){closeSync(log);throw new Error('Quality production fixture build failed');}
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port','3204'],{env,stdio:['ignore',log,log]});closeSync(log);
 let browser;const report={recordedAt:new Date().toISOString(),mode:'Production build, local Chromium, remote disposable database; lab observations, not field Core Web Vitals.',routes:[],failures:[],axe:[]};
 const expect=(condition,label)=>{if(!condition)report.failures.push(label);};
 try {
  for(let i=0;i<120;i++){if(server.exitCode!==null)throw new Error('Fixture server exited');try{if((await fetch(origin+'/help')).ok)break;}catch{}await delay(500);}
  browser=await chromium.launch({headless:true,...(process.env.CUSTOMER_BROWSER_EXECUTABLE?{executablePath:process.env.CUSTOMER_BROWSER_EXECUTABLE}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(90000);
  page.on('pageerror',e=>report.failures.push('Runtime: '+e.message));
  await context.addInitScript(()=>{
   window.__quality={lcp:0,cls:0,shifts:[]};
   new PerformanceObserver(l=>{for(const e of l.getEntries())window.__quality.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
   new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput){window.__quality.cls+=e.value;window.__quality.shifts.push({value:e.value,nodes:e.sources?.map(s=>s.node?.tagName+' '+s.node?.className)});}}).observe({type:'layout-shift',buffered:true});
  });
  const listing='/listing/lifecycle-life0015';
  async function visit(path,width=390,{canonical,index=true,audit=true,privatePage=false}={}) {
   await page.setViewportSize({width,height:900});const response=await page.goto(origin+path);await page.locator('main h1').first().waitFor();if(path.startsWith('/search'))await page.locator('#discovery-filters').waitFor();await page.waitForTimeout(750);
   const data=await page.evaluate(()=>({title:document.title,canon:document.querySelector('link[rel="canonical"]')?.href,
    robots:[...document.querySelectorAll('meta[name="robots"]')].map(m=>m.content).join(','),og:document.querySelector('meta[property="og:url"]')?.content,
    twitter:document.querySelector('meta[name="twitter:title"]')?.content,overflow:document.documentElement.scrollWidth>innerWidth,
    h1:document.querySelectorAll('main h1').length,injected:!!window.RENTRA_INJECTION,html:document.documentElement.outerHTML,
    metrics:{...window.__quality,ttfbMs:performance.getEntriesByType('navigation')[0]?.responseStart,domMs:performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd,resources:performance.getEntriesByType('resource').length,transferBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.transferSize,0)},
    maps:performance.getEntriesByType('resource').filter(r=>/maps\.google|maps\.googleapis|mapbox|leaflet/.test(r.name)).length,
    images:[...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>({alt:i.getAttribute('alt'),sizes:i.sizes,w:i.width,h:i.height,loading:i.loading}))}));
   expect(new URL(page.url()).pathname===new URL(origin+path).pathname,`${path} unexpected redirect to ${new URL(page.url()).pathname}`);expect(response.status()===200,`${path} status ${response.status()}`);expect(!data.overflow,`${width}px overflow ${path}`);expect(data.h1===1,`${path} needs one main h1`);expect(!data.injected,'JSON-LD script injection');
   if(canonical){expect(data.canon===origin+canonical,`${path} canonical ${data.canon}`);expect(new URL(data.og).href===new URL(origin+canonical).href,`${path} OG URL ${data.og}`);expect(!!data.twitter,`${path} Twitter title missing`);}
   expect(index?!data.robots.includes('noindex'):data.robots.includes('noindex'),`${path} robots ${data.robots}`);
   if(!privatePage)for(const secret of ['PRIVATE ARRIVAL ADDRESS','9000015001','9000015003'])expect(!data.html.includes(secret),`${path} public private serialization ${secret}`);
   expect(data.maps===0,`${path} loads a map before request`);expect(data.images.every(i=>i.alt!==null&&i.w>0&&i.h>0),`${path} image alternatives/dimensions`);
   if(audit){await page.addScriptTag({path:resolve('node_modules/axe-core/axe.min.js')});const result=await page.evaluate(()=>window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
    report.axeVersion=result.testEngine.version;for(const v of result.violations)report.axe.push({path,width,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))});}
   report.routes.push({path,width,title:data.title,canonical:data.canon,robots:data.robots,metrics:data.metrics});writeFileSync(join(tmpdir(),'rentra-part18-quality.json'),JSON.stringify(report,null,2));console.log('CRAWL',width,path);
  }
  for(const path of ['/','/help','/policies/terms/2026-09-20','/policies/cancellation/2026-09-20','/policies/privacy/2026-09-20','/lifecycle/farmhouse',listing])await visit(path,390,{canonical:path});
  for(const path of ['/login','/search','/search?guests=invalid','/saved','/help?q=refund','/lifecycle/farmhouse?guests=2'])await visit(path,390,{index:false});
  for(const width of [360,768,1280])for(const path of ['/search',listing,'/help'])await visit(path,width,{index:path!=='/search',audit:width===360});
  const selectedDay=new Date(Date.now()+20*86400000).toISOString().slice(0,10);
  await visit(listing+'?guests=2&slot=day&dates='+selectedDay,390,{canonical:listing});
  expect(await page.locator(`[data-visit-date="${selectedDay}"]`).getAttribute('aria-pressed')==='true','URL date selection survives hydration');
  const ld=await page.locator('script[type="application/ld+json"]').first().textContent();const graph=JSON.parse(ld)['@graph'];
  expect(!ld.includes('</script>'),'JSON-LD must escape closing script text');expect(!JSON.stringify(graph).includes('LimitedAvailability'),'Unknown inventory scarcity');expect(!JSON.stringify(graph).includes('VacationRental'),'Conditional schema claim');
  const old=await context.request.get(origin+'/listing/old-name-life0015',{maxRedirects:0});expect(old.status()===308,'Renamed listing permanent redirect');
  const selectedOld=await context.request.get(origin+'/listing/old-name-life0015?dates=2026-10-11&slot=day&guests=2',{maxRedirects:0});const destination=new URL(selectedOld.headers().location || '/',origin);expect(selectedOld.status()===308&&destination.pathname===listing&&destination.searchParams.get('guests')==='2'&&destination.searchParams.get('slot')==='day','Renamed URL preserves selection');
  for(const path of ['/listing/paused-qual0004','/listing/deleted-gone0018']){const r=await context.request.get(origin+path);expect(r.status()===404,path+' unavailable status');}
  const sitemap=await(await context.request.get(origin+'/sitemap.xml')).text();expect(sitemap.includes(origin+listing),'Sitemap listing');expect(sitemap.includes('/lifecycle/farmhouse'),'Sitemap useful discovery');
  for(const path of ['/search','/support','/account','/bookings','/listing/paused-qual0004'])expect(!sitemap.includes('<loc>'+origin+path),'Private/paused sitemap '+path);
  const robots=await(await context.request.get(origin+'/robots.txt')).text();expect(!robots.includes('Disallow: /search'),'Search noindex must remain crawlable');
  await page.goto(origin+'/help');await page.keyboard.press('Tab');expect(await page.getByRole('link',{name:'Skip to main content'}).evaluate(e=>e===document.activeElement),'Skip link first focus');await page.keyboard.press('Enter');expect(await page.locator('main').evaluate(e=>e===document.activeElement),'Skip link target focus');
  await page.goto(origin+listing);await page.locator('summary').filter({hasText:'Share'}).click();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Open share menu fits viewport');await page.locator('summary').filter({hasText:'Share'}).click();await page.getByRole('button',{name:'Open photos of Current lifecycle property',exact:true}).click();await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Shift+Tab');expect(await page.getByRole('dialog').evaluate(e=>e.contains(document.activeElement)),'Gallery focus trap');await page.keyboard.press('Escape');expect(await page.getByRole('button',{name:'Open photos of Current lifecycle property',exact:true}).evaluate(e=>e===document.activeElement),'Gallery focus restored');await page.screenshot({path:join(tmpdir(),'rentra-part18-listing.png'),fullPage:true});
  const token=await new SignJWT(actor.session).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
  await context.addCookies([{name:'rentra_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
  const quote=await createQuote();
  for(const width of [360,390])for(const path of ['/checkout/review/'+quote.id,'/account','/support/new','/bookings/'+order.id,'/bookings/'+order.id+'/reviews'])await visit(path,width,{index:false,privatePage:true});
  await page.goto(origin+'/support/new');await page.getByRole('button',{name:'Send support request'}).click();expect(await page.getByLabel('Subject',{exact:true}).evaluate(e=>e===document.activeElement),'Required error focuses subject');
  await page.getByLabel('Subject',{exact:true}).fill('Quality audit request');await page.getByLabel('How can we help?',{exact:true}).fill('Please explain the support process for my planned visit.');await page.getByRole('button',{name:'Send support request'}).click();await page.waitForURL(/\/support\/[0-9a-f-]+$/);await page.locator('main h1').waitFor();
  await visit(new URL(page.url()).pathname,390,{index:false,privatePage:true});
  await page.screenshot({path:join(tmpdir(),'rentra-part18-support.png'),fullPage:true});
  await context.clearCookies();const denied=await context.request.get(origin+'/bookings/'+order.id+'/calendar');expect(denied.status()===401,'Anonymous private calendar');
 } finally {
  writeFileSync(join(tmpdir(),'rentra-part18-quality.json'),JSON.stringify(report,null,2));
  await browser?.close();if(server.exitCode===null){server.kill('SIGTERM');await Promise.race([once(server,'exit'),delay(10000)]);if(server.exitCode===null)server.kill('SIGKILL');}
 }
 assert.deepEqual(report.failures,[]);assert.deepEqual(report.axe,[],'Accessibility violations; see rentra-part18-quality.json');
 console.log(`PASS ${report.routes.length} rendered route/viewport checks, WCAG axe checks, keyboard, metadata/privacy and lab observations.`);
}
