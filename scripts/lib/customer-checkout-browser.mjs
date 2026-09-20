import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createBookingQuote } from '../../lib/booking/quotes.js';
import { addLocalDays } from '../../lib/domain/booking-dates.js';
import { SignJWT } from 'jose';

export async function verifyCheckoutBrowser({ sql, databaseUrl, env, session, otherSession, quote, prepare, confirm }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3199', secret = 'part12-browser-only-secret-at-least-32-characters';
  const log = openSync(join(tmpdir(), 'rentra-part12-browser-server.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3199'], {
    env: { ...process.env, ...env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: secret }, stdio: ['ignore', log, log],
  });
  closeSync(log);
  let browser;
  try {
    for (let i=0;i<120;i++) { if(server.exitCode!==null) throw new Error('Fixture server exited'); try { if((await fetch(origin+'/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless: true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? { executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE } : {}) });
    const context = await browser.newContext({ viewport: {width:390,height:844} });
    async function login(actor) {
      const token = await new SignJWT({...actor,accountStatus:'active'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(secret));
      await context.addCookies([{name:'rentra_session',value:token,url:origin,httpOnly:true,sameSite:'Lax'}]);
    }
    await login(session);
    await context.route('https://checkout.razorpay.com/v1/checkout.js', route => route.fulfill({contentType:'application/javascript',body:`
      window.Razorpay = class {
        constructor(options) { window.hostedOptions=options; this.options=options; window.hostedInstance=this; }
        on(name, handler) { this.failure=handler; }
        open() { window.hostedOpened=(window.hostedOpened||0)+1; }
        close() {}
      };
    `}));
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    await page.clock.install();
    await page.goto(origin+'/checkout/review/'+quote.id);
    await page.getByRole('heading',{name:'Your test booking',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'Continue to test payment'}).isDisabled(),true);
    await page.getByLabel('Purpose of your visit').fill('Family picnic');
    await page.getByRole('checkbox').check();
    await page.screenshot({path:join(tmpdir(),'rentra-part12-review.png'),fullPage:true});
    await page.getByRole('button',{name:'Continue to test payment'}).dblclick();
    await page.waitForURL(url => /\/checkout\/[a-f0-9-]{36}$/.test(url.pathname));
    const orderId = new URL(page.url()).pathname.split('/').at(-1);
    const [{n}] = await sql`SELECT count(*)::int n FROM booking_order WHERE quote_id=${quote.id}`;
    assert.equal(n,1);
    await page.reload();
    await page.getByText('Purpose: Family picnic',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    const checkout = await prepare(orderId);
    await page.reload();
    const pay = page.getByRole('button',{name:'Continue to test payment'});
    await pay.click();
    await page.waitForFunction(()=>window.hostedOpened===1);
    assert.equal(await page.evaluate(()=>window.hostedOptions.order_id),checkout.providerOrderId);
    assert.equal(await page.evaluate(()=>window.hostedOptions.amount),checkout.expectedMinor);
    await page.evaluate(()=>window.hostedInstance.failure({error:{description:'failure'}}));
    await page.getByRole('alert').filter({hasText:'Test payment failed'}).waitFor();
    await page.evaluate(()=>window.hostedOptions.modal.ondismiss());
    await page.getByRole('alert').filter({hasText:'Payment window closed'}).waitFor();
    await pay.click();
    await page.waitForFunction(()=>window.hostedOpened===2);
    await page.evaluate(()=>window.hostedOptions.handler({razorpay_payment_id:'pay_Forged',razorpay_signature:'0'.repeat(64)}));
    await page.getByRole('alert').filter({hasText:'could not complete'}).waitFor();
    assert.equal(await page.getByRole('heading',{name:'Test booking confirmed',exact:true}).count(),0);
    // A server-verified capture arrives as if through worker/webhook while browser outcome is uncertain.
    await confirm(checkout);
    await page.reload();
    await page.getByRole('heading',{name:'Test booking confirmed',exact:true}).first().waitFor();
    assert.equal(await page.getByRole('button',{name:'Continue to test payment'}).count(),0);
    await page.goto(origin+'/checkout/review/'+quote.id);
    await page.waitForURL('**/checkout/'+orderId);
    // Separate dates and a lost hold response must recover the original owned order.
    const separateSelection={...quote.selection,dates:[addLocalDays(quote.selection.dates[0],5),addLocalDays(quote.selection.dates[0],8)]};
    const separate=await createBookingQuote(sql,separateSelection,{customerId:session.userId,variables:env});
    const reviewUrl=origin+'/checkout/review/'+separate.id;
    await page.goto(reviewUrl);
    await page.getByLabel('Purpose of your visit').fill('Family reunion');
    await page.getByRole('checkbox').check();
    let dropped=false;
    await page.route(reviewUrl,async route=>{
      if(route.request().method()==='POST' && !dropped) { dropped=true; await route.fetch({timeout:120000}); await route.abort('connectionreset'); }
      else await route.continue();
    });
    await page.getByRole('button',{name:'Continue to test payment'}).click();
    await page.getByRole('alert').filter({hasText:'may have reached us'}).waitFor();
    await page.unroute(reviewUrl);
    await page.reload();
    await page.waitForURL(url=>/\/checkout\/[a-f0-9-]{36}$/.test(url.pathname));
    const recoveredId=new URL(page.url()).pathname.split('/').at(-1);
    assert.equal((await sql`SELECT count(*)::int n FROM booking_order WHERE quote_id=${separate.id}`)[0].n,1);
    await page.getByRole('button',{name:'Release unpaid hold and review a fresh quote'}).click();
    await page.waitForURL('**/listing/**');
    assert.equal((await sql`SELECT state FROM booking_order WHERE id=${recoveredId}`)[0].state,'expired');
    const single=await createBookingQuote(sql,{...separateSelection,dates:[separateSelection.dates[0]]},{customerId:session.userId,variables:env});
    await page.goto(origin+'/checkout/review/'+single.id);
    await page.getByRole('heading',{name:'Your visits',exact:true}).waitFor();
    assert.equal(await page.getByText('Separate deposit:',{exact:false}).count(),1);
    assert.equal(await page.getByRole('checkbox').isChecked(),false);
    await sql`INSERT INTO booking_price_override(rentable_id,day,slot,rent_minor) VALUES(${single.selection.rentableId},${single.selection.dates[0]},'day',900000)`;
    await page.getByLabel('Purpose of your visit').fill('Family picnic');
    await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Continue to test payment'}).click();
    await page.getByRole('alert').filter({hasText:'changed'}).waitFor();
    assert.equal(await page.getByRole('checkbox').isChecked(),false);
    const replacement=await createBookingQuote(sql,single.selection,{customerId:session.userId,variables:env});
    await page.goto(origin+'/checkout/review/'+replacement.id);
    await page.getByLabel('Purpose of your visit').fill('Family picnic');
    await page.getByRole('checkbox').check();
    await page.clock.fastForward(11*60*1000);
    assert.equal(await page.getByRole('button',{name:'Continue to test payment'}).isDisabled(),true);
    await login(otherSession);
    await page.goto(origin+'/checkout/'+orderId);
    await page.getByText('This page could not be found.',{exact:true}).waitFor();
    await context.clearCookies();
    await page.goto(origin+'/checkout/'+orderId);
    await page.waitForURL('**/login');
  } finally {
    await browser?.close();
    if(server.exitCode===null) { server.kill('SIGTERM'); await Promise.race([once(server,'exit'),delay(10000)]); if(server.exitCode===null) server.kill('SIGKILL'); }
  }
}
