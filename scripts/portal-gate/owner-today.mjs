import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { auditPage } from './browser-audit.mjs';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const database = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname.startsWith('/rentra_test_'),
);
const web = process.env.GATE_WEB_ORIGIN || 'http://127.0.0.1:3143';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({
    viewport: { width: 360, height: 850 },
    reducedMotion: 'reduce',
  }),
  page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [],
  checks = [];
page.on('pageerror', (e) => errors.push(e.message));
const cookie = async (kind) => {
  await context.clearCookies();
  await context.addCookies([{ name: 'rentra_session', value: fixture.tokens[kind], url: web }]);
};
async function check(name, work) {
  await work();
  checks.push(name);
  console.log('PASS', name);
}
const output = new URL('../../docs/evidence/owner-phase4/', import.meta.url);
await mkdir(output, { recursive: true });
try {
  await cookie('owner');
  await page.goto(web + '/partner');
  await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
  await check(
    '40 visits reconcile with Bookings and the dashboard preview stays compact',
    async () => {
      const tile = page.locator('article').filter({ hasText: "Today's visits" });
      await tile.getByText('40', { exact: true }).waitFor();
      const table = page.getByRole('region', { name: "Today's visits", exact: true });
      assert.ok((await table.locator('tbody tr').count()) <= 8);
      await table.locator('..').getByRole('link', { name: 'View all', exact: true }).click();
      await page.getByText('40 visits found', { exact: true }).waitFor();
      await page.goto(web + '/partner');
      await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
    },
  );
  await check('approved dashboard fits 360,390,768,1024,1440 and passes axe', async () => {
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      const audit = await auditPage(page);
      assert.deepEqual(
        audit.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => v.id),
        [],
      );
    }
    await page.setViewportSize({ width: 360, height: 850 });
    await page.screenshot({
      path: new URL('today-360.png', output).pathname.replace(/^\/([A-Z]:)/, '$1'),
      fullPage: true,
    });
  });
  await check('each Today section fails independently and Retry restores it', async () => {
    for (const [section, title] of [
      ['needsYou', 'Needs your attention · all properties'],
      ['visits', "Today's visits · all properties"],
      ['week', 'This week · all properties'],
      ['earnings', 'Earnings'],
      ['properties', 'Recently updated properties'],
    ]) {
      await fetch('http://127.0.0.1:4143/__fixture/failure?section=' + section, { method: 'POST' });
      await page.reload();
      await page
        .getByRole('alert')
        .filter({ hasText: title + ' could not load.' })
        .waitFor();
      await page.getByRole('heading', { name: 'Dashboard', exact: true }).waitFor();
      assert.equal(await page.getByRole('alert').filter({ hasText: 'could not load' }).count(), 1);
      await fetch('http://127.0.0.1:4143/__fixture/failure', { method: 'POST' });
      await page
        .getByRole('alert')
        .filter({ hasText: title + ' could not load.' })
        .getByRole('button')
        .click();
      await page
        .getByRole('alert')
        .filter({ hasText: title + ' could not load.' })
        .waitFor({ state: 'hidden' });
    }
  });
  await check('zero-data owner has setup guidance and empty tables', async () => {
    await cookie('zero');
    await page.goto(web + '/partner');
    await page.getByText('Get ready for bookings', { exact: false }).first().waitFor();
    await page.getByText('No guests today.', { exact: true }).waitFor();
    await page.getByText('No bookings match the selected filters.', { exact: true }).waitFor();
    assert.equal(await page.getByText('Total properties', { exact: true }).count(), 0);
  });
  await check(
    'pending home has verification, requirements, draft CTA and contact strip',
    async () => {
      await cookie('pending');
      await page.goto(web + '/partner');
      await page.getByRole('heading', { name: 'Get verified', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'What you’ll need', exact: true }).waitFor();
      await page.getByRole('heading', { name: 'Contact Rentra', exact: true }).waitFor();
      await page.getByRole('link', { name: 'Start your property draft', exact: true }).waitFor();
      assert.equal(
        await page.getByRole('heading', { name: 'Latest updates', exact: true }).count(),
        0,
      );
      const audit = await auditPage(page);
      assert.deepEqual(
        audit.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => v.id),
        [],
      );
    },
  );
  assert.deepEqual(errors, []);
  await writeFile(
    new URL('browser-checks.json', output),
    JSON.stringify(
      { checks, errors, fixture: 'disposable localhost API/database; 40 bookings' },
      null,
      2,
    ) + '\n',
  );
} catch (e) {
  console.log('FAILED PAGE', page.url(), (await page.locator('body').innerText()).slice(-3000));
  throw e;
} finally {
  await browser.close();
}
