// Phase 6 browser gate: properties list, property hub tabs, trust-edit warnings, pause and Fix links.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
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
const { listing: live, sentBack } = fixture.ids;
assert.ok(sentBack, 'start the fixture with OWNER_FIXTURE_HUB=1');
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3143';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({
    viewport: { width: 360, height: 800 },
    reducedMotion: 'reduce',
  }),
  page = await context.newPage();
page.setDefaultTimeout(90000);
const errors = [],
  checks = [],
  violations = [];
page.on('pageerror', (e) => errors.push(e.message));
await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqPhfDwAEZwHbFp3YPgAAAABJRU5ErkJggg==',
  'base64',
);
await context.route(/^https:\/\/(res\.cloudinary\.com|images\.unsplash\.com)\//, (route) =>
  route.fulfill({ body: png, contentType: 'image/png' }),
);
const output = new URL('../../docs/evidence/owner-phase6/', import.meta.url);
await mkdir(output, { recursive: true });
const shot = (name) =>
  page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)), fullPage: true });
async function check(name, work) {
  await work();
  checks.push(name);
  console.log('PASS', name);
}
async function fits(label) {
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
      `${label} scrolls sideways at ${width}px`,
    );
    const result = await auditPage(page);
    violations.push(
      ...result.violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => ({ page: label, width, id: v.id, nodes: v.nodes.length })),
    );
  }
  await page.setViewportSize({ width: 360, height: 800 });
}
const hub = (id, tab = 'overview') =>
  `${web}/partner/listings/${id}${{ overview: '/overview', edit: '', calendar: '/calendar', photos: '/photos', reviews: '/reviews', activity: '/activity' }[tab]}`;
const badge = () => page.locator('header h1 + span').first();
try {
  await check('Properties list: segmented filters, cards and state actions', async () => {
    await page.goto(web + '/partner/listings');
    await page.getByRole('group', { name: 'Filter by status' }).waitFor();
    await page.getByRole('link', { name: /Open calendar.*Review River Farm/ }).waitFor();
    await page.getByText('Live, no open dates').waitFor();
    await page.getByRole('link', { name: /Fix.*Sent Back Farm/ }).waitFor();
    await fits('properties');
    await shot('properties-360');
    await page.getByRole('button', { name: /^Needs you/ }).click();
    await page.waitForURL(/status=needs_you/);
    await page.getByRole('link', { name: /Fix.*Sent Back Farm/ }).waitFor();
    await page.getByRole('link', { name: /Open calendar.*Review River Farm/ }).waitFor();
  });
  await check('Overview: hub header, timeline, one next step and strength', async () => {
    await page.goto(hub(live));
    await page.getByRole('navigation', { name: 'Property sections' }).waitFor();
    assert.equal(
      await page.getByRole('navigation', { name: 'Property sections' }).getByRole('link').count(),
      6,
    );
    await page.getByText("Live, no open dates — guests can't book yet.").waitFor();
    await page.getByRole('img', { name: /Property strength \d+%/ }).waitFor();
    await page.getByRole('link', { name: 'Add 10 or more photos' }).waitFor();
    await fits('overview');
    await shot('overview-360');
  });
  await check('Every tab opens inside the hub', async () => {
    for (const [tab, text] of [
      ['edit', 'You can change these any time:'],
      ['calendar', 'Booking calendar'],
      ['photos', /of 6 minimum/],
      ['reviews', 'Guest reviews'],
      ['activity', 'Prices and policies'],
    ]) {
      await page.goto(hub(live, tab));
      await page.getByText(text).first().waitFor();
      assert.equal(
        await page.locator('nav[aria-label="Property sections"] [aria-current="page"]').count(),
        1,
      );
      await fits(tab);
    }
  });
  await check('A free edit saves without a warning', async () => {
    await page.goto(hub(live, 'edit'));
    const basics = page.locator('#section-basics');
    await basics
      .getByLabel('Description')
      .fill(
        'A quiet farmhouse with enough description for a complete review submission, now with a mango orchard.',
      );
    await basics.getByRole('button', { name: 'Save' }).click();
    await basics.getByText('Saved').waitFor();
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal((await badge().innerText()).trim(), 'Live');
  });
  await check('Pause until a date shows the banner; Resume takes bookings again', async () => {
    await page.goto(hub(live));
    await page.getByRole('button', { name: 'Pause bookings' }).click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByText('Until a date').click();
    const until = await dialog.locator('input[type=date]').getAttribute('min');
    await dialog.locator('input[type=date]').fill(until);
    await fits('pause dialog');
    await dialog.getByRole('button', { name: 'Pause bookings' }).click();
    await page.getByRole('status').filter({ hasText: 'Paused by you until' }).waitFor();
    await shot('paused-360');
    await page.getByRole('button', { name: 'Resume bookings' }).click();
    await page.getByRole('button', { name: 'Pause bookings' }).waitFor();
    assert.equal((await badge().innerText()).trim(), 'Live');
  });
  await check('A trust edit asks first; Cancel saves nothing', async () => {
    await page.goto(hub(live, 'edit'));
    const basics = page.locator('#section-basics');
    await basics.getByLabel('Title').fill('Review River Farm with orchard');
    await basics.getByRole('button', { name: 'Save' }).click();
    const dialog = page.locator('dialog[open]');
    await dialog.getByText(/Changing the title needs a quick Rentra review/).waitFor();
    await fits('trust dialog');
    await shot('trust-dialog-360');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await page.reload();
    assert.equal((await badge().innerText()).trim(), 'Live');
    assert.equal(
      await page.locator('#section-basics').getByLabel('Title').inputValue(),
      'Review River Farm',
    );
  });
  await check(
    'Confirming the trust edit sends it to review; the next save warns about review',
    async () => {
      const basics = page.locator('#section-basics');
      await basics.getByLabel('Title').fill('Review River Farm with orchard');
      await basics.getByRole('button', { name: 'Save' }).click();
      await page
        .locator('dialog[open]')
        .getByRole('button', { name: 'Save and send for review' })
        .click();
      await basics.getByText('Saved').waitFor();
      await page.reload();
      assert.equal((await badge().innerText()).trim(), 'In review');
      const capacity = page.locator('#section-capacity');
      await capacity.getByLabel('Maximum guests').fill('14');
      await capacity.getByRole('button', { name: 'Save' }).click();
      await page
        .locator('dialog[open]')
        .getByText(/submit the property again/)
        .waitFor();
      await page.locator('dialog[open]').getByRole('button', { name: 'Cancel' }).click();
    },
  );
  await check('Sent back: one sentence, Fix now lands on the flagged wizard step', async () => {
    await page.goto(hub(sentBack));
    assert.equal((await badge().innerText()).trim(), 'Needs changes');
    await page.getByText(/Rentra asked for 2 changes: photos; title and description/).waitFor();
    await fits('sent back overview');
    await shot('sent-back-360');
    await page.getByRole('link', { name: 'Fix now' }).click();
    await page.waitForURL(/\/setup\/photos#field-first$/);
    await page.getByText('Rentra asked you to change this step.').waitFor();
  });
  await check('Resubmitting without changes asks first', async () => {
    await page.goto(hub(sentBack));
    await page.getByRole('button', { name: 'Submit again' }).click();
    await page.locator('dialog[open]').getByText('Submit without changes?').waitFor();
    await page.locator('dialog[open]').getByRole('button', { name: 'Cancel' }).click();
    assert.equal((await badge().innerText()).trim(), 'Needs changes');
  });
  assert.deepEqual(errors, []);
  assert.deepEqual(violations, []);
} catch (error) {
  await shot('failure').catch(() => {});
  throw error;
} finally {
  await writeFile(
    new URL('browser-checks.json', output),
    JSON.stringify({ checks, errors, violations }, null, 2),
  );
  await browser.close();
}
