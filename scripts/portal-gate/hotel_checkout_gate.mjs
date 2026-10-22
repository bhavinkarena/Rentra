// Hotel checkout gate (hotel plan, Phase 7). Disposable stack of hotel_discovery_gate.mjs plus:
//   0067 applied, the Razorpay Test gateway enabled (.qa-payments.mjs), API :4106 started with
//   RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET (GATE_RZP_SECRET here) and FAKE_RAZORPAY_STATE, and a
//   customer session in GATE_GUEST_TOKEN (.qa-customer-token.mjs).
// Guest: hotel page → rooms → Reserve → review with guest names and GST → hold → test payment
// (checkout.js stubbed, real HMAC) → confirmed → booking record → .ics → cancel with full refund.
// Logged out: Reserve asks to log in. axe (WCAG 2.1 AA) at 1440 and overflow at 390 on every screen.
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const postgres = require(
  process.env.POSTGRES_MODULE || '../../../rentra-backend/node_modules/postgres',
);

const DB = process.env.GATE_DATABASE_URL ?? '';
if (!/127\.0\.0\.1:55432\/rentra_cp02$/.test(DB))
  throw new Error('refusing non-disposable database');
const web = process.env.GATE_WEB || 'http://localhost:3106';
const out = process.env.GATE_OUT || 'hotel-checkout-gate-out';
const STATE = process.env.FAKE_RAZORPAY_STATE;
const SECRET = process.env.GATE_RZP_SECRET;
fs.mkdirSync(out, { recursive: true });
const axe = fs.readFileSync(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const sql = postgres(DB, { max: 2, onnotice: () => {} });
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const day = (n) => new Date(Date.now() + 5.5 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const checkin = day(30);
const checkout = day(32);
const rupees = (text) => Number(String(text).replace(/[^\d]/g, ''));

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rentra_session', value: process.env.GATE_GUEST_TOKEN, url: web }]);
// checkout.js is replaced by a stub that captures in the fake provider and signs like Razorpay.
await ctx.exposeFunction('qaPay', async (orderId, amount) => {
  const state = fs.existsSync(STATE)
    ? JSON.parse(fs.readFileSync(STATE, 'utf8'))
    : { counter: 0, orders: {}, payments: {} };
  const id = `pay_HOTELQA${++state.counter}`;
  state.payments[id] = {
    id,
    order_id: orderId,
    amount,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'upi',
  };
  fs.writeFileSync(STATE, JSON.stringify(state));
  return {
    razorpay_payment_id: id,
    razorpay_order_id: orderId,
    razorpay_signature: createHmac('sha256', SECRET).update(`${orderId}|${id}`).digest('hex'),
  };
});
await ctx.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: 'window.Razorpay = function (o) { this.on = function () {}; this.open = async function () { o.handler(await window.qaPay(o.order_id, o.amount)); }; };',
  }),
);
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon\.ico$|tile\.openstreetmap/.test(m.location().url ?? ''))
    errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));

async function audit(name, target = page) {
  await target.waitForLoadState('networkidle');
  await target.waitForTimeout(800);
  await target.addScriptTag({ content: axe });
  const result = await target.evaluate(async () =>
    (
      await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })
    ).violations.map((v) => `${v.id}(${v.nodes.length})`),
  );
  check(`axe ${name} (1440)`, result.length === 0, result.join(', '));
  await target.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  const phone = await target.context().newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(target.url(), { waitUntil: 'networkidle' });
  await phone.waitForTimeout(500);
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.screenshot({ path: `${out}/${name}-390.png`, fullPage: true });
  await phone.close();
}

try {
  const [hotel] =
    await sql`SELECT r.slug, r.public_code, r.id FROM rentable r WHERE r.slug='riverside-residency-surat'`;
  if (!hotel) throw new Error('Run seed-hotels --demo first.');
  const listing = `${web}/listing/${hotel.slug}-${hotel.public_code}`;

  // 1. Logged out: the rail asks to log in, and the stay survives the hand-off cookie.
  const anon = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const visitor = await anon.newPage();
  await visitor.goto(`${listing}?checkin=${checkin}&checkout=${checkout}&adults=2`, {
    waitUntil: 'networkidle',
  });
  await visitor
    .getByRole('button', { name: /^Add a Room only room$/ })
    .first()
    .click();
  await visitor
    .getByRole('complementary', { name: 'Your selection' })
    .getByRole('button', { name: 'Log in to reserve' })
    .click();
  await visitor.waitForURL(/\/login/, { timeout: 20000 });
  check('logged-out Reserve goes to login', true);
  await anon.close();

  // 2. Hotel page: pick the room-only rate, reserve.
  await page.goto(`${listing}?checkin=${checkin}&checkout=${checkout}&adults=2`, {
    waitUntil: 'networkidle',
  });
  await page
    .getByRole('button', { name: /^Add a Room only room$/ })
    .first()
    .click();
  const rail = page.getByRole('complementary', { name: 'Your selection' });
  await rail.getByText(/^Total for 1 room/).waitFor({ timeout: 20000 });
  const pagePrice = rupees(await rail.locator('[data-money]').textContent());
  await rail.getByRole('button', { name: 'Reserve' }).click();
  await page.waitForURL(/\/checkout\/review\//, { timeout: 30000 });

  // 3. Review: stay facts, guest name per room, GST invoice details.
  await page.getByRole('heading', { name: 'Your stay' }).waitFor();
  check(
    'review shows check-in and rooms',
    (await page.getByText('Check-in').count()) >= 1 &&
      (await page.getByText(/1 × Deluxe Double/).count()) >= 1,
  );
  const reviewTotal = rupees(await page.locator('dt:has-text("Total") + dd').first().textContent());
  check(
    'review total = hotel page total',
    reviewTotal === pagePrice,
    `₹${reviewTotal} vs ₹${pagePrice}`,
  );
  const name = page.getByLabel(/Room 1 · /);
  check(
    'first guest name prefilled from the account',
    (await name.inputValue()).length >= 2,
    await name.inputValue(),
  );
  await page.getByLabel('I need a GST invoice for my business').check();
  await page.getByLabel('GSTIN').fill('24ABCDE1234F1Z5');
  await page.getByLabel('Business name').fill('Patel Textiles');
  await page.getByText('I agree to these booking terms').click();
  await audit('01-review');
  await page.getByRole('button', { name: 'Continue to payment' }).click();
  await page.waitForURL(/\/checkout\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const orderId = page.url().split('/').pop();
  const [rooms] =
    await sql`SELECT count(*) FILTER (WHERE br.state='held')::int held FROM booking_room br JOIN booking b ON b.id=br.booking_id WHERE b.order_id=${orderId}`;
  check('hold keeps the room', rooms.held === 1);
  await audit('02-pay');

  // 4. Pay (stubbed Razorpay, real verify) → confirmed.
  await page.getByRole('button', { name: /^Pay ₹/ }).click();
  await page.getByRole('heading', { name: 'You’re all set!' }).waitFor({ timeout: 30000 });
  const [after] =
    await sql`SELECT o.state, (SELECT array_agg(br.state::text) FROM booking_room br JOIN booking b ON b.id=br.booking_id WHERE b.order_id=o.id) rooms,
    (SELECT array_agg(a.component::text ORDER BY a.component) FROM payment_allocation a JOIN booking b ON b.id=a.booking_id WHERE b.order_id=o.id) parts
    FROM booking_order o WHERE o.id=${orderId}`;
  check(
    'confirmed with room booked and money as room + tax',
    after.state === 'confirmed' &&
      after.rooms.join() === 'booked' &&
      after.parts.join() === 'rent,tax',
    JSON.stringify(after),
  );
  check(
    'confirmation says enjoy your stay',
    (await page.getByText('Enjoy your stay').count()) === 1,
  );
  await audit('03-confirmed');

  // 5. Booking record, .ics and the trips list.
  await page.goto(`${web}/bookings/${orderId}`, { waitUntil: 'networkidle' });
  check(
    'record lists the rooms',
    (await page.getByRole('heading', { name: 'Your rooms' }).count()) === 1,
  );
  check(
    'record keeps the GST details',
    (await page.getByText('Patel Textiles · 24ABCDE1234F1Z5').count()) === 1,
  );
  await audit('04-record');
  const ics = await page.request.get(`${web}/bookings/${orderId}/calendar`);
  check('.ics calendar file', ics.ok() && (await ics.text()).includes('BEGIN:VCALENDAR'));
  await page.goto(`${web}/bookings`, { waitUntil: 'networkidle' });
  check('trips list shows the stay dates', (await page.getByText(/· 2 nights/).count()) >= 1);

  // 6. Self-serve cancellation: preview, full refund before the deadline, rooms back on sale.
  await page.goto(`${web}/bookings/${orderId}/cancel`, { waitUntil: 'networkidle' });
  await page.locator('input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Preview cancellation' }).click();
  await page
    .getByText('I accept this refund estimate and cancellation of only these visits.')
    .waitFor({ timeout: 20000 });
  await audit('05-cancel-preview');
  await page
    .getByText('I accept this refund estimate and cancellation of only these visits.')
    .click();
  await page.getByRole('button', { name: 'Confirm cancellation' }).click();
  await page.waitForTimeout(3000);
  const [cancelled] =
    await sql`SELECT (SELECT array_agg(br.state::text) FROM booking_room br JOIN booking b ON b.id=br.booking_id WHERE b.order_id=${orderId}) rooms,
    (SELECT sum(ra.expected_minor)::int FROM refund_allocation ra JOIN booking b ON b.id=ra.booking_id WHERE b.order_id=${orderId}) refund`;
  check(
    'cancelled: rooms released, full refund (room + tax) requested',
    cancelled.rooms.join() === 'released' && cancelled.refund === pagePrice * 100,
    JSON.stringify(cancelled),
  );
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
