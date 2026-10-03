import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import { auditPage } from './browser-audit.mjs';
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const evidence = process.env.OWNER_UI_EVIDENCE_DIR || join(tmpdir(), 'rentra-owner-workspace-ui');
await mkdir(evidence, { recursive: true });
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const f = JSON.parse(await readFile(process.env.OWNER_COMMUNICATIONS_FIXTURE));
const database = new URL(f.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname.startsWith('/rentra_test_'),
  'Disposable local fixture required',
);
const origin = process.env.GATE_WEB_ORIGIN || 'http://localhost:3149';
assert.ok(
  ['localhost', '127.0.0.1'].includes(new URL(origin).hostname),
  'Local browser fixture required',
);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const results = [],
  errors = [];
async function check(name, run) {
  try {
    await run();
    results.push({ name, ok: true });
    console.log('PASS', name);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log('FAIL', name, e.message);
  }
}
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await context.addCookies([{ name: 'rentra_session', value: f.tokens.owner, url: origin }]);
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
page.setDefaultTimeout(20000);
const go = async (path) => {
  await page.goto(origin + path, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('nextjs-portal').filter({ hasText: 'error' }).count(), 0);
};
try {
  for (const width of [1280, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      '/partner',
      '/partner/calendar',
      '/partner/bookings?tab=all',
      '/partner/listings',
      '/partner/reviews?tab=all',
      '/partner/support',
      '/partner/disputes',
      '/partner/team',
      '/partner/updates',
      '/partner/search?q=River',
      '/partner/earnings',
      '/partner/earnings/statements',
      '/partner/settings/security',
      '/partner/settings/privacy',
      '/partner/settings/calendar-sync',
      `/partner/listings/${f.ids.listing}/activity`,
    ]) {
      await check(`${width}px ${route} table and accessibility`, async () => {
        await go(route);
        await page.locator('main table').first().waitFor();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
          'Page overflows',
        );
        assert.equal(
          await page
            .locator('a,button')
            .filter({ hasText: /^\s*\?\s*$/ })
            .count(),
          0,
        );
        const issues = (await auditPage(page)).violations;
        assert.deepEqual(
          issues.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
        );
        await page.screenshot({
          path: `${evidence}/owner-ui-${width}-${route.split('?')[0].split('/').pop() || 'dashboard'}.png`,
          fullPage: true,
        });
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await check('global header search finds records in different sections', async () => {
    await go('/partner');
    const search = page.locator('header [role=search]');
    assert.equal(await search.getByRole('button', { name: 'Search', exact: true }).count(), 0);
    await search.getByRole('searchbox').fill('Ri');
    assert.equal(await search.getByRole('group', { name: 'Search filters' }).count(), 0);
    await search.getByRole('searchbox').fill('River');
    await search.getByRole('region', { name: 'Booking results' }).waitFor();
    await search.getByRole('region', { name: 'Property results' }).waitFor();
    const result = search.getByRole('link').first();
    const href = await result.getAttribute('href');
    await result.click();
    await page.waitForURL((url) => url.pathname + url.search === href);
    await search.getByRole('searchbox').fill('cal');
    await search.getByRole('link', { name: 'Calendar', exact: true }).click();
    await page.waitForURL(/\/partner\/calendar$/);
  });
  await check('booking View opens complete detail modal and Escape preserves filters', async () => {
    await go('/partner/bookings?tab=all');
    const href = await page
      .getByRole('region', { name: 'Bookings', exact: true })
      .getByRole('link', { name: /View booking/ })
      .first()
      .getAttribute('href');
    await page.locator(`a[href="${href}"]`).click();
    const modal = page.getByRole('dialog', { name: 'Booking details', exact: true });
    await modal.waitFor();
    await modal.getByRole('heading', { name: 'Your guest', exact: true }).waitFor();
    await modal.getByRole('heading', { name: 'Visits', exact: true }).waitFor();
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const issues = (await auditPage(page)).violations;
    assert.deepEqual(
      issues.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      [],
    );
    await page.screenshot({ path: join(evidence, 'owner-ui-booking-modal.png'), fullPage: true });
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' });
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'all');
    assert.equal(new URL(page.url()).searchParams.has('booking'), false);
  });
  await check('calendar begins with only properties, property opens month in modal', async () => {
    await go('/partner/calendar');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal(
      await page.getByRole('region', { name: 'Property calendar', exact: true }).count(),
      0,
    );
    await page
      .getByRole('link', { name: /View calendar for/ })
      .first()
      .click();
    const modal = page.getByRole('dialog').first();
    await modal.waitFor();
    await modal.getByRole('region', { name: 'Property calendar', exact: true }).waitFor();
    assert.equal(await modal.locator('select[name=view]').inputValue(), 'month');
    assert.equal(new URL(page.url()).searchParams.get('property'), f.ids.listing);
    const issues = (await auditPage(page)).violations;
    assert.deepEqual(
      issues.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
      [],
    );
    await page.screenshot({ path: join(evidence, 'owner-ui-calendar-modal.png'), fullPage: true });
    await modal.getByRole('link', { name: 'Next', exact: true }).click();
    await page.waitForLoadState('networkidle');
    assert.equal(new URL(page.url()).searchParams.get('property'), f.ids.listing);
    assert.equal(await page.getByRole('dialog').first().isVisible(), true);
    await page
      .getByRole('dialog')
      .first()
      .getByRole('link', { name: /Close / })
      .click();
    await page.getByRole('dialog').first().waitFor({ state: 'hidden' });
  });
  for (const width of [360, 1280])
    await check(`${width}px calendar date detail and nested dialog`, async () => {
      await page.setViewportSize({ width, height: 900 });
      await go(`/partner/calendar?property=${f.ids.listing}`);
      const outer = page.locator('dialog[data-owner-modal]');
      await outer.waitFor();
      await outer
        .locator(width === 360 ? '[data-mini-day]' : '[data-calendar-day]')
        .nth(10)
        .click();
      const inner = page.locator('dialog[data-calendar-detail]');
      await inner.waitFor();
      await inner.getByRole('button', { name: 'Close date detail' }).waitFor();
      await inner.getByText(/Loading date/).waitFor({ state: 'hidden' });
      const violations = (await auditPage(page)).violations;
      assert.deepEqual(
        violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        [],
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.keyboard.press('Escape');
      await inner.waitFor({ state: 'hidden' });
      assert.equal(await outer.isVisible(), true);
      await page.keyboard.press('Escape');
      await outer.waitFor({ state: 'hidden' });
    });
  await check('calendar property search filters records', async () => {
    await go('/partner/calendar');
    await page.getByRole('searchbox', { name: 'Find a property' }).fill('nomatchingproperty');
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByText('0 properties found', { exact: true }).waitFor();
    assert.equal(await page.getByRole('link', { name: /View calendar for/ }).count(), 0);
  });
  await check('dashboard filters use saved property and date parameters', async () => {
    await go('/partner');
    const form = page.locator('form').filter({ has: page.locator('select[name=tab]') });
    await form.locator('select[name=property]').selectOption(f.ids.listing);
    await form.locator('input[name=from]').fill('2099-01-01');
    await form.locator('input[name=to]').fill('2099-01-02');
    await form.getByRole('button', { name: 'Apply filters' }).click();
    await page.getByText('No bookings match the selected filters.', { exact: true }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('property'), f.ids.listing);
    await page.getByRole('link', { name: 'Reset', exact: true }).click();
    await page
      .getByRole('region', { name: 'Dashboard bookings' })
      .locator('tbody tr')
      .first()
      .waitFor();
  });
  await check('review table keeps reply action functional', async () => {
    await go('/partner/reviews?tab=all');
    await page
      .locator('summary')
      .filter({ hasText: /^(Reply|Manage reply)$/ })
      .click();
    await page
      .getByRole('textbox', { name: 'Your public reply' })
      .fill('Thank you for your feedback. We appreciate your visit.');
    await page.getByRole('button', { name: /^(Post reply|Save reply)$/ }).click();
    await page.getByRole('button', { name: 'Save reply', exact: true }).waitFor();
    assert.equal(await page.getByText('Replied', { exact: true }).count(), 1);
  });
  if (f.money)
    await check(
      'populated earnings and print tables preserve rent and refund evidence',
      async () => {
        await go(`/partner/earnings?month=${f.money.period}&environment=live`);
        const table = page.getByRole('region', { name: 'Rent by visit' });
        assert.ok((await table.locator('tbody tr').count()) > 0);
        await table.getByText('₹1,000', { exact: true }).first().waitFor();
        assert.match(
          await table.locator('tbody tr').first().locator('td').nth(4).innerText(),
          /^₹200/,
        );
        await go(`/partner/earnings/print?month=${f.money.period}&environment=live`);
        await page.emulateMedia({ media: 'print' });
        assert.equal(await page.locator('.portal-ui > aside').isVisible(), false);
        await page.pdf({
          path: join(evidence, 'owner-ui-statement.pdf'),
          format: 'A4',
          printBackground: true,
        });
        await page.emulateMedia({ media: 'screen' });
      },
    );
  await check('mobile booking detail stays inside the viewport', async () => {
    await page.setViewportSize({ width: 360, height: 900 });
    await go(`/partner/bookings?tab=all&booking=${f.booking.order}`);
    const modal = page.getByRole('dialog', { name: 'Booking details' });
    await modal.waitFor();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(
      (await auditPage(page)).violations.map((v) => v.id),
      [],
    );
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' });
  });
  await check('booking modal protects a private note when closing', async () => {
    await go(`/partner/bookings?tab=all&booking=${f.booking.order}`);
    const modal = page.getByRole('dialog', { name: 'Booking details' });
    await modal.waitFor();
    await modal
      .getByRole('textbox', { name: 'Private note (owner and assigned caretakers only)' })
      .fill('Unsaved fixture note');
    page.once('dialog', (d) => void d.dismiss());
    await page.keyboard.press('Escape');
    assert.equal(await modal.isVisible(), true);
    page.once('dialog', (d) => void d.accept());
    await page.keyboard.press('Escape');
    await modal.waitFor({ state: 'hidden' });
  });
  await check('calendar date modal protects an unsaved block reason', async () => {
    await go(`/partner/calendar?property=${f.ids.listing}`);
    await page.locator('dialog[data-owner-modal]').waitFor();
    await page.locator('[data-mini-day]').nth(10).click();
    const detail = page.locator('dialog[data-calendar-detail]');
    await detail.waitFor();
    await detail.getByText('Block an exact period', { exact: true }).click();
    await detail
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Unsaved fixture block reason');
    page.once('dialog', (d) => void d.dismiss());
    await page.keyboard.press('Escape');
    assert.equal(await detail.isVisible(), true);
    page.once('dialog', (d) => void d.accept());
    await page.keyboard.press('Escape');
    await detail.waitFor({ state: 'hidden' });
    assert.equal(await page.locator('dialog[data-owner-modal]').isVisible(), true);
    await page.keyboard.press('Escape');
    await page.locator('dialog[data-owner-modal]').waitFor({ state: 'hidden' });
  });
  await check('applicant global search cannot find another owner records', async () => {
    const applicant = await browser.newContext();
    await applicant.addCookies([{ name: 'rentra_session', value: f.tokens.other, url: origin }]);
    const p = await applicant.newPage();
    await p.goto(origin + '/partner/search?q=River', { waitUntil: 'networkidle' });
    await p.getByText('0 results for “River”', { exact: true }).waitFor();
    await applicant.close();
  });
  assert.deepEqual(errors, []);
} finally {
  await writeFile(
    join(evidence, 'owner-ui-browser-results.json'),
    JSON.stringify({ results, errors }, null, 2),
  );
  await browser.close();
}
if (results.some((r) => !r.ok) || errors.length) process.exitCode = 1;
