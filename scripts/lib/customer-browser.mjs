/** Optional real browser gate against the same disposable database as the auth suite. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';

export async function verifyCustomerBrowser({ databaseUrl, sql, day, env }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const port = Number(process.env.CUSTOMER_BROWSER_PORT || 3195);
  const origin = `http://localhost:${port}`;
  const log = openSync('/private/tmp/rentra-part05-browser-server.log','w');
  const server = spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--webpack','--port',String(port)],{
    env:{...process.env,...env,NODE_ENV:'development',DEV_OTP_BYPASS:'false',CUSTOMER_OTP_DELIVERY:'development',DATABASE_URL:databaseUrl,NEXT_PUBLIC_SITE_URL:origin},
    stdio:['ignore',log,log],
  });
  closeSync(log);
  let browser;
  try {
    for(let i=0;i<120;i++) {
      if(server.exitCode !== null) throw new Error('Browser fixture server exited');
      try { const response=await fetch(`${origin}/login`); if(response.ok) break; } catch {}
      if(i===119) throw new Error('Browser fixture server did not start');
      await delay(500);
    }
    browser=await chromium.launch({headless:true,...(process.env.CUSTOMER_BROWSER_EXECUTABLE?{executablePath:process.env.CUSTOMER_BROWSER_EXECUTABLE}:{})});
    const context=await browser.newContext();
    const page=await context.newPage();
    page.setDefaultTimeout(60000);
    await page.goto(`${origin}/listing/fixture-fix12345`);
    await page.getByLabel('Guests per visit').fill('10');
    const login=page.getByRole('button',{name:'Log in with these dates'});
    await login.click();
    await page.waitForURL('**/login');
    await page.getByLabel('Mobile number').fill('9876543210');
    await page.getByRole('button',{name:'Send code',exact:true}).click();
    await page.getByLabel('One-time code').fill('000000');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.getByRole('alert').filter({hasText:'invalid or expired'}).waitFor();
    await page.getByLabel('One-time code').fill('123456');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL('**/listing/fixture-fix12345');
    await page.getByRole('button',{name:'Online booking is not available yet'}).waitFor();
    await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='10');
    await page.getByText('Your booking estimate',{exact:true}).waitFor();
    // Wait for the owned re-quote; anonymous previews cannot satisfy this check.
    for(let i=0;i<40;i++) {
      const [row]=await sql`SELECT q.id,q.selection FROM booking_quote q JOIN "user" u ON u.id=q.customer_id WHERE u.phone='9876543210'`;
      if(row) { assert.deepEqual(row.selection.dates,[day]); assert.equal(row.selection.guests,10); assert.equal(row.selection.slot,'day'); break; }
      if(i===39) throw new Error('No customer-owned quote after browser login');
      await delay(250);
    }
    const cookies=await context.cookies();
    const session=cookies.find(c=>c.name==='rentra_session');
    assert.ok(session?.httpOnly); assert.equal(session.sameSite,'Lax');
    assert.ok(cookies.find(c=>c.name==='rentra_login_selection')?.httpOnly);
    await page.reload();
    await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='10');
    // A separate partner account is never silently converted by /login.
    const [partner]=await sql`INSERT INTO "user"(role,email,account_status) VALUES ('client','browser-partner@fixture.invalid','active') RETURNING id`;
    const partnerToken=await new SignJWT({userId:partner.id,role:'client',accountStatus:'active'}).setProtectedHeader({alg:'HS256'}).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.SESSION_SECRET));
    await context.addCookies([{name:'rentra_session',value:partnerToken,url:origin,httpOnly:true,sameSite:'Lax'}]);
    await page.goto(`${origin}/login`);
    await page.getByRole('button',{name:'Sign out and continue as customer'}).click();
    await page.getByRole('button',{name:'Send code',exact:true}).waitFor();
    assert.equal((await sql`SELECT role FROM "user" WHERE id=${partner.id}`)[0].role,'client');
    const [admin]=await sql`INSERT INTO admin_user(email,name,password_hash) VALUES ('browser-admin@fixture.invalid','Fixture','not-a-login-hash') RETURNING id`;
    const adminToken=await new SignJWT({adminId:admin.id}).setProtectedHeader({alg:'HS256'}).setAudience('rentra:admin').setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.SESSION_SECRET));
    await context.addCookies([{name:'rentra_admin',value:adminToken,url:origin,httpOnly:true,sameSite:'Strict'}]);
    await page.goto(`${origin}/login`);
    await page.getByText('You are signed in as an administrator.',{exact:false}).waitFor();
    await page.getByRole('button',{name:'Sign out and continue as customer'}).click();
    await page.getByRole('button',{name:'Send code',exact:true}).waitFor();
    assert.equal((await context.cookies()).some(cookie=>cookie.name==='rentra_admin'),false);
    // Mobile CTA is keyboard reachable and preserves the same selection path.
    await context.clearCookies();
    await page.setViewportSize({width:390,height:844});
    await page.goto(`${origin}/listing/fixture-fix12345`);
    await page.getByLabel('Guests per visit').fill('7');
    await page.getByText('Your booking estimate',{exact:true}).scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL('**/login');
    await page.getByLabel('Mobile number').fill('9876543211');
    await page.getByRole('button',{name:'Send code',exact:true}).click();
    await page.getByLabel('One-time code').fill('123456');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL('**/listing/fixture-fix12345');
    await page.waitForFunction(()=>document.querySelector('input[type="number"]')?.value==='7');

  } finally {
    if(browser) await browser.close();
    if(server.exitCode===null) { server.kill('SIGTERM'); await once(server,'exit'); }
  }
}
