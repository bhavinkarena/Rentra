// Browser early departure of an explicitly time-shifted disposable Test fixture.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const width = Number(process.env.SUITABLE_STAYS_ACTION_WIDTH || 1440);
const cancel = process.argv.includes('--cancel');
const out = new URL('../../docs/qa/story-3-12/departure/', import.meta.url);
await mkdir(out, { recursive: true });
const resultFile = new URL(`${cancel ? 'cancellation' : 'results'}-${width}.json`, out);
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
assert.ok([390, 1440].includes(width));
let stay = fixture.departures?.find((row) => row.width === width);
if (cancel) {
  const postgres = require('../../../rentra-backend/node_modules/postgres');
  const sql = postgres(db.href, { max: 1 });
  try {
    const [order] =
      await sql`SELECT o.id AS "orderId",(o.amount_rent_minor+o.amount_fee_minor)::int AS "paidMinor",b.slot_snapshot AS selection FROM booking_order o JOIN booking b ON b.order_id=o.id WHERE o.customer_id=${fixture.ids.customer} AND o.rentable_id=${fixture.ids.apartment} AND o.state='confirmed' AND b.starts_at>now() ORDER BY o.created_at DESC LIMIT 1`;
    stay = order;
  } finally {
    await sql.end();
  }
}
assert.ok(stay);
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const context = await browser.newContext({ viewport: { width, height: 900 } });
context.on('page', (page) => {
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error' && /Each child|[Hh]ydrat/.test(message.text()))
      runtimeErrors.push(message.text());
  });
});
await context.addCookies([
  { name: 'rentra_session', value: fixture.tokens.customer, url: 'http://127.0.0.1:3112' },
]);
const page = await context.newPage();
page.setDefaultTimeout(15000);
const checks = [];
const runtimeErrors = [];

const check = (name, ok, detail = '') => {
  checks.push({ source: 'browser', name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(ok, name);
};
const money = (minor) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minor / 100);
async function committedRefund(expected) {
  const postgres = require('../../../rentra-backend/node_modules/postgres');
  const sql = postgres(db.href, { max: 1 });
  try {
    const [row] =
      await sql`SELECT (SELECT coalesce(sum(ra.expected_minor),0)::int FROM refund_allocation ra JOIN booking b ON b.id=ra.booking_id WHERE b.order_id=${stay.orderId}) AS refund,(SELECT snapshot FROM booking_cancellation WHERE order_id=${stay.orderId} ORDER BY created_at DESC LIMIT 1) AS receipt`;
    checks.push({
      source: 'direct SQL observation after browser commit',
      name: `${width}: committed requested refund agrees with preview`,
      ok: row.refund === expected && row.receipt.refundMinor === expected,
      detail: { expected, requested: row.refund },
    });
    assert.equal(row.refund, expected);
    assert.equal(row.receipt.refundMinor, expected);
    if (!cancel) {
      assert.deepEqual(
        row.receipt.visits[0].apartment.consumedNights,
        stay.expected.consumedNights,
      );
      assert.deepEqual(row.receipt.visits[0].apartment.unusedNights, stay.expected.unusedNights);
    }
  } finally {
    await sql.end();
  }
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
  await page.goto(`http://127.0.0.1:3112/bookings/${stay.orderId}/cancel`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Suitable Apartment', exact: true }).waitFor();
  await page
    .getByRole('button', { name: cancel ? 'Cancel visits' : 'End stay early', exact: true })
    .click();
  await page
    .getByRole('group', { name: 'Choose visits', exact: true })
    .getByRole('checkbox')
    .check();
  await page
    .getByRole('button', {
      name: cancel ? 'Preview cancellation' : 'Preview early departure',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', {
      name: cancel ? 'Confirm cancellation' : 'Confirm early departure',
      exact: true,
    })
    .waitFor();
  await auditState(`${width}: ${cancel ? 'cancellation' : 'departure'} preview`, page);
  if (cancel) {
    const refund = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(stay.paidMinor / 100);
    check(
      `${width}: full apartment cancellation preview reconciles paid total`,
      (await page.locator('body').innerText()).includes(`Total Test refund requested: ${refund}`),
    );
    await page.getByRole('checkbox').last().check();
    await page.getByRole('button', { name: 'Confirm cancellation', exact: true }).click();
    await page.getByRole('heading', { name: 'Visits cancelled', exact: true }).waitFor();
    check(
      `${width}: apartment cancellation receipt shown`,
      (await page.locator('body').innerText()).includes('Actual bank refund: ₹0'),
    );
    check(
      `${width}: cancellation receipt retains refund amount`,
      (
        await page.getByRole('status').filter({ hasText: 'Cancellation reference:' }).innerText()
      ).includes(`Test refund requested: ${refund}`),
    );
    await committedRefund(stay.paidMinor);
    await auditState(`${width}: cancellation receipt`, page);
    await page.screenshot({
      path: fileURLToPath(new URL(`cancellation-${width}.png`, out)),
      fullPage: true,
    });
    await page.goto(`http://127.0.0.1:3112/bookings/${stay.orderId}`, { waitUntil: 'networkidle' });
    check(
      `${width}: cancelled booking record shown`,
      (await page.locator('body').innerText()).includes('Cancelled'),
    );
    const reopened = await page.request.post('http://127.0.0.1:4112/api/v1/bookings/quote', {
      data: {
        kind: 'apartment',
        rentableId: fixture.ids.apartment,
        checkIn: stay.selection.checkIn,
        checkOut: stay.selection.checkOut,
        adults: stay.selection.apartment.adults,
        childAges: stay.selection.apartment.childAges,
        pets: 1,
      },
    });
    const reopenedBody = await reopened.json();
    checks.push({
      source: 'direct API observation after browser cancellation',
      name: `${width}: cancelled dates can be quoted again`,
      ok: reopened.ok() && reopenedBody.success === true && Boolean(reopenedBody.data.quote.id),
    });
    assert.ok(checks.at(-1).ok);
  } else {
    assert.ok(stay.expected, 'Prepare and activate expected departure amounts first');
    check(`${width}: early departure preview reached through UI`, true);
    check(
      `${width}: preview identifies unused nights and retained charges`,
      (await page.locator('body').innerText()).includes('Cleaning kept: ₹1,000') &&
        (await page.locator('body').innerText()).includes('Pet charge kept: ₹450'),
    );
    const previewText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    check(
      `${width}: consumed and unused night partition displayed`,
      previewText.includes(
        `Consumed nights: ${stay.expected.consumedNights.join(', ')}. Unused nights: ${stay.expected.unusedNights.join(', ')}.`,
      ),
    );
    check(
      `${width}: departure refund includes unused rent and refundable fee`,
      previewText.includes(`Total Test refund requested: ${money(stay.expected.refundMinor)}`),
      stay.expected,
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`preview-${width}.png`, out)),
      fullPage: true,
    });
    await page.getByRole('checkbox').last().check();
    await page.getByRole('button', { name: 'Confirm early departure', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Early-departure reference:' }).waitFor();
    check(`${width}: early departure receipt returned`, true);
    const receipt = await page
      .getByRole('status')
      .filter({ hasText: 'Early-departure reference:' })
      .innerText();
    check(
      `${width}: whole-apartment receipt never reports zero rooms`,
      !receipt.includes('0 room(s)'),
      receipt,
    );
    check(
      `${width}: departure receipt retains preview refund`,
      receipt.includes(
        `Test refund requested: ${money(stay.expected.unusedRentMinor + stay.expected.unusedFeeMinor)}`,
      ),
    );
    await committedRefund(stay.expected.refundMinor);
    await auditState(`${width}: departure receipt`, page);
    await page.screenshot({
      path: fileURLToPath(new URL(`receipt-${width}.png`, out)),
      fullPage: true,
    });
    await page.goto(`http://127.0.0.1:3112/bookings/${stay.orderId}`, { waitUntil: 'networkidle' });
    check(
      `${width}: completed apartment record readable`,
      (await page.locator('body').innerText()).includes('Completed'),
    );
  }
} catch (error) {
  if (!checks.length || checks.at(-1).ok)
    checks.push({
      source: 'browser',
      name: `${width}: departure journey complete`,
      ok: false,
      detail: error.message,
    });
  console.error(error.message);
  await page
    .screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, out)), fullPage: true })
    .catch(() => {});
} finally {
  checks.push({
    source: 'browser',
    name: 'no browser runtime or React hydration/key errors',
    ok: runtimeErrors.length === 0,
    detail: runtimeErrors,
  });
  await writeFile(
    resultFile,
    JSON.stringify(
      {
        status: checks.some((check) => !check.ok) ? 'failed' : 'completed',
        checks,
        fixtureSetup: cancel
          ? 'Latest confirmed local Test apartment stay; SQL used only to locate the fixture.'
          : 'Prepared fake Test booking, time-shifted locally with triggers restored before browser actions.',
      },
      null,
      2,
    ),
  );
  await browser.close();
}
if (checks.some((c) => !c.ok)) process.exitCode = 1;
