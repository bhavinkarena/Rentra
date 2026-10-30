// Run against serve-suitable-stays.mjs and Next on loopback. No hosted requests.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createHmac } from 'node:crypto';

const actionWidth = Number(process.env.SUITABLE_STAYS_ACTION_WIDTH || 390);
const targetsOnly = process.argv.includes('--targets-only');
const out = new URL(`../../docs/qa/story-3-12/${actionWidth}/`, import.meta.url);
await mkdir(out, { recursive: true });
const resultFile = new URL(targetsOnly ? 'targets-results.json' : 'results.json', out);
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
const web = 'http://127.0.0.1:3112';
const fixture = JSON.parse(
  await readFile(
    new URL('../../../rentra-backend/tmp/story312/fixture.json', import.meta.url),
    'utf8',
  ),
);
const database = new URL(fixture.databaseUrl);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '55432');
assert.match(database.pathname, /^\/rentra_test_[a-f0-9]{32}$/);
assert.ok([390, 1440].includes(actionWidth));
const checks = [];
const check = (name, ok, detail = '', source = 'browser') => {
  checks.push({ source, name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
};
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const runtimeErrors = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && /Each child|[Hh]ydrat/.test(message.text()))
    runtimeErrors.push(message.text());
});
page.setDefaultTimeout(20000);
let capturedMinor;
await context.exposeFunction('qaPay', async (orderId, amount) => {
  capturedMinor = amount;
  const stateFile = new URL('../../../rentra-backend/tmp/story312/provider.json', import.meta.url);
  const state = JSON.parse(await readFile(stateFile, 'utf8'));
  const id = `pay_STORY312${++state.counter}`;
  state.payments[id] = {
    id,
    order_id: orderId,
    amount,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'upi',
  };
  await writeFile(stateFile, JSON.stringify(state));
  return {
    razorpay_payment_id: id,
    razorpay_order_id: orderId,
    razorpay_signature: createHmac('sha256', 'story312-fake-provider-secret')
      .update(`${orderId}|${id}`)
      .digest('hex'),
  };
});
await context.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: 'window.Razorpay = function(o) { this.on = function() {}; this.open = async function() { o.handler(await window.qaPay(o.order_id, o.amount)); }; };',
  }),
);
const day = (n) => new Date(Date.now() + 330 * 60000 + n * 86400000).toISOString().slice(0, 10);
const checkIn = day(actionWidth === 390 ? 18 : 14);
const checkOut = day(actionWidth === 390 ? 20 : 16);
const ownerFrom = day(actionWidth === 390 ? 28 : 20);
const trip = `checkin=${checkIn}&checkout=${checkOut}&adults=2&children=0&pets=0`;
async function audit(name) {
  await page.waitForFunction(() => document.title.length > 0);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${name}: reflow ${width}`, overflow <= 1, `${overflow}px horizontal overflow`);
    const smallPrimary = await page.locator('button').evaluateAll((buttons) =>
      buttons
        .filter((button) => {
          const rect = button.getBoundingClientRect();
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            /^(Reserve|Log in to reserve|Continue to payment|Pay |Block$|Unblock$|Preview$|Change rates or rooms$)/.test(
              button.textContent.trim(),
            ) &&
            (rect.width < 44 || rect.height < 44)
          );
        })
        .map((button) => button.textContent.trim()),
    );
    check(`${name}: primary targets ${width}`, smallPrimary.length === 0, smallPrimary);
    const axe = await auditPage(page);
    check(
      `${name}: axe ${width}`,
      axe.violations.length === 0,
      axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`${name}-${width}.png`, out)),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: actionWidth, height: 900 });
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
try {
  if (targetsOnly) {
    await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
    for (const [name, property, buttons] of [
      ['apartment', fixture.ids.apartment, ['Block', 'Unblock']],
      ['hotel', fixture.ids.hotel.hotel, ['Change rates or rooms']],
    ]) {
      await page.goto(`${web}/partner/calendar?property=${property}&from=${ownerFrom}`, {
        waitUntil: 'networkidle',
      });
      if (name === 'apartment')
        await page
          .getByRole('list', { name: 'Nights', exact: true })
          .getByRole('button')
          .first()
          .click();
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const button of buttons) {
          const rect = await page
            .getByRole('button', { name: button, exact: true })
            .evaluate((element) => ({
              height: element.getBoundingClientRect().height,
              width: element.getBoundingClientRect().width,
            }));
          check(
            `${name} ${button}: primary target ${width}`,
            rect.height >= 44 && rect.width >= 44,
            rect,
          );
        }
        await page.screenshot({
          path: fileURLToPath(new URL(`${name}-targets-${width}.png`, out)),
          fullPage: true,
        });
      }
    }
  } else {
    for (const [name, handle, title] of [
      ['farm', 'review-farm-review01', 'Review River Farm'],
      ['villa', 'suitable-villa-villa312', 'Suitable Villa'],
      ['apartment', 'suitable-apartment-apt31200', 'Suitable Apartment'],
    ]) {
      await page.goto(`${web}/listing/${handle}?${trip}`, { waitUntil: 'networkidle' });
      check(
        `${name}: listing loads`,
        (await page.getByRole('heading', { level: 1, name: title, exact: true }).count()) === 1,
      );
      await audit(name);
    }
    await page.goto(`${web}/search?vertical=hotel&city=surat&${trip}`, {
      waitUntil: 'networkidle',
    });
    check('hotel dated results present', (await page.getByText('Riverside Residency').count()) > 0);
    await audit('search');
    const hotelLink = page.getByRole('link', { name: /Riverside Residency/ }).first();
    await hotelLink.click();
    await page.waitForURL(/\/listing\//);
    await page.waitForLoadState('networkidle');
    check(
      'search navigation keeps dates',
      page.url().includes(`checkin=${checkIn}`) && page.url().includes(`checkout=${checkOut}`),
    );
    await audit('hotel');
    await page.reload({ waitUntil: 'networkidle' });
    check('reload keeps dates', page.url().includes(`checkin=${checkIn}`));
    await page.keyboard.press('Tab');
    check(
      'Tab moves focus to an interactive element',
      await page.evaluate(() => document.activeElement !== document.body),
    );
    const nextPhoto = page.getByRole('button', { name: 'Next photo of Deluxe Double' });
    await nextPhoto.focus();
    await page.keyboard.press('Enter');
    check(
      'gallery keyboard next photo',
      (await page.getByAltText('Fixture room second view').count()) === 1,
    );
    await page.getByRole('button', { name: 'Previous photo of Deluxe Double' }).click();
    check(
      'gallery previous photo',
      (await page.getByAltText('Fixture room first view').count()) === 1,
    );
    await page.locator('article details summary').first().click();
    check(
      'full room facility list includes tenth facility',
      (await page.getByText('Private bathroom', { exact: true }).count()) > 0,
    );
    await page.setViewportSize({ width: 720, height: 900 });
    await page.evaluate(() => (document.documentElement.style.zoom = '2'));
    check(
      'hotel 200% CSS zoom reflow',
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    );
    await page.evaluate(() => (document.documentElement.style.zoom = ''));
    await page.setViewportSize({ width: actionWidth, height: 900 });
    await page
      .getByRole('button', { name: /^Add a Room only room$/ })
      .first()
      .click();
    await page
      .locator('button:visible')
      .filter({ hasText: /^Log in to reserve$/ })
      .click();
    await page.waitForURL(/\/login/);
    check('hotel reserve hands off to login', true);
    await context.addCookies([
      { name: 'rentra_session', value: fixture.tokens.customer, url: web },
    ]);
    await page.goto(`${web}/listing/fixture-${fixture.ids.hotelCode}`, {
      waitUntil: 'networkidle',
    });
    await page.waitForURL(new RegExp(`checkin=${checkIn}`));
    check(
      'seeded authenticated return restores dates and age zero',
      page.url().includes(`checkout=${checkOut}`) &&
        new URL(page.url()).searchParams.get('children') === '0',
    );
    await page.goto(
      `${web}/listing/suitable-apartment-apt31200?${trip.replace('pets=0', 'pets=1')}`,
      { waitUntil: 'networkidle' },
    );
    const displayedTotal = await page.locator('dl [data-money]').last().innerText();
    await page.getByRole('button', { name: 'Reserve', exact: true }).click();
    await page.waitForURL(/\/checkout\/review\//);
    await page.getByRole('heading', { name: 'Confirm your booking', exact: true }).waitFor();
    check('apartment review reached through reserve', true);
    const reviewResponse = await page.request.get(
      `http://127.0.0.1:4112/api/v1/bookings/checkout/quote/${page.url().split('/').pop()}`,
    );
    assert.ok(reviewResponse.ok());
    const accepted = (await reviewResponse.json()).data.quote;
    const amounts = {
      cleaningMinor: accepted.visits[0].apartment.cleaningMinor,
      petMinor: accepted.visits[0].apartment.petMinor,
      feeMinor: accepted.totals.feeMinor,
      totalMinor: accepted.totals.totalMinor,
    };
    const money = (minor) =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(minor / 100);
    check(
      'displayed apartment quote agrees with authoritative review',
      displayedTotal === money(amounts.totalMinor),
      { displayedTotal, amounts },
      'api observation of UI-created quote',
    );
    const reviewText = await page.locator('body').innerText();
    check(
      'checkout displays accepted cleaning, pets, fee and total',
      Object.values(amounts).every((minor) => reviewText.includes(money(minor))),
      { expected: Object.values(amounts).map(money) },
    );
    await audit('checkout-review');
    await page.getByText('I agree to these booking terms', { exact: true }).click();
    await page.getByRole('checkbox', { name: /My pets are/ }).check();
    await page.getByRole('button', { name: 'Continue to payment' }).click();
    await page.waitForURL(/\/checkout\/[0-9a-f-]{36}$/);
    const orderId = page.url().split('/').pop();
    check('apartment hold reached through UI', true);
    await page.getByRole('button', { name: /^Pay / }).click();
    await page.getByRole('heading', { name: 'You’re all set!' }).waitFor();
    check('fake Test payment confirms through UI', true);
    check(
      'fake capture equals accepted and displayed trip total',
      capturedMinor === amounts.totalMinor,
      { capturedMinor, totalMinor: amounts.totalMinor },
      'fake provider observation',
    );
    await page.goto(`${web}/bookings/${orderId}`, { waitUntil: 'networkidle' });
    check(
      'booking record identifies accepted apartment',
      (await page.getByText('Suitable Apartment', { exact: true }).count()) > 0,
    );
    await audit('booking-record');
    const recordResponse = await page.request.get(
      `http://127.0.0.1:4112/api/v1/customer/records/${orderId}`,
    );
    assert.ok(recordResponse.ok());
    const record = (await recordResponse.json()).data;
    check(
      'accepted record retains cleaning, pets, fee and total',
      record.stay.apartment.cleaningMinor === amounts.cleaningMinor &&
        record.stay.apartment.petMinor === amounts.petMinor &&
        record.feeMinor === amounts.feeMinor &&
        record.rentMinor + record.feeMinor === amounts.totalMinor,
      amounts,
      'direct API record observation',
    );
    await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
    await page.goto(`${web}/partner/calendar?property=${fixture.ids.apartment}&from=${ownerFrom}`, {
      waitUntil: 'networkidle',
    });
    check(
      'owner apartment calendar displayed',
      (await page.getByRole('heading', { name: 'Apartment nights' }).count()) === 1,
    );
    await audit('owner-apartment');
    const nights = page.getByRole('list', { name: 'Nights', exact: true }).getByRole('button');
    await nights.nth(3).focus();
    await page.keyboard.press('Enter');
    await nights.nth(5).click();
    await page.getByRole('button', { name: 'Block', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Nights blocked.' }).waitFor();
    check('owner blocks selected apartment nights through UI', true);
    await nights.nth(4).click();
    await page.getByRole('button', { name: 'Unblock', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Nights opened.' }).waitFor();
    check(
      'owner partially unblocks through UI',
      (await nights.nth(3).getAttribute('aria-label')).includes('Blocked') &&
        (await nights.nth(4).getAttribute('aria-label')).includes('Open') &&
        (await nights.nth(5).getAttribute('aria-label')).includes('Blocked'),
    );
    await page.goto(
      `${web}/partner/calendar?property=${fixture.ids.hotel.hotel}&from=${ownerFrom}`,
      {
        waitUntil: 'networkidle',
      },
    );
    check(
      'owner hotel calendar identity',
      (await page.getByRole('button', { name: 'Change rates or rooms', exact: true }).count()) ===
        1,
    );
    await audit('owner-hotel');
    await page.getByRole('button', { name: 'Change rates or rooms', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Change rates or rooms' });
    await drawer.getByLabel('₹ per night', { exact: true }).fill('3500');
    await auditState('hotel drawer', page);
    await page.keyboard.press('Escape');
    check(
      'dirty hotel edit guarded on Escape',
      (await page.getByRole('alertdialog').count()) === 1,
    );
    await auditState('hotel discard confirmation', page);
    await page.keyboard.press('Escape');
    check(
      'Escape cancels discard and keeps drawer',
      (await drawer.count()) === 1 && (await page.getByRole('alertdialog').count()) === 0,
    );
  }
} catch (error) {
  check('journey completed', false, error.message.split('\n')[0]);
  await page
    .screenshot({
      path: new URL('failure.png', out).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
      fullPage: true,
    })
    .catch(() => {});
} finally {
  check(
    'no browser runtime or React hydration/key errors',
    runtimeErrors.length === 0,
    runtimeErrors,
  );
  await writeFile(
    resultFile,
    JSON.stringify(
      {
        status: checks.some((check) => !check.ok) ? 'failed' : 'completed',
        checks,
        actionWidth,
        unexecuted: [
          'Real devices',
          'Screen readers',
          'Field p75 performance',
          'Load testing',
          'Farm/villa booking and authentication browser flow',
          'Category changes preserving party and pets in browser',
          'Hotel offer/child/bedding/pet amount comparisons and cot/supervision refusals in browser',
          'Cancellation and early departure in browser',
          'Farm owner effective-price edits in browser',
        ],
      },
      null,
      2,
    ),
  );
  await browser.close();
}
if (checks.some((c) => !c.ok)) process.exitCode = 1;
