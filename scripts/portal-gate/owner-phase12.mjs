import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { auditPage } from './browser-audit.mjs';

/**
 * Phase 12/14 browser gate: axe on owner routes (zero serious/critical),
 * focus after client navigation (DS-06) and the shell-wide unsaved guard (DS-07).
 * Same fixture API and Next setup as owner-phase11.mjs.
 */
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const fixture = JSON.parse(await readFile(process.env.CP06_GATE_FIXTURE, 'utf8'));
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3107';
const out = new URL('../../docs/evidence/owner-phase12/', import.meta.url);
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: 'reduce',
});
await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const listing = `listings/${fixture.ids.listing}`;
const routes = [
  '',
  'calendar',
  'bookings',
  'listings',
  `${listing}/overview`,
  `${listing}/calendar`,
  'earnings',
  'updates',
  'reviews',
  'team',
  'help',
  'support/new',
  'settings',
  'settings/payout',
];

const axe = [];
for (const route of routes) {
  await page.goto(`${web}/partner/${route}`, { waitUntil: 'networkidle' });
  const result = await auditPage(page, '#portal-main');
  const serious = result.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  axe.push({ route, serious: serious.map((v) => `${v.id} (${v.nodes.length})`) });
  console.log(
    `${serious.length ? 'FAIL' : 'PASS'} axe /partner/${route} ${serious.map((v) => v.id).join(' ')}`,
  );
}

// DS-06: a sidebar navigation lands focus on the new page's h1.
await page.goto(`${web}/partner`, { waitUntil: 'networkidle' });
await page.locator('aside nav a[href="/partner/bookings"]').click();
await page.waitForURL(/\/partner\/bookings$/);
await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
const focus = await page.evaluate(() => document.activeElement.textContent.trim());
console.log(`PASS focus after navigation -> h1 "${focus}"`);

// DS-07: Back is held while a settings form is dirty; cancelling keeps the page and input.
await page.goto(`${web}/partner/settings`, { waitUntil: 'networkidle' });
const field = page
  .locator(
    '#portal-main form:not([method="get"]) :is(input:not([type]), input[type="text"]):not([readonly]):not([disabled])',
  )
  .first();
await field.fill(`${(await field.inputValue()) || ''} edited`);
let prompts = 0;
page.once('dialog', (dialog) => {
  prompts += 1;
  dialog.dismiss();
});
await page.goBack().catch(() => {}); // Pops only the guard entry.
await page.waitForTimeout(500);
assert.equal(prompts, 1, 'Back on a dirty form asks first');
assert.match(page.url(), /\/partner\/settings$/);
assert.match(await field.inputValue(), /edited$/);
console.log('PASS dirty form: Back asks and cancel keeps the edit');

// A link click on the dirty form asks too; accepting leaves.
page.once('dialog', (dialog) => {
  prompts += 1;
  dialog.accept();
});
await page.locator('aside nav a[href="/partner/bookings"]').click();
await page.waitForURL(/\/partner\/bookings$/);
assert.equal(prompts, 2);
console.log('PASS dirty form: link asks, accept leaves');

// Clean pages never ask.
page.once('dialog', () => {
  prompts += 1;
});
await page.locator('aside nav a[href="/partner/calendar"]').click();
await page.waitForURL(/\/partner\/calendar$/);
await page.goBack();
await page.waitForURL(/\/partner\/bookings$/);
assert.equal(prompts, 2, 'clean pages navigate without a prompt');
console.log('PASS clean pages: no prompt on link or Back');

// Filter forms (URL action / GET) are navigation, not unsaved work.
await page.goto(`${web}/partner/earnings`, { waitUntil: 'networkidle' });
const filter = page
  .locator('#portal-main form[method="get"] select, #portal-main form[method="get"] input')
  .first();
await filter.evaluate((el) => el.dispatchEvent(new Event('input', { bubbles: true })));
page.once('dialog', (dialog) => {
  prompts += 1;
  dialog.dismiss();
});
await page.locator('aside nav a[href="/partner/bookings"]').click();
await page.waitForURL(/\/partner\/bookings$/);
assert.equal(prompts, 2, 'a changed filter never asks');
console.log('PASS filter form: no prompt');

await browser.close();
const failed = axe.filter((r) => r.serious.length);
await writeFile(new URL('results.json', out), JSON.stringify({ axe, focus, errors }, null, 2));
console.log(JSON.stringify({ routes: axe.length, axeFailures: failed.length, errors }));
if (failed.length || errors.length) process.exit(1);
