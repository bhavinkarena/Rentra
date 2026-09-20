import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';

export async function verifyRecordsBrowser({ databaseUrl, actor, stranger, owner, otherOwner, admin, target }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3201', secret = 'part13-only-fixture-session-secret-long-enough';
  const log = openSync(join(tmpdir(), 'rentra-part13-browser.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3201'], {
    env: { ...process.env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: secret }, stdio: ['ignore', log, log],
  });
  closeSync(log);
  let browser;
  try {
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Browser fixture server exited'); try { if ((await fetch(origin + '/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless: true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? { executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    async function login(payload, isAdmin = false) {
      await context.clearCookies();
      let token = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h');
      if (isAdmin) token = token.setAudience('rentra:admin');
      await context.addCookies([{ name: isAdmin ? 'rentra_admin' : 'rentra_session', value: await token.sign(new TextEncoder().encode(secret)), url: origin, httpOnly: true, sameSite: 'Lax' }]);
    }
    const path = '/bookings/' + target.id;
    await login(actor.session);
    await page.goto(origin + '/bookings');
    await page.getByRole('heading', { name: 'Your bookings' }).waitFor();
    await page.getByLabel('Search property or booking reference').fill('REC13-1');
    await page.getByRole('button', { name: 'Search', exact: true }).click();
    await page.getByRole('link', { name: 'Accepted original title', exact: true }).click();
    await page.getByRole('heading', { name: 'Test booking record', exact: true }).waitFor();
    await page.getByText('PRIVATE ARRIVAL ADDRESS', { exact: true }).waitFor();
    assert.ok((await page.locator('article').innerText()).includes('Family reunion'));
    assert.ok((await page.locator('article').innerText()).includes('Asia/Kolkata'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'rentra-part13-record.png'), fullPage: true });
    await page.reload();
    await page.getByRole('heading', { name: 'Test booking record', exact: true }).waitFor();
    const summary = await context.request.get(origin + path + '/summary');
    assert.equal(summary.status(), 200); assert.match(summary.headers()['cache-control'], /no-store/);
    assert.match(summary.headers()['content-disposition'], /attachment/);
    assert.match(await summary.text(), /TEST PAYMENT/); assert.ok(!(await summary.text()).includes('PRIVATE ARRIVAL ADDRESS'));
    await login(stranger.session);
    assert.equal((await context.request.get(origin + path + '/summary')).status(), 404);
    await page.goto(origin + path); await page.getByText('This page could not be found.', { exact: true }).waitFor();
    assert.ok(!(await page.content()).includes('PRIVATE ARRIVAL ADDRESS'));
    for (const [user, allowed] of [[owner, true], [otherOwner, false]]) {
      await login({ role: 'client', userId: user.id, accountStatus: 'active' });
      const response = await context.request.get(origin + '/partner' + path + '/summary');
      assert.equal(response.status(), allowed ? 200 : 404);
      if (allowed) { await page.goto(origin + '/partner' + path); await page.getByText('Family reunion', { exact: true }).waitFor(); }
    }
    await login({ adminId: admin.id }, true);
    await page.goto(origin + '/admin' + path); await page.getByText('Family reunion', { exact: true }).waitFor();
    assert.equal((await context.request.get(origin + '/admin' + path + '/summary')).status(), 200);
    await context.clearCookies();
    assert.equal((await context.request.get(origin + path + '/summary')).status(), 401);
    await page.goto(origin + path); await page.waitForURL('**/login');
  } finally {
    await browser?.close();
    if (server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([once(server, 'exit'), delay(10000)]); if (server.exitCode === null) server.kill('SIGKILL'); }
  }
}
