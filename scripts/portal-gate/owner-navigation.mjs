import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { auditPage } from './browser-audit.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3122';
const output = new URL('../../docs/evidence/owner-phase2/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const results = [];
const postgres = require('../../../rentra-backend/node_modules/postgres');
const fixtureUrl = new URL(fixture.databaseUrl);
if (fixtureUrl.hostname !== '127.0.0.1' || !fixtureUrl.pathname.startsWith('/rentra_test_'))
  throw new Error('Disposable fixture required');
const sql = postgres(fixture.databaseUrl);
async function check(name, work) {
  await work();
  results.push(name);
  console.log('PASS', name);
}
try {
  for (const kind of ['owner', 'other']) {
    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
      reducedMotion: 'reduce',
    });
    await context.addCookies([{ name: 'rentra_session', value: fixture.tokens[kind], url: web }]);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(web + '/partner/help');
    await page.getByRole('navigation', { name: 'Owner primary navigation', exact: true }).waitFor();
    await check(kind + ' More sheet traps focus and closes on Escape', async () => {
      await page.getByRole('button', { name: 'More navigation' }).click();
      const dialog = page.getByRole('dialog', { name: 'Owner navigation', exact: true });
      await dialog.waitFor();
      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');
        assert.ok(await dialog.evaluate((el) => el.contains(document.activeElement)));
      }
      await page.keyboard.press('Escape');
      await dialog.waitFor({ state: 'hidden' });
    });
    await check(kind + ' bottom bar hides for on-screen keyboard', async () => {
      await page.evaluate(() => {
        Object.defineProperty(visualViewport, 'height', { configurable: true, value: 300 });
        visualViewport.dispatchEvent(new Event('resize'));
      });
      await page
        .getByRole('navigation', { name: 'Owner primary navigation', exact: true })
        .waitFor({ state: 'hidden' });
      await page.evaluate(() => {
        delete visualViewport.height;
        visualViewport.dispatchEvent(new Event('resize'));
      });
      await page
        .getByRole('navigation', { name: 'Owner primary navigation', exact: true })
        .waitFor();
    });
    if (kind === 'other') {
      await check('Pending tools lead to verification', async () => {
        await page.getByRole('button', { name: 'More navigation' }).click();
        await page
          .getByRole('button', {
            name: 'Calendar, bookings, earnings and more unlock after approval',
          })
          .click();
        const dialog = page.getByRole('dialog', { name: 'What unlocks after approval' });
        await dialog.waitFor();
        assert.match(
          await dialog.getByRole('link', { name: 'Continue verification' }).getAttribute('href'),
          /^\/partner/,
        );
        const next = await dialog
          .getByRole('link', { name: 'Continue verification' })
          .getAttribute('href');
        await dialog.getByRole('link', { name: 'Continue verification' }).click();
        await page.waitForURL(web + next);
      });
      await check('Applicant support form has only permitted topics', async () => {
        await page.goto(web + '/partner/support/new');
        assert.deepEqual(await page.locator('select[name="category"] option').allTextContents(), [
          'Something else',
          'Verification',
          'Account',
        ]);
      });
      await check('Applicant can submit a request and read the conversation', async () => {
        await page.locator('select[name="category"]').selectOption('verification');
        await page.getByLabel('Subject', { exact: true }).fill('Verification document question');
        await page
          .getByLabel('How can we help?', { exact: true })
          .fill('Please explain which document I should submit for verification.');
        await page.getByRole('button', { name: 'Send support request', exact: true }).click();
        await page.waitForURL(/\/partner\/support\/[0-9a-f-]+$/);
        await page.getByText('Verification document question', { exact: true }).waitFor();
      });
    }
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(web + '/partner/help');
      await page.getByRole('heading', { name: 'Owner guide', exact: true }).waitFor();

      await check(kind + ' no overflow at ' + width, async () =>
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)),
      );
      if ([360, 1440].includes(width)) {
        await page.screenshot({
          path: new URL(`${kind}-${width}.png`, output).pathname,
          fullPage: true,
        });
        await check(kind + ' accessibility at ' + width, async () => {
          const audit = await auditPage(page);
          const failures = audit.violations.filter((v) =>
            ['serious', 'critical'].includes(v.impact),
          );
          assert.deepEqual(
            failures.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
            [],
          );
        });
      }
    }
    await check(kind + ' no client runtime errors', async () => assert.deepEqual(errors, []));
    if (kind === 'owner') {
      for (const route of [
        '/partner',
        '/partner/calendar',
        '/partner/bookings',
        '/partner/listings',
        '/partner/reviews',
        '/partner/team',
        '/partner/earnings',
        '/partner/earnings/statements',
        '/partner/payouts',
        '/partner/settings/payout',
        '/partner/finance',
        '/partner/disputes',
        '/partner/settings',
        '/partner/updates',
      ]) {
        await check('Legacy and destination route ' + route, async () => {
          const response = await page.goto(web + route);
          assert.equal(response.status(), 200);
          assert.equal(
            await page.locator('aside nav a[aria-current="page"]').count(),
            route === '/partner/updates' ? 0 : 1,
          );
        });
      }
    }
    if (kind === 'owner') {
      await check('Counts outage leaves navigation usable without badges', async () => {
        await sql`ALTER TABLE client_update RENAME TO fixture_client_update`;
        try {
          await page.goto(web + '/partner/help');
          await page.getByRole('heading', { name: 'Owner guide', exact: true }).waitFor();
          assert.equal(await page.locator('#owner-inbox-count').textContent(), '');
          assert.equal(await page.locator('aside nav a').count(), 9);
        } finally {
          await sql`ALTER TABLE fixture_client_update RENAME TO client_update`;
        }
      });
    }
    await context.close();
  }
  await writeFile(new URL('checks.json', output), JSON.stringify(results, null, 2) + '\n');
} finally {
  await browser.close();
  await sql.end();
}
