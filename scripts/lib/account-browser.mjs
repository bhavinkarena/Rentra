import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

export async function verifyAccountBrowser({sql,databaseUrl,env}) {
  const {chromium}=await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const port=Number(process.env.CUSTOMER_BROWSER_PORT || 3196),origin=`http://localhost:${port}`;
  const logPath=join(tmpdir(),'rentra-part06-browser-server.log');
  const log=openSync(logPath,'w');
  const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port',String(port)],{
    env:{...process.env,...env,NODE_ENV:'development',RENTRA_BROWSER_FIXTURE:'1',CUSTOMER_OTP_DELIVERY:'development',DATABASE_URL:databaseUrl,NEXT_PUBLIC_SITE_URL:origin},
    stdio:['ignore',log,log],windowsHide:true,
  });closeSync(log);
  let browser;
  try {
    for(let i=0;i<120;i++) {
      if(server.exitCode!==null) throw new Error(`Browser server exited; inspect ${logPath}`);
      try {if((await fetch(`${origin}/login`)).ok) break;} catch {}
      if(i===119) throw new Error(`Browser server did not start; inspect ${logPath}`);
      await delay(500);
    }
    browser=await chromium.launch({headless:true,...(process.env.CUSTOMER_BROWSER_EXECUTABLE?{executablePath:process.env.CUSTOMER_BROWSER_EXECUTABLE}:{})});
    const context=await browser.newContext({viewport:{width:360,height:800}}),page=await context.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(`${origin}/account`);await page.waitForURL('**/login');
    await page.getByLabel('Mobile number',{exact:true}).fill('9000000680');
    await page.getByRole('button',{name:'Send code',exact:true}).click();
    await page.getByLabel('One-time code').fill('123456');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL('**/onboarding');
    assert.equal(await page.getByRole('checkbox').isChecked(),false);
    await page.getByLabel('Your name',{exact:true}).fill('Browser Account');
    await page.getByRole('button',{name:'Save and continue'}).click();
    await page.waitForURL('**/account');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByLabel('Your name',{exact:true}).fill('Browser Updated');
    await page.getByRole('checkbox').check();
    await page.getByRole('button',{name:'Save profile',exact:true}).click();
    await page.getByRole('status').filter({hasText:'saved'}).waitFor();
    await page.reload();assert.equal(await page.getByLabel('Your name',{exact:true}).inputValue(),'Browser Updated');
    assert.equal(await page.getByRole('checkbox').isChecked(),true);
    // Keyboard navigation reaches an actual focusable control.
    await page.keyboard.press('Tab');
    assert.notEqual(await page.evaluate(()=>document.activeElement.tagName),'BODY');
    for(const [route,title] of [['/saved','Saved places'],['/bookings','Your bookings'],['/account/payment-methods','Payment methods']]) {
      await page.goto(origin+route);await page.getByRole('heading',{name:title,exact:true}).waitFor();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      assert.match(await page.locator('meta[name="robots"]').getAttribute('content'),/noindex/);
    }
    await page.goto(`${origin}/account/privacy`);await page.getByLabel('Request type').selectOption('deletion');
    await page.getByRole('button',{name:'Submit privacy request'}).click();
    await page.getByRole('status').filter({hasText:'Reference:'}).waitFor();
    await page.reload();await page.getByText('Account deletion · open',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const before=(await context.cookies()).find(c=>c.name==='rentra_session').value;
    await page.goto(`${origin}/account/phone`);
    await page.getByLabel('New mobile number').fill('9000000681');
    await page.getByRole('button',{name:'Send verification code'}).click();
    await page.getByLabel('Verification code',{exact:true}).fill('000000');
    await page.getByRole('button',{name:'Verify and change number'}).click();
    await page.getByRole('alert').waitFor();
    // The alert renders before React's post-render focus effect runs.
    await page.waitForFunction(()=>document.activeElement?.getAttribute('role')==='alert',{},{timeout:10000});
    await page.getByLabel('Verification code',{exact:true}).fill('123456');
    await page.getByRole('button',{name:'Verify and change number'}).click();
    await page.waitForURL('**/account');await page.getByText('+91 9000000681',{exact:true}).waitFor();
    assert.notEqual((await context.cookies()).find(c=>c.name==='rentra_session').value,before);
    const [user]=await sql`SELECT id FROM "user" WHERE phone='9000000681' AND role='customer'`;
    assert.equal((await sql`SELECT count(*)::int n FROM customer_session WHERE user_id=${user.id} AND revoked_at IS NULL`)[0].n,1);
    await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(origin+'/');
    assert.equal((await context.cookies()).some(c=>['rentra_session','rentra_login_selection','rentra_phone_change'].includes(c.name)),false);
    await page.goto(`${origin}/account`);await page.waitForURL('**/login');
    assert.equal((await sql`SELECT count(*)::int n FROM customer_session WHERE user_id=${user.id} AND revoked_at IS NULL`)[0].n,0);
  } finally {
    if(browser) await browser.close();
    if(server.exitCode===null){server.kill('SIGTERM');await once(server,'exit');}
  }
}
