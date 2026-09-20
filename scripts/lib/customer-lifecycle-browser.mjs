import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';

export async function verifyLifecycleBrowser({ databaseUrl, actor, stranger, owner, otherOwner, admin, target, newDay }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3201', secret = 'part15-only-fixture-session-secret-long-enough';
  const log = openSync(join(tmpdir(), 'rentra-part15-browser.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3201'], {
    env: { ...process.env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: secret, CUSTOMER_NOTIFICATION_DELIVERY: 'disabled' }, stdio: ['ignore', log, log],
  });
  closeSync(log);
  let browser;
  try {
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Browser fixture server exited'); try { if ((await fetch(origin + '/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless: true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? { executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    async function login(payload, isAdmin = false) {
      await context.clearCookies();
      let token = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h');
      if (isAdmin) token = token.setAudience('rentra:admin');
      await context.addCookies([{ name: isAdmin ? 'rentra_admin' : 'rentra_session', value: await token.sign(new TextEncoder().encode(secret)), url: origin, httpOnly: true, sameSite: 'Lax' }]);
    }
    const path = '/bookings/' + target.id;
    await login({ role: 'client', userId: owner.id, accountStatus: 'active' });
    await page.goto(origin + '/partner' + path);
    const indiaTime = new Date(+target.start + 60000 + 330 * 60000).toISOString().slice(0,16);
    for (const phase of ['handover','return','complete']) {
      await page.locator('summary').filter({ hasText: `Record ${phase} evidence` }).click();
      await page.getByText('Test / simulation visit:', { exact: false }).waitFor();
      await page.getByLabel('When it occurred (India time)').fill(indiaTime);
      await page.getByLabel('Evidence: what you observed').fill('Browser operator checked the guest and the property.');
      await page.getByRole('checkbox', { name: /I confirm this observation/ }).check();
      await page.getByRole('button', { name: 'Record ' + phase, exact: true }).click();
      await page.getByText(`${phase} recorded (simulation)`, { exact: false }).waitFor();
    }
    // Each next phase must work in the revalidated page without a manual reload.
    await page.reload();
    await page.getByText('completed', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal((await context.request.get(origin + '/partner' + path + '/calendar')).status(), 200);
    await login({ role: 'client', userId: otherOwner.id, accountStatus: 'active' });
    assert.equal((await context.request.get(origin + '/partner' + path + '/calendar')).status(), 404);
    await login(actor.session);
    await page.goto(origin + '/account/notifications');
    await page.getByRole('heading', { name: 'Booking updates', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.ok((await page.locator('main').innerText()).includes('Test / simulation'));
    const unread = page.getByRole('button', { name: 'Mark as read', exact: true });
    const before = await unread.count(); assert.ok(before > 0); await unread.first().click();
    await page.waitForFunction(n => [...document.querySelectorAll('button')].filter(b => b.textContent === 'Mark as read').length === n - 1, before);
    await page.reload(); assert.equal(await unread.count(), before - 1);
    await page.goto(origin + path);
    assert.equal(await page.getByRole('button', { name: /^Record / }).count(), 0);
    const calendar = await context.request.get(origin + path + '/calendar');
    assert.equal(calendar.status(), 200); assert.match(calendar.headers()['content-type'], /text\/calendar/);
    assert.match(calendar.headers()['cache-control'], /no-store/); assert.match(calendar.headers()['content-disposition'], /\.ics/);
    const content = await calendar.text(); assert.match(content, /BEGIN:VEVENT/); assert.ok(!content.includes('PRIVATE ARRIVAL ADDRESS'));
    await page.getByRole('link', { name: 'Book again with new dates' }).click();
    await page.getByLabel('Visit date 1').fill(newDay);
    await page.getByRole('button', { name: 'Check new dates and prices', exact: true }).click();
    await page.waitForURL('**/checkout/review/*');
    await page.locator('main').getByText(/2,700/).first().waitFor();
    assert.ok((await page.locator('main').innerText()).includes('2,700'));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: join(tmpdir(), 'rentra-part15-book-again.png'), fullPage: true });
    await login(stranger.session); assert.equal((await context.request.get(origin + path + '/calendar')).status(), 404);
    await page.goto(origin + path + '/again'); await page.getByText('This page could not be found.', { exact: true }).waitFor();
    await login({ adminId: admin.id }, true);
    await page.goto(origin + '/admin/notifications'); await page.getByRole('heading', { name: 'Notification delivery', exact: true }).waitFor();
    assert.ok((await page.locator('main').innerText()).includes('Provider acceptance is not handset delivery'));
    assert.equal((await context.request.get(origin + '/admin' + path + '/calendar')).status(), 200);
    await context.clearCookies(); assert.equal((await context.request.get(origin + path + '/calendar')).status(), 401);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    if (server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([once(server, 'exit'), delay(10000)]); if (server.exitCode === null) server.kill('SIGKILL'); }
  }
}
