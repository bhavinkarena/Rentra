import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';
import { randomUUID } from 'node:crypto';
import { POLICY_VERSION } from '../../lib/domain/help.js';
export async function verifySupportBrowser({ databaseUrl, actor, stranger, owner, admin, order, privacy }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3203', secret = 'part17-only-fixture-session-secret-long-enough';
  const log = openSync(join(tmpdir(), 'rentra-part17-browser.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','dev','--webpack','--port','3203'], {
    env: { ...process.env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', RENTRA_BROWSER_FIXTURE_ID: 'support-' + randomUUID().slice(0,8), DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: secret,
      CUSTOMER_NOTIFICATION_DELIVERY: 'disabled', RENTRA_SUPPORT_EMAIL: '', RENTRA_SUPPORT_HOURS: '', NEXT_PUBLIC_WHATSAPP_NUMBER: '' }, stdio: ['ignore',log,log],
  }); closeSync(log);
  let browser;
  try {
    for (let i=0;i<120;i++) { if(server.exitCode!==null) throw new Error('Browser fixture server exited'); try { if((await fetch(origin+'/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless:true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? {executablePath:process.env.CUSTOMER_BROWSER_EXECUTABLE} : {}) });
    const context = await browser.newContext({viewport:{width:390,height:844},timezoneId:'America/Los_Angeles'}), page = await context.newPage(); page.setDefaultTimeout(90000);
    const errors=[]; page.on('pageerror',error=>errors.push(error.message));
    async function login(payload,isAdmin=false) {
      await context.clearCookies(); let token=new SignJWT(payload).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h');
      if(isAdmin)token=token.setAudience('rentra:admin');
      await context.addCookies([{name:isAdmin?'rentra_admin':'rentra_session',value:await token.sign(new TextEncoder().encode(secret)),url:origin,httpOnly:true,sameSite:'Lax'}]);
    }
    await page.goto(origin+'/help'); await page.getByRole('heading',{name:'Help and support',exact:true}).waitFor();
    await page.getByLabel('Search help',{exact:true}).fill('refund'); await page.getByRole('button',{name:'Search help',exact:true}).click();
    await page.locator('summary').filter({hasText:'How do I cancel one visit'}).click();
    await page.getByRole('link',{name:'Read cancellation rules',exact:true}).click();
    await page.getByRole('heading',{name:'Cancellation and Test refunds',exact:true}).waitFor();
    await page.getByRole('link',{name:'Permanent link to this version'}).click(); await page.waitForURL('**/policies/cancellation/'+POLICY_VERSION);
    assert.ok((await page.locator('link[rel="canonical"]').getAttribute('href')).endsWith('/policies/cancellation/'+POLICY_VERSION));
    await page.goto(origin+'/policies/terms/not-a-version'); await page.getByText('This page could not be found.',{exact:true}).waitFor();
    await login(actor.session); await page.goto(origin+'/bookings/'+order.id);
    await page.getByRole('link',{name:'Get booking help',exact:true}).click();
    await page.getByLabel('Topic').selectOption('change'); await page.getByLabel('Subject',{exact:true}).fill('Browser visit change question');
    const original='Can we change the date? <script>window.SUPPORT_XSS=true</script> Keep my original booking until I confirm.';
    await page.getByLabel('How can we help?',{exact:true}).fill(original);
    await page.getByRole('button',{name:'Send support request',exact:true}).click();
    await page.getByRole('heading',{name:'Browser visit change question',exact:true}).waitFor();
    const path=new URL(page.url()).pathname;
    assert.notEqual(path,'/support/new');
    const robots=await page.locator('meta[name="robots"]').evaluateAll(nodes=>nodes.map(n=>n.content));
    assert.ok(robots.length && robots.every(value=>value.includes('noindex')));
    await page.getByText(original,{exact:true}).waitFor(); assert.equal(await page.evaluate(()=>window.SUPPORT_XSS),undefined);
    await page.reload(); await page.getByText(original,{exact:true}).waitFor();
    assert.ok((await page.locator('main').innerText()).includes('customer-v1'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await login({adminId:admin.id},true); await page.goto(origin+'/admin/support');
    await page.getByRole('link',{name:'Browser visit change question',exact:true}).click();
    await page.getByLabel('Your reply',{exact:true}).fill('We reviewed your request. Please confirm which new date you want.');
    await page.getByLabel('Status after this reply').selectOption('waiting_customer'); await page.getByRole('button',{name:'Save reply and status',exact:true}).click();
    await page.getByText('We reviewed your request. Please confirm which new date you want.',{exact:true}).waitFor();
    await login(actor.session); await page.goto(origin+path);
    await page.getByLabel('Your reply',{exact:true}).fill('Thank you. I understand the cancellation and rebooking process.');
    await page.getByLabel('Status after this reply').selectOption('resolved'); await page.getByRole('button',{name:'Save reply and status',exact:true}).click();
    await page.getByRole('heading',{name:'Reply or reopen this request',exact:true}).waitFor();
    await page.reload(); await page.getByRole('heading',{name:'Reply or reopen this request',exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(tmpdir(),'rentra-part17-support.png'),fullPage:true});
    await page.goto(origin+'/account/privacy'); await page.getByRole('link',{name:'Ask about this privacy request',exact:true}).click();
    await page.waitForURL(url=>url.pathname==='/support/new' && url.searchParams.get('privacy')===privacy.id);
    await page.getByText('This conversation does not fulfill it.',{exact:false}).waitFor();
    await login(stranger.session); await page.goto(origin+path); await page.getByText('This page could not be found.',{exact:true}).waitFor();
    assert.ok(!(await page.content()).includes('Browser visit change question'));
    await page.goto(origin+'/support/new?order='+order.id); await page.getByText('This page could not be found.',{exact:true}).waitFor();
    await page.goto(origin+'/support/new?privacy='+privacy.id); await page.getByText('This page could not be found.',{exact:true}).waitFor();
    await login({role:'client',userId:owner.id,accountStatus:'active'}); await page.goto(origin+path); assert.ok(!(await page.content()).includes(original));
    await context.clearCookies(); await page.goto(origin+path); await page.waitForURL('**/login');
    await page.goto(origin+'/help'); await page.getByText('Support hours have not been published. No response time is promised.',{exact:true}).waitFor();
    assert.deepEqual(errors,[]);
  } finally {
    await browser?.close();
    if(server.exitCode===null){server.kill('SIGTERM');await Promise.race([once(server,'exit'),delay(10000)]);if(server.exitCode===null)server.kill('SIGKILL');}
  }
}
