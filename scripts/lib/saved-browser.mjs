import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync,closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';

export async function verifySavedBrowser({sql,databaseUrl,env,a,b,first,second,selection}) {
 const {chromium}=await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
 const origin='http://localhost:3197';
 const log=openSync(join(tmpdir(),'rentra-part07-browser-server.log'),'w');
 const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port','3197'],{env:{...process.env,...env,NODE_ENV:'development',RENTRA_BROWSER_FIXTURE:'1',DEV_OTP_BYPASS:'false',CUSTOMER_OTP_DELIVERY:'development',DATABASE_URL:databaseUrl,NEXT_PUBLIC_SITE_URL:origin},stdio:['ignore',log,log]});
 closeSync(log);let browser;
 const token=session=>new SignJWT(session).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.SESSION_SECRET));
 try {
  for(let i=0;i<120;i++){if(server.exitCode!==null)throw new Error('Fixture server exited');try{if((await fetch(origin+'/login')).ok)break;}catch{} await delay(500);}
  browser=await chromium.launch({headless:true,...(process.env.CUSTOMER_BROWSER_EXECUTABLE?{executablePath:process.env.CUSTOMER_BROWSER_EXECUTABLE}:{})});
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.setDefaultTimeout(60000);
  await page.goto(origin+'/listing/fixture-fix12345?'+new URLSearchParams({dates:selection.dates.join(','),slot:selection.slot,guests:String(selection.guests)}));
  // The listing now carries two save controls: the header heart and the price
  // box action the mobile bar links to. They share one state, so saving from
  // either must update both.
  await page.locator('#booking-save').getByRole('button',{name:'Save',exact:true}).click();
  await page.locator('#booking-save').getByRole('button',{name:'Saved',exact:true}).waitFor();
  await page.locator('#listing-actions').getByRole('button',{name:'Saved',exact:true}).waitFor();
  await page.goto(origin+'/saved');
  await page.getByRole('link',{name:'Saved Fixture',exact:true}).waitFor();
  assert.match(await page.getByRole('link',{name:'Saved Fixture',exact:true}).getAttribute('href'),/guests=6/);
  await page.reload();await page.getByRole('link',{name:'Saved Fixture',exact:true}).waitFor();
  assert.ok(await page.locator('meta[name="robots"]').getAttribute('content').then(v=>v.includes('noindex')));
  // Login to the existing fixture account through the real OTP form. Guests now
  // see two Log in entries — the header and this page's benefit-framed offer;
  // exercise the offer, which is the one the UX review asked for.
  await page.getByRole('paragraph').filter({hasText:'Your saved places stay in this browser.'})
    .getByRole('link',{name:'Log in',exact:true}).click();
  await page.getByLabel('Mobile number').fill('9876543210');await page.getByRole('button',{name:'Send code',exact:true}).click();
  await page.getByLabel('One-time code').fill('123456');await page.getByRole('button',{name:'Log in',exact:true}).click();
  await page.waitForURL('**/account');await page.goto(origin+'/saved');await page.getByRole('link',{name:'Saved Fixture',exact:true}).waitFor();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('rentra_guest_saved_v1')||'[]').length===0);
  const [count]=await sql`SELECT count(*)::int n FROM customer_favourite WHERE customer_id=${a.userId} AND active`;assert.equal(count.n,1);
  // A second device reads the server-owned list without local saved data.
  const device=await browser.newContext();await device.addCookies([{name:'rentra_session',value:await token(a),url:origin,httpOnly:true,sameSite:'Lax'}]);
  const otherPage=await device.newPage();await otherPage.goto(origin+'/saved');await otherPage.getByRole('link',{name:'Saved Fixture',exact:true}).waitFor({timeout:60000});
  // Abort the mutation request: optimistic removal must roll back.
  await page.route('**/saved',route=>route.request().method()==='POST'?route.abort():route.continue());
  await page.getByRole('button',{name:'Remove Saved Fixture',exact:true}).click();
  await page.getByRole('alert').waitFor();await page.getByRole('link',{name:'Saved Fixture',exact:true}).waitFor();
  await page.unroute('**/saved');
  await page.getByRole('button',{name:'Remove Saved Fixture',exact:true}).click();
  await page.getByRole('button',{name:'Undo',exact:true}).waitFor();
  // Undo failure leaves removal committed and undo available for retry.
  await page.route('**/saved',route=>route.request().method()==='POST'?route.abort():route.continue());
  await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('link',{name:'Saved Fixture',exact:true}).count(),0);
  await page.unroute('**/saved');await page.getByRole('button',{name:'Undo',exact:true}).click();await page.getByRole('link',{name:'Saved Fixture',exact:true}).waitFor();
  // Unpublishing strips the public card rather than leaking owner-only data.
  await sql`UPDATE rentable SET status='paused' WHERE id=${first}`;await page.reload();await page.getByRole('heading',{name:'Unavailable place',exact:true}).waitFor();
  await page.getByRole('button',{name:'Remove Unavailable place',exact:true}).click();await page.getByRole('button',{name:'Undo',exact:true}).click();
  await page.getByRole('heading',{name:'Unavailable place',exact:true}).waitFor();await sql`UPDATE rentable SET status='live' WHERE id=${first}`;
  // Logout clears the in-memory shortlist; another account starts empty.
  await page.goto(origin+'/account');await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(origin+'/');
  await page.goto(origin+'/saved');await page.getByText('Save places you’d love to visit using the heart on a listing.').waitFor();
  await context.addCookies([{name:'rentra_session',value:await token(b),url:origin,httpOnly:true,sameSite:'Lax'}]);
  await page.reload();await page.getByText('Save places you’d love to visit using the heart on a listing.').waitFor();
  assert.equal(await page.getByRole('link',{name:'Saved Fixture',exact:true}).count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth),false);
  assert.ok(second);
 } finally {if(browser)await browser.close();if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}}
}
