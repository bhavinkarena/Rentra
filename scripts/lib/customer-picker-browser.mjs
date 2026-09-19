import { formatLocalDate, addLocalDays } from '../../lib/domain/booking-dates.js';
import { formatINRMinor } from '../../lib/domain/booking-money.js';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
export async function verifyPickerBrowser({ sql, databaseUrl, day, second, listingId, expected, tenDates, tenQuote }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3198';
  const log = openSync(join(tmpdir(), 'rentra-part10-browser-server.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3198'], { env: { ...process.env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: 'part10-browser-only-secret-at-least-32-characters', CUSTOMER_OTP_DELIVERY: 'development' }, windowsHide: true, stdio: ['ignore', log, log] });
  closeSync(log);
  let browser;
  try {
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Fixture server exited'); try { if ((await fetch(origin + '/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless: true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? { executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE } : {}) });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/Los_Angeles' });
    page.setDefaultTimeout(60000);
    const url = origin + '/listing/picker-picker01?dates=' + day + ',' + second + '&slot=day&guests=10';
    await page.clock.install();
    await page.goto(url);
    const summary = page.locator('#booking-summary');
    await summary.locator('[data-quote-total]').waitFor();
    assert.equal(await summary.locator('[data-quote-total]').textContent(), formatINRMinor(expected.totals.totalMinor));
    const selected = page.getByRole('list', { name: 'Selected visits', exact: true });
    assert.equal(await selected.getByRole('button').count(), 2);
    await page.reload();
    await summary.locator('[data-quote-total]').waitFor();
    assert.equal(await selected.getByRole('button').count(), 2);
    assert.equal(await page.getByLabel('Guests per visit', {exact:true}).inputValue(), '10');
    await page.getByRole('button', {name:'Next month',exact:true}).click();
    assert.equal(await selected.getByRole('button').count(),2);
    await page.getByRole('button', {name:'Previous month',exact:true}).click();
    await page.getByLabel('Guests per visit', {exact:true}).fill('13');
    await summary.getByRole('alert').waitFor();
    await page.getByLabel('Guests per visit', {exact:true}).fill('10');
    await summary.locator('[data-quote-total]').waitFor();
    await page.getByRole('group',{name:'Visit type',exact:true}).getByRole('button',{name:'Overnight',exact:true}).click();
    await summary.locator('[data-quote-total]').waitFor();
    assert.ok((await summary.textContent()).includes('IST'));
    assert.ok((await summary.textContent()).includes('7:00 pm'));
    assert.equal(await selected.getByRole('button').count(),2);
    await page.getByRole('group',{name:'Visit type',exact:true}).getByRole('button',{name:'Day picnic',exact:true}).click();
    await summary.locator('[data-quote-total]').waitFor();
    await page.getByLabel('Date mode', { exact: true }).selectOption('consecutive');
    async function clickDate(date) {
      // Navigate without resetting the selected visits.
      for(let i=0;i<4 && !await page.locator(`[data-visit-date="${date}"]`).count();i++) await page.getByRole('button',{name:'Next month',exact:true}).click();
      await page.locator(`[data-visit-date="${date}"]`).click();
    }
    await clickDate(day); await clickDate(second);
    await summary.getByRole('alert').waitFor();
    assert.equal(await selected.getByRole('button').count(), 3);
    await selected.getByRole('button', { name: 'Remove ' + formatLocalDate(addLocalDays(day,1)), exact:true }).click();
    assert.equal(await page.getByLabel('Date mode', {exact:true}).inputValue(),'separate');
    await summary.locator('[data-quote-total]').waitFor();
    await summary.getByRole('button',{name:'Review booking',exact:true}).click();
    await sql`INSERT INTO booking_price_override(rentable_id,day,slot,rent_minor) VALUES (${listingId},${day},'day',500000)`;
    // Advancing the browser clock expires the displayed quote without changing the database clock.
    await page.clock.fastForward(16*60*1000);
    await summary.getByText('Price or visit details changed. Review the updated quote before continuing.',{exact:true}).waitFor();
    await summary.getByRole('button',{name:'Review booking',exact:true}).waitFor();
    assert.notEqual(await summary.locator('[data-quote-total]').textContent(), formatINRMinor(expected.totals.totalMinor));
    await summary.getByRole('button',{name:'Review booking',exact:true}).click();
    await page.setViewportSize({width:360,height:800});
    await page.locator('#availability').scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View summary',exact:true}).click();
    await page.getByRole('dialog',{name:'Your visits'}).getByRole('button',{name:'Continue with login',exact:true}).click();
    await page.waitForURL('**/login');
    await page.waitForFunction(() => document.body.style.overflow !== 'hidden');
    await page.getByLabel(/Mobile number/i).fill('9876543290');
    await page.getByRole('button',{name:/Send code/i}).click();
    await page.getByLabel(/One-time code/i).fill('123456');
    await page.getByRole('button',{name:'Log in',exact:true}).click();
    await page.waitForURL('**/onboarding');
    await page.getByLabel(/Your name/i).fill('Picker Customer');
    await page.getByRole('button',{name:/Continue/i}).click();
    await page.waitForURL('**/listing/picker-picker01**');
    await summary.locator('[data-quote-total]').waitFor();
    assert.equal(await selected.getByRole('button').count(),2);
    const [owned] = await sql`SELECT selection FROM booking_quote WHERE rentable_id=${listingId} AND customer_id IS NOT NULL ORDER BY created_at DESC LIMIT 1`;
    assert.deepEqual(owned.selection.dates, [day,second]);
    assert.equal(owned.selection.guests,10);
    await page.locator('#availability').scrollIntoViewIfNeeded();
    await page.getByRole('button',{name:'View summary',exact:true}).click();
    const dialog=page.getByRole('dialog',{name:'Your visits'});
    await dialog.waitFor();
    assert.equal(await dialog.locator('[data-quote-total]').textContent(),await summary.locator('[data-quote-total]').textContent());
    for(let i=0;i<6;i++) {
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    }
    for(let i=0;i<6;i++) {
      await page.keyboard.press('Shift+Tab');
      assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true);
    }
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button',{name:'View summary'}).evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.getByRole('button',{name:'View summary',exact:true}).click();
    await dialog.getByRole('button',{name:'Edit dates',exact:true}).click();
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Date mode');
    await page.locator(`[data-visit-date="${day}"]`).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(date=>document.activeElement?.dataset.visitDate===date,addLocalDays(day,1));
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.goto(origin + '/listing/picker-picker01?dates=' + tenDates.join(',') + '&slot=day&guests=10');
    await summary.locator('[data-quote-total]').waitFor();
    assert.equal(await selected.getByRole('button').count(),10);
    assert.equal(await summary.locator('[data-quote-total]').textContent(),formatINRMinor(tenQuote.totals.totalMinor));
    await clickDate(addLocalDays(tenDates.at(-1),1));
    await page.getByRole('status').filter({hasText:'You can choose up to 10 visits'}).waitFor();
    assert.equal(await selected.getByRole('button').count(),10);
    await page.getByRole('button',{name:'Clear dates',exact:true}).click();
    assert.equal(await selected.getByRole('button').count(),0);
    await summary.getByText('Choose dates to see your total.',{exact:true}).waitFor();
  } finally {
    if (browser) await browser.close();
    if (server.exitCode === null) { server.kill('SIGTERM'); await once(server, 'exit'); }
  }
}
