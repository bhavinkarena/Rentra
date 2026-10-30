// Supplemental Story 3.12 browser journeys; run after the guarded local fixture starts.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../../docs/qa/story-3-12/details/', import.meta.url);
await mkdir(out, { recursive: true });
const resultFile = new URL('results.json', out);
await writeFile(
  resultFile,
  JSON.stringify(
    {
      status: 'incomplete',
      checks: [
        { name: 'runner completed', ok: false, detail: 'Setup or execution has not completed' },
      ],
    },
    null,
    2,
  ),
);
const { auditPage } = await import('./browser-audit.mjs');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = JSON.parse(
  await readFile(
    new URL('../../../rentra-backend/tmp/story312/fixture.json', import.meta.url),
    'utf8',
  ),
);
const db = new URL(fixture.databaseUrl);
assert.equal(db.hostname, '127.0.0.1');
assert.equal(db.port, '55432');
assert.match(db.pathname, /^\/rentra_test_[a-f0-9]{32}$/);
const postgres = require('../../../rentra-backend/node_modules/postgres');
const sql = postgres(db.href, { max: 1 });
// Fixture setup only: three children are permitted, but no cots; a third adult needs one paid extra bed.
await sql`UPDATE room_type SET max_children=3,beds='[{"type":"double","count":1}]',extra_places='[{"type":"extra_bed","count":1,"charge":{"mode":"fixed","amount":500}}]' WHERE id=${fixture.ids.hotel.deluxe}`;
await sql.end();
const web = 'http://127.0.0.1:3112';
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const checks = [];
const runtimeErrors = [];

const day = (n) => new Date(Date.now() + 330 * 60000 + n * 86400000).toISOString().slice(0, 10);
let checkIn = day(40);
while (new Date(`${checkIn}T00:00:00Z`).getUTCDay() !== 3)
  checkIn = new Date(Date.parse(checkIn) + 86400000).toISOString().slice(0, 10);
const checkOut = new Date(Date.parse(checkIn) + 2 * 86400000).toISOString().slice(0, 10);
function check(name, ok, detail = '') {
  checks.push({ source: 'browser', name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(ok, name);
}
async function auditState(name, page) {
  const result = await auditPage(page);
  check(
    `${name}: axe`,
    result.violations.length === 0,
    result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  );
}
for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  context.on('page', (page) => {
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Each child|[Hh]ydrat/.test(message.text()))
        runtimeErrors.push(message.text());
    });
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  try {
    const hotel = `${web}/listing/old-title-${fixture.ids.hotelCode}`;
    const params = new URLSearchParams({
      checkin: checkIn,
      checkout: checkOut,
      adults: '2',
      children: '5',
      pets: '1',
    });
    await page.goto(`${hotel}?${params}`, { waitUntil: 'networkidle' });
    check(
      `${width}: canonical hotel redirect retains declared pet`,
      new URL(page.url()).searchParams.get('pets') === '1',
    );
    check(
      `${width}: hotel child percent policy disclosed`,
      (await page.locator('body').innerText()).includes('25% of the room price'),
    );
    const response = page.waitForResponse((r) => r.url().includes('/stay-quote'));
    const room = page
      .locator('article')
      .filter({ has: page.getByRole('heading', { name: 'Deluxe Double', exact: true }) });
    await room.getByRole('button', { name: 'Add a Room only room', exact: true }).click();
    const quoted = await (await response).json();
    check(
      `${width}: pet quote accepted through HTTP validation`,
      quoted.success === true,
      quoted.code,
    );
    const q = quoted.data;
    check(
      `${width}: percentage child price uses room-local adults`,
      q.lines[0].nights.every((n) => n.childMinor === 32500),
    );
    check(
      `${width}: two-night pet charge and one service fee included`,
      q.totals.petMinor === 30000 && q.totals.feeMinor === 30750 && q.totals.totalMinor === 675000,
      q.totals,
    );
    const text = await page.locator('body').innerText();
    check(
      `${width}: comparison and selection show complete total`,
      (text.match(/₹6,750/g) || []).length >= 2,
    );
    check(
      `${width}: pet fee disclosed`,
      width === 1440 ? text.includes('Pet fee · ₹300') : text.includes('₹150 per night'),
    );
    await room.getByRole('button', { name: 'Remove a Room only room', exact: true }).click();
    const breakfast = page.waitForResponse((r) => r.url().includes('/stay-quote'));
    await room.getByRole('button', { name: 'Add a Breakfast included room', exact: true }).click();
    const meal = (await (await breakfast).json()).data;
    check(
      `${width}: meal offer keeps child percentage on room-only base`,
      meal.lines[0].nights.every((n) => n.childMinor === 32500) &&
        meal.lines[0].roomMinor === 735000,
    );
    check(
      `${width}: breakfast and pet total displayed`,
      (await page.locator('body').innerText()).includes('₹8,400'),
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`hotel-pricing-${width}.png`, out)),
      fullPage: true,
    });
    await context.addCookies([
      { name: 'rentra_session', value: fixture.tokens.customer, url: web },
    ]);
    await page.reload({ waitUntil: 'networkidle' });
    const persisted = page.waitForResponse((r) => r.url().includes('/stay-quote'));
    await page.getByRole('button', { name: 'Add a Breakfast included room', exact: true }).click();
    await persisted;
    await page
      .locator('button:visible')
      .filter({ hasText: /^Reserve$/ })
      .click();
    await page.waitForURL(/\/checkout\/review\//);
    await page.getByRole('heading', { name: 'Confirm your booking', exact: true }).waitFor();
    check(
      `${width}: hotel checkout retains complete amount without late fee`,
      (await page.locator('body').innerText()).includes('₹8,400') &&
        (await page.locator('body').innerText()).includes('₹382.50'),
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`hotel-checkout-${width}.png`, out)),
      fullPage: true,
    });
    await page.goto(`${hotel}?${params.toString().replace('pets=1', 'pets=3')}`, {
      waitUntil: 'networkidle',
    });
    check(
      `${width}: pet-limit refusal visible`,
      (await page
        .getByRole('alert')
        .filter({ hasText: /up to 2/i })
        .count()) === 1,
    );
    await auditState(`${width}: pet refusal`, page);
    const cot = new URLSearchParams({
      checkin: checkIn,
      checkout: checkOut,
      adults: '2',
      children: '0,0,0',
    });
    await page.goto(`${hotel}?${cot}`, { waitUntil: 'networkidle' });
    check(
      `${width}: infant overflow refuses unconfirmed cot`,
      /cot/i.test(await page.locator('body').innerText()) &&
        (await page
          .getByRole('button', { name: 'Add a Room only room', exact: true })
          .first()
          .isDisabled()),
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`hotel-cot-${width}.png`, out)),
      fullPage: true,
    });
    await auditState(`${width}: cot refusal`, page);
    const beds = new URLSearchParams({ checkin: checkIn, checkout: checkOut, adults: '3' });
    await page.goto(`${hotel}?${beds}`, { waitUntil: 'networkidle' });
    const bedding = page.waitForResponse((r) => r.url().includes('/stay-quote'));
    await page.getByRole('button', { name: 'Add a Room only room', exact: true }).first().click();
    const bedQuote = (await (await bedding).json()).data;
    check(
      `${width}: needed extra bed charged per night`,
      bedQuote.lines[0].nights.every((n) => n.beddingMinor === 50000) &&
        bedQuote.lines[0].roomMinor === 760000,
    );
    check(
      `${width}: charged bedding disclosed`,
      /extra bed/i.test(await page.locator('body').innerText()),
    );
    // Category links are exercised from search rather than constructed manually after navigation.
    await page.goto(`${web}/search?vertical=hotel&city=surat&${params}`, {
      waitUntil: 'networkidle',
    });
    const categories = page.locator('nav[aria-label="Categories"]:visible');
    await categories.getByRole('link', { name: 'Farmhouse', exact: true }).click();
    await page.waitForURL(
      (url) => url.pathname === '/search' && url.searchParams.get('vertical') !== 'hotel',
    );
    let query = new URL(page.url()).searchParams;
    check(
      `${width}: category switch keeps location and pet`,
      query.get('city') === 'surat' && query.get('pets') === '1',
    );
    check(`${width}: hotel party maps to farm guest count`, query.get('guests') === '3');
    check(
      `${width}: incompatible child ages explicitly disclosed`,
      (await page.locator('body').innerText()).includes('Child age information'),
    );
    await page
      .locator('nav[aria-label="Categories"]:visible')
      .getByRole('link', { name: 'Hotels', exact: true })
      .click();
    await page.waitForURL(/vertical=hotel/);
    query = new URL(page.url()).searchParams;
    check(
      `${width}: category return maps dates and party with pet retained`,
      query.get('checkin') === checkIn &&
        query.get('checkout') === checkOut &&
        query.get('adults') === '3' &&
        query.get('pets') === '1',
    );
    for (const [name, handle, expected] of [
      ['farm', 'review-farm-review01', 'Review River Farm'],
      ['villa', 'suitable-villa-villa312', 'Suitable Villa'],
    ]) {
      await context.clearCookies();
      await page.goto(
        `${web}/listing/${handle}?dates=${day(5)}&slot=day&guests=3&pets=${name === 'farm' ? 1 : 0}`,
        { waitUntil: 'networkidle' },
      );
      await page.getByRole('heading', { name: expected, exact: true }).waitFor();
      const login = page
        .locator('button:visible')
        .filter({ hasText: /^Log in to book$/ })
        .first();
      await login.click();
      await page.waitForURL(/\/login/);
      check(`${width}: ${name} booking hands off to login`, true);
      await context.addCookies([
        { name: 'rentra_session', value: fixture.tokens.customer, url: web },
      ]);
      await page.goto(`${web}/listing/${handle}`, { waitUntil: 'networkidle' });
      await page.waitForFunction(
        (date) => new URL(location.href).searchParams.get('dates') === date,
        day(5),
      );
      const restored = new URL(page.url()).searchParams;
      check(
        `${width}: ${name} auth return retains date and party`,
        restored.get('guests') === '3' && restored.get('slot') === 'day',
      );
      check(
        `${width}: ${name} auth return retains pets`,
        name !== 'farm' || restored.get('pets') === '1',
      );
      await page.locator('#booking-summary input[type="checkbox"]').check();
      await page
        .locator('a:visible')
        .filter({ hasText: /^Review booking$/ })
        .first()
        .click();
      await page.waitForURL(/\/checkout\/review\//);
      await page.locator('h2:visible,p:visible').filter({ hasText: expected }).first().waitFor();
      check(`${width}: ${name} authoritative checkout review reached`, true);
      await page.screenshot({
        path: fileURLToPath(new URL(`${name}-review-${width}.png`, out)),
        fullPage: true,
      });
    }
    await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
    const ownerDay = day(width === 1440 ? 45 : 46);
    await page.goto(
      `${web}/partner/calendar?property=${fixture.ids.hotel.hotel}&from=${ownerDay}`,
      { waitUntil: 'networkidle' },
    );
    await page.getByRole('button', { name: 'Change rates or rooms', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Change rates or rooms', exact: true });
    await drawer.getByLabel('From', { exact: true }).fill(ownerDay);
    await drawer.getByLabel('To', { exact: true }).fill(ownerDay);
    await drawer.getByLabel('₹ per night', { exact: true }).fill('3500');
    await drawer.getByRole('button', { name: 'Preview', exact: true }).click();
    await drawer.getByRole('table', { name: 'Prices before and after' }).waitFor();
    check(
      `${width}: hotel preview shows before and after prices`,
      (await drawer.innerText()).includes('₹3,500'),
    );
    await auditState(`${width}: hotel preview drawer`, page);
    const apply = drawer.getByRole('button', { name: /^Apply to/ });
    await apply.focus();
    await page.keyboard.press('Tab');
    check(
      `${width}: hotel drawer traps Tab`,
      await drawer.evaluate((el) => el.contains(document.activeElement)),
    );
    const second = await context.newPage();
    await second.goto(
      `${web}/partner/calendar?property=${fixture.ids.hotel.hotel}&from=${ownerDay}`,
      { waitUntil: 'networkidle' },
    );
    await second.getByRole('button', { name: 'Change rates or rooms', exact: true }).click();
    const concurrent = second.getByRole('dialog', { name: 'Change rates or rooms', exact: true });
    await concurrent.getByLabel('From', { exact: true }).fill(ownerDay);
    await concurrent.getByLabel('To', { exact: true }).fill(ownerDay);
    await concurrent.getByLabel('₹ per night', { exact: true }).fill('3600');
    await concurrent.getByRole('button', { name: 'Preview', exact: true }).click();
    await concurrent.getByRole('button', { name: /^Apply to/ }).click();
    await concurrent.waitFor({ state: 'hidden' });
    await second.close();
    await apply.click();
    await drawer.getByText('Prices changed since your preview — review again.').waitFor();
    check(`${width}: concurrent hotel save is refused and preview refreshed`, true);
    await drawer.getByRole('button', { name: /^Apply to/ }).click();
    await drawer.waitFor({ state: 'hidden' });
    check(`${width}: explicit reviewed retry saves hotel rates`, true);
    await page.screenshot({
      path: fileURLToPath(new URL(`hotel-owner-saved-${width}.png`, out)),
      fullPage: true,
    });
    await context.addCookies([
      { name: 'rentra_session', value: fixture.tokens.customer, url: web },
    ]);
  } catch (error) {
    if (!checks.length || checks.at(-1).ok)
      checks.push({
        source: 'browser',
        name: `${width}: detail journey completed`,
        ok: false,
        detail: error.message,
      });
    console.error(error.message);
    await page
      .screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, out)), fullPage: true })
      .catch(() => {});
  } finally {
    await context.close();
  }
}
checks.push({
  source: 'browser',
  name: 'no browser runtime or React hydration/key errors',
  ok: runtimeErrors.length === 0,
  detail: runtimeErrors,
});
await browser.close();
await writeFile(
  resultFile,
  JSON.stringify(
    { status: checks.some((check) => !check.ok) ? 'failed' : 'completed', checks },
    null,
    2,
  ),
);
if (checks.some((c) => !c.ok)) process.exitCode = 1;
