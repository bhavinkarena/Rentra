import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
export async function verifySearchBrowser({ databaseUrl, day, second }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3197';
  const log = openSync(join(tmpdir(), 'rentra-part08-browser-server.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3197'], { env: { ...process.env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: 'part08-browser-only-secret-at-least-32-characters', CUSTOMER_OTP_DELIVERY: 'development' }, stdio: ['ignore', log, log] });
  closeSync(log);
  let browser;
  try {
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Fixture server exited'); try { if ((await fetch(origin + '/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless: true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? { executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE } : {}) });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.setDefaultTimeout(60000);
    await page.goto(origin + '/search');
    await page.getByRole('heading', { name: '14 places', exact: true }).waitFor();
    await page.getByLabel('Slot', { exact: true }).selectOption('day');
    await page.getByLabel('Sort', { exact: true }).selectOption('price_desc');
    await page.getByRole('button', { name: 'Show places' }).click();
    await page.waitForURL('**/search?**sort=price_desc**');
    assert.equal(await page.getByLabel('Sort', { exact: true }).inputValue(), 'price_desc');
    await page.getByRole('link', { name: 'Next', exact: true }).click();
    await page.getByText('Page 2 of 2', { exact: true }).waitFor();
    await page.goBack();
    await page.getByText('Page 1 of 2', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Sort', { exact: true }).inputValue(), 'price_desc');
    await page.getByLabel('Date mode', { exact: true }).selectOption('separate');
    await page.getByLabel('Visit date 1', { exact: true }).fill(day);
    await page.getByRole('button', { name: 'Add date' }).click();
    await page.getByLabel('Visit date 2', { exact: true }).fill(second);
    await page.getByRole('button', { name: 'Show places' }).click();
    await page.getByRole('heading', { name: '13 places matching every selected date' }).waitFor();
    const firstSave = page.getByRole('button', { name: /^Save: Search place/ }).first();
    await firstSave.click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('rentra_guest_saved_v1') || '[]').length === 1);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('rentra_guest_saved_v1')));
    assert.deepEqual(saved[0].selection.dates, [day, second]);
    await page.getByLabel('Property name or locality').fill('no-such-place');
    await page.getByRole('button', { name: 'Show places' }).click();
    await page.getByText(/No places match these filters/).waitFor();
    await page.getByRole('link', { name: 'Clear all', exact: true }).click();
    await page.getByRole('heading', { name: '14 places', exact: true }).waitFor();
    await page.goto(origin + '/search?guests=bad');
    await page.getByRole('heading', { name: 'Check your filters' }).waitFor();
    await page.getByRole('link', { name: 'Reset filters and try again' }).click();
    await page.getByRole('heading', { name: '14 places', exact: true }).waitFor();
    await page.goto(origin + '/surat/farmhouse/with-pool');
    await page.waitForURL('**/surat/farmhouse/intent/with-pool');
    await page.getByRole('heading', { name: '1 place', exact: true }).waitFor();
    assert.match(await page.locator('meta[name="robots"]').getAttribute('content'), /noindex/);
    await page.goto(origin + '/surat/farmhouse/area/with-pool');
    await page.getByRole('heading', { name: 'Farmhouses in Pool District, Surat' }).waitFor();
    assert.equal((await page.goto(origin + '/surat/farmhouse/area/missing')).status(), 404);
    await page.goto(origin + '/search');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await page.getByRole('heading', { name: '14 places', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
  }
}
