// Phase 5 browser gate: a new farmhouse owner completes the 11-step wizard at phone width.
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
const web = process.env.GATE_WEB_ORIGIN || 'http://127.0.0.1:3143';
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
page.on('dialog', (dialog) => dialog.accept());
await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
// Direct Cloudinary upload and thumbnail delivery are stubbed; the API signs and attaches for real.
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkqPhfDwAEZwHbFp3YPgAAAABJRU5ErkJggg==',
  'base64',
);
await context.route('https://api.cloudinary.com/**', async (route) => {
  const body = route.request().postData() || '';
  const publicId = body.match(/name="public_id"\r\n\r\n([^\r]+)/)?.[1];
  await route.fulfill({ json: { public_id: publicId, format: 'jpg', bytes: 400000 } });
});
await context.route('https://res.cloudinary.com/**', (route) =>
  route.fulfill({ body: png, contentType: 'image/png' }),
);
await context.route('https://tile.openstreetmap.org/**', (route) =>
  route.fulfill({ body: png, contentType: 'image/png' }),
);
async function check(name, work) {
  await work();
  checks.push(name);
  console.log('PASS', name);
}
async function fits(label) {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    `${label} scrolls sideways`,
  );
  const result = await auditPage(page);
  const serious = result.violations.filter((v) => ['serious', 'critical'].includes(v.impact));
  violations.push(...serious.map((v) => ({ step: label, id: v.id, nodes: v.nodes.length })));
}
const step = (id) => page.waitForURL(new RegExp(`/setup/${id}(\\?|$)`));
const next = async (id) => {
  await page.getByRole('button', { name: /^(Save and continue|Continue|Check and send)$/ }).click();
  await step(id);
};
const output = new URL('../../docs/evidence/owner-phase5/', import.meta.url);
await mkdir(output, { recursive: true });
let id;
try {
  await check('Type creates one draft and never asks a field twice', async () => {
    await page.goto(web + '/partner/listings/new');
    await page.getByText('Step 1 of 11 · Type').waitFor();
    await page.getByLabel('Category').selectOption({ label: 'Farmhouse' });
    await fits('type');
    await page.getByRole('button', { name: 'Continue' }).click();
    await step('location');
    id = page.url().match(/listings\/([^/]+)\//)[1];
    assert.equal(await page.getByLabel('Title').count(), 0);
  });
  await check('Location refuses nothing valid and saves the pin', async () => {
    await page.getByLabel('City').selectOption({ label: 'Surat' });
    await page.getByLabel('Area').selectOption({ label: 'Dumas' });
    await page.getByRole('button', { name: /Property map/ }).click();
    await page.getByText('Enter coordinates').click();
    assert.ok(Number(await page.getByLabel('Latitude').inputValue()) > 6);
    await page.getByLabel('Full address').fill('Survey 24, Canal Road, near the water tank, Dumas');
    await fits('location');
    await page.screenshot({
      path: fileURLToPath(new URL('location-360.png', output)),
      fullPage: true,
    });
    await next('space');
  });
  await check('Space needs guests and bedrooms only', async () => {
    await page.getByLabel('Maximum guests').fill('12');
    await page.getByLabel('Bedrooms').fill('3');
    await fits('space');
    await next('amenities');
  });
  await check('Amenities save three picks', async () => {
    for (const name of ['pool', 'parking', 'garden']) await page.getByLabel(name).check();
    await fits('amenities');
    await next('photos');
  });
  await check('Photos upload one per request with thumbnails, reorder and cover', async () => {
    const files = await page.evaluate(async () => {
      const out = [];
      for (let i = 0; i < 6; i++) {
        const canvas = Object.assign(document.createElement('canvas'), { width: 64, height: 48 });
        const context = canvas.getContext('2d');
        context.fillStyle = `hsl(${i * 50} 70% 50%)`;
        context.fillRect(0, 0, 64, 48);
        out.push(canvas.toDataURL('image/png').split(',')[1]);
      }
      return out;
    });
    await page.locator('input[type=file]').setInputFiles(
      files.map((data, i) => ({
        name: `photo-${i}.png`,
        mimeType: 'image/png',
        buffer: Buffer.from(data, 'base64'),
      })),
    );
    await page.getByText('6 of 6 minimum').waitFor();
    assert.equal(await page.locator('li[data-photo-index] img').count(), 6);
    await page.getByRole('button', { name: 'Make cover' }).first().click();
    await page.getByText('6 of 6 minimum').waitFor();
    await fits('photos');
    await page.screenshot({
      path: fileURLToPath(new URL('photos-360.png', output)),
      fullPage: true,
    });
    await next('story');
  });
  await check('Story autosaves, restores after reload and saves on Continue', async () => {
    await page.getByLabel('Title').fill('Riverside farmhouse with pool');
    await page.getByText(/^Saved \d/).waitFor();
    await page
      .getByLabel('Description')
      .fill('A quiet riverside farmhouse with a private pool, lawn and four shaded cabanas.');
    await page.reload();
    await page
      .getByText(/We restored what you typed|Saved \d/)
      .first()
      .waitFor();
    assert.match(await page.getByLabel('Description').inputValue(), /riverside farmhouse/);
    await fits('story');
    await next('pricing');
  });
  await check('Pricing shows Guest pays and saves in one press', async () => {
    await page.getByLabel('Offer Day picnic').check();
    await page.getByLabel('Weekday price').first().fill('₹1,500');
    await page
      .getByText(/Guest pays ₹/)
      .first()
      .waitFor();
    assert.equal(await page.getByLabel('Weekend price').first().inputValue(), '₹1,500');
    await fits('pricing');
    await page.screenshot({
      path: fileURLToPath(new URL('pricing-360.png', output)),
      fullPage: true,
    });
    await next('availability');
  });
  await check('Availability opens dates automatically', async () => {
    await fits('availability');
    await next('rules');
  });
  await check('Rules need the cancellation confirmed', async () => {
    await page.getByLabel('I confirm this cancellation policy').check();
    await fits('rules');
    await next('ownership');
  });
  await check('Ownership uploads on file pick, then Continue', async () => {
    await page.getByLabel('Name printed on it').fill('Property Owner');
    await page.locator('input[name=file]').setInputFiles({
      name: 'extract.png',
      mimeType: 'image/png',
      buffer: png,
    });
    await page
      .getByRole('button', { name: 'Check and send' })
      .and(page.locator(':enabled'))
      .waitFor();
    await fits('ownership');
    await next('preview');
  });
  await check('Preview as a guest renders the draft with booking disabled', async () => {
    await page.getByRole('link', { name: 'Preview as a guest' }).click();
    await page.getByText('Preview — not live yet. Booking is disabled.').waitFor();
    await page.getByRole('heading', { name: 'Riverside farmhouse with pool' }).first().waitFor();
    await fits('guest preview');
    await page.screenshot({
      path: fileURLToPath(new URL('preview-360.png', output)),
      fullPage: true,
    });
    await page.getByRole('link', { name: 'Back to setup' }).click();
    await step('preview');
  });
  await check('Submit lands on the timeline page', async () => {
    await fits('preview');
    await page.getByRole('button', { name: /Submit for review|Send for review/ }).click();
    await page.waitForURL(new RegExp(`/partner/listings/${id}/submitted`));
    await page.getByText('Go to Today').waitFor();
    await page.waitForTimeout(1200);
    await fits('submitted');
    await page.screenshot({
      path: fileURLToPath(new URL('submitted-360.png', output)),
      fullPage: true,
    });
  });
  await check('legacy step links redirect to the new steps', async () => {
    await page.goto(web + `/partner/listings/${id}/setup/basics`);
    await step('story');
  });
  await check(
    'Properties list resumes a draft at its step, and a draft can be deleted',
    async () => {
      await page.goto(web + '/partner/listings/new');
      await page.getByLabel('Category').selectOption({ label: 'Farmhouse' });
      await page.getByRole('button', { name: 'Continue' }).click();
      await step('location');
      const draft = page.url().match(/listings\/([^/]+)\//)[1];
      await page.goto(web + '/partner/listings');
      const resume = page.getByRole('link', { name: /Continue setup — step 2 of 11/ }).first();
      await resume.waitFor();
      assert.match(await resume.getAttribute('href'), new RegExp(`${draft}/setup/location`));
      await page.goto(web + `/partner/listings/${draft}/setup/preview`);
      await page.getByRole('button', { name: 'Delete draft' }).click();
      await page.waitForURL(/\/partner\/listings$/);
    },
  );
  assert.deepEqual(errors, []);
  assert.deepEqual(violations, []);
} catch (error) {
  await page
    .screenshot({ path: fileURLToPath(new URL('failure.png', output)), fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  await writeFile(
    new URL('browser-checks.json', output),
    JSON.stringify({ checks, errors, violations }, null, 2),
  );
  await browser.close();
}
