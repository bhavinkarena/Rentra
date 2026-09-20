import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync,closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';
export async function verifyCancellationBrowser({databaseUrl,session,orderId}) {
  const {chromium}=await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin='http://localhost:3201',secret='part14-browser-only-secret-at-least-32-characters';
  const log=openSync(join(tmpdir(),'rentra-part14-browser-server.log'),'w');
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port','3201'],{
    env:{...process.env,NODE_ENV:'development',RENTRA_BROWSER_FIXTURE:'1',DATABASE_URL:databaseUrl,NEXT_PUBLIC_SITE_URL:origin,SESSION_SECRET:secret},stdio:['ignore',log,log]});
  closeSync(log);let browser;
  try {
    for(let i=0;i<120;i++){if(server.exitCode!==null)throw new Error('Browser fixture exited');try{if((await fetch(origin+'/login')).ok)break;}catch{}await delay(500);}
    browser=await chromium.launch({headless:true,...(process.env.CUSTOMER_BROWSER_EXECUTABLE?{executablePath:process.env.CUSTOMER_BROWSER_EXECUTABLE}:{})});
    const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'});
    const token=await new SignJWT({...session,accountStatus:'active'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
    await context.addCookies([{name:'rentra_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
    const page=await context.newPage();page.setDefaultTimeout(90000);
    await page.goto(origin+'/bookings/'+orderId+'/cancel');
    await page.getByRole('checkbox').nth(1).check();
    await page.getByRole('button',{name:'Preview cancellation',exact:true}).click();
    await page.getByRole('heading',{name:'Review your cancellation'}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Confirm cancellation'}).isDisabled(),true);
    await page.getByLabel('I accept this refund estimate and cancellation of only these visits.').check();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(tmpdir(),'rentra-part14-cancel.png'),fullPage:true});
    await page.getByRole('button',{name:'Confirm cancellation'}).dblclick();
    await page.getByRole('heading',{name:'Visits cancelled',exact:true}).waitFor();
    await page.getByRole('link',{name:'Back to booking record'}).click();
    await page.getByText('Mixed visit statuses — check each visit below.',{exact:true}).waitFor();
    // Exercise lookup-only recovery using the final module, before the fixture database is removed.
    const sql=postgres(databaseUrl,{max:1,prepare:false});drizzle(sql);
    try {
      const [refund]=await sql`SELECT r.*,t.provider_payment_id FROM refund r JOIN payment_transaction t ON t.id=r.transaction_id
        JOIN payment_attempt a ON a.id=t.attempt_id JOIN payment_order p ON p.id=a.payment_order_id
        WHERE p.booking_order_id=${orderId}`;
      assert.ok(refund);
      const remote={id:'rfnd_BrowserRecovery',payment_id:refund.provider_payment_id,amount:Number(refund.expected_minor),currency:'INR',receipt:refund.id,status:'processed'};
      let posts=0;
      const fetcher=async(url,options)=>{if(options.method==='POST')posts++;return Response.json(url.includes('/payments/')?{items:[remote]}:remote);};
      const {reconcileRefund}=await import('../../lib/payments/refunds.js?final-part14');
      const options={lookupOnly:true,fetcher,env:{NODE_ENV:'test',RAZORPAY_TEST_KEY_ID:'rzp_test_CheckoutFixture',RAZORPAY_TEST_KEY_SECRET:'fixture-api-secret',RAZORPAY_TEST_WEBHOOK_SECRET:'fixture-webhook-secret'}};
      await reconcileRefund(sql,refund.id,options);await reconcileRefund(sql,refund.id,options);
      assert.equal(posts,0);
      assert.equal((await sql`SELECT state FROM refund WHERE id=${refund.id}`)[0].state,'succeeded');
      assert.ok((await sql`SELECT dispatched_at FROM refund_execution WHERE refund_id=${refund.id}`)[0].dispatched_at);
    } finally {await sql.end({timeout:5});}
    await page.reload();
    await page.getByRole('heading',{name:'Refund obligations'}).waitFor();
    assert.ok((await page.textContent('body')).includes('actual bank refund: ₹0'));
    assert.equal(await page.getByText('cancelled',{exact:true}).count(),1);
    await context.clearCookies();
    await page.goto(origin+'/bookings/'+orderId+'/cancel');await page.waitForURL('**/login');
  } finally {await browser?.close();if(server.exitCode===null){server.kill('SIGTERM');await Promise.race([once(server,'exit'),delay(10000)]);if(server.exitCode===null)server.kill('SIGKILL');}}
}
