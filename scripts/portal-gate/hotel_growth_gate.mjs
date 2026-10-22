// Hotel booking-flow gate (hotel plan, Phase 10). Disposable stack of hotel_checkout_gate.mjs (Hotels public,
// Test gateway on, checkout.js stubbed with real HMAC). A guest books two rooms, cancels one, changes the
// dates of another stay (the old one is cancelled and refunded once the new one is paid), prints the
// voucher; admin sees the weekly KPIs. axe (WCAG 2.1 AA) at 1440 and overflow at 390 on new screens.
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
const out = process.env.GATE_OUT || 'hotel-growth-gate-out';
const STATE = process.env.FAKE_RAZORPAY_STATE;
const SECRET = process.env.GATE_RZP_SECRET;
fs.mkdirSync(out, { recursive: true });
const tokens = JSON.parse(fs.readFileSync(process.env.GATE_TOKENS, 'utf8'));
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
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];
async function context(cookie, stubPayments = false) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([cookie]);
  if (stubPayments) {
    await ctx.exposeFunction('qaPay', async (orderId, amount) => {
      const state = JSON.parse(fs.readFileSync(STATE, 'utf8'));
      const id = `pay_GROWTH${++state.counter}`;
      state.payments[id] = {
        id,
        order_id: orderId,
        amount,
        currency: 'INR',
        status: 'captured',
        captured: true,
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
  }
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon\.ico$|tile\.openstreetmap/.test(m.location().url ?? ''))
      errors.push(`${page.url()} ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
async function audit(page, name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(async () =>
    (
      await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })
    ).violations.map((v) => `${v.id}(${v.nodes.length})`),
  );
  check(`axe ${name} (1440)`, result.length === 0, result.join(', '));
  await page.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  const phone = await page.context().newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(page.url(), { waitUntil: 'networkidle' });
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.close();
}

const guest = await context(
  { name: 'rentra_session', value: process.env.GATE_GUEST_TOKEN, url: web },
  true,
);
const admin = await context({ name: 'rentra_admin', value: tokens.admin, url: web });
/** Book `count` room-only rooms through the UI; returns the order id. */
async function book(listing, checkin, checkout, count, adults) {
  await guest.goto(
    `${listing}?checkin=${checkin}&checkout=${checkout}&rooms=${count}&adults=${adults}`,
    {
      waitUntil: 'networkidle',
    },
  );
  for (let i = 0; i < count; i++)
    await guest
      .getByRole('button', { name: /^Add a Room only room$/ })
      .first()
      .click();
  const rail = guest.getByRole('complementary', { name: 'Your selection' });
  await rail.getByText(new RegExp(`^Total for ${count} room`)).waitFor({ timeout: 20000 });
  await rail.getByRole('button', { name: 'Reserve' }).click();
  await guest.waitForURL(/\/checkout\/review\//, { timeout: 30000 });
  for (let i = 1; i < count; i++)
    await guest.getByLabel(new RegExp(`^Room ${i + 1} · `)).fill(`Guest ${i + 1}`);
  await guest.getByText('I agree to these booking terms').click();
  await guest.getByRole('button', { name: 'Continue to payment' }).click();
  await guest.waitForURL(/\/checkout\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const orderId = guest.url().split('/').pop();
  await guest.getByRole('button', { name: /^Pay ₹/ }).click();
  await guest.getByRole('heading', { name: 'You’re all set!' }).waitFor({ timeout: 30000 });
  return orderId;
}
const roomStates = async (orderId) =>
  (
    await sql`SELECT br.state::text FROM booking_room br JOIN booking b ON b.id=br.booking_id WHERE b.order_id=${orderId} ORDER BY br.id`
  ).map((r) => r.state);

try {
  const [hotel] =
    await sql`SELECT slug, public_code FROM rentable WHERE slug='riverside-residency-surat'`;
  const listing = `${web}/listing/${hotel.slug}-${hotel.public_code}`;

  // 1. Two rooms, cancel one.
  const twoRooms = await book(listing, day(80), day(82), 2, 4);
  check('two rooms booked', (await roomStates(twoRooms)).join() === 'booked,booked');
  await guest.goto(`${web}/bookings/${twoRooms}/cancel`, { waitUntil: 'networkidle' });
  await guest.locator('input[type="checkbox"]').first().check();
  const roomBoxes = guest
    .getByRole('group', { name: /Choose rooms/ })
    .locator('input[type="checkbox"]');
  if ((await roomBoxes.count()) === 2) await roomBoxes.nth(1).uncheck();
  await guest.getByRole('button', { name: 'Preview cancellation' }).click();
  await guest
    .getByText('I accept this refund estimate and cancellation of only these visits.')
    .waitFor({ timeout: 20000 });
  await audit(guest, '01-cancel-one-room');
  await guest
    .getByText('I accept this refund estimate and cancellation of only these visits.')
    .click();
  await guest.getByRole('button', { name: 'Confirm cancellation' }).click();
  await guest.waitForTimeout(3000);
  const afterCancel = (await roomStates(twoRooms)).sort().join();
  check(
    'one room released, the other still booked',
    afterCancel === 'booked,released',
    afterCancel,
  );

  // 2. Voucher for the remaining room.
  await guest.goto(`${web}/bookings/${twoRooms}`, { waitUntil: 'networkidle' });
  await guest.getByRole('link', { name: 'Voucher' }).click();
  await guest.waitForURL(/\/voucher$/);
  await guest
    .getByText(/not a tax invoice/i)
    .first()
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  check(
    'voucher says not a tax invoice',
    (await guest.getByText(/not a tax invoice/i).count()) >= 1,
  );
  await audit(guest, '02-voucher');

  // 3. Change dates: book, then change from the booking page; paying the new one cancels the old.
  const original = await book(listing, day(90), day(92), 1, 2);
  await guest.goto(`${web}/bookings/${original}`, { waitUntil: 'networkidle' });
  const changeLink = guest.getByRole('link', { name: 'Change dates or rooms' });
  check('booking offers Change dates or rooms', (await changeLink.count()) === 1);
  const href = new URL(await changeLink.getAttribute('href'), web);
  href.searchParams.set('checkin', day(95));
  href.searchParams.set('checkout', day(97));
  await guest.goto(href.toString(), { waitUntil: 'networkidle' });
  check(
    'hotel page shows the change banner',
    (await guest.getByText(/Changing booking/).count()) >= 1,
  );
  await audit(guest, '03-change-hotel-page');
  await guest
    .getByRole('button', { name: /^Add a Room only room$/ })
    .first()
    .click();
  const rail = guest.getByRole('complementary', { name: 'Your selection' });
  await rail.getByText(/^Total for 1 room/).waitFor({ timeout: 20000 });
  await rail.getByRole('button', { name: 'Reserve' }).click();
  await guest.waitForURL(/\/checkout\/review\//, { timeout: 30000 });
  await guest
    .getByText(/replaces your earlier one/)
    .waitFor({ timeout: 20000 })
    .catch(() => {});
  check(
    'checkout says it replaces the earlier booking',
    (await guest.getByText(/replaces/i).count()) >= 1,
  );
  await guest.getByText('I agree to these booking terms').click();
  await guest.getByRole('button', { name: 'Continue to payment' }).click();
  await guest.waitForURL(/\/checkout\/[0-9a-f-]{36}$/, { timeout: 30000 });
  await guest.getByRole('button', { name: /^Pay ₹/ }).click();
  await guest.getByRole('heading', { name: 'You’re all set!' }).waitFor({ timeout: 30000 });
  const [old] =
    await sql`SELECT o.state, (SELECT sum(ra.expected_minor)::int FROM refund_allocation ra JOIN booking b ON b.id=ra.booking_id WHERE b.order_id=o.id) AS refunded,
    (SELECT expected_minor::int FROM payment_order WHERE booking_order_id=o.id) AS paid FROM booking_order o WHERE o.id=${original}`;
  check(
    'old booking cancelled and refunded in full',
    old.state === 'cancelled' && old.refunded === old.paid,
    JSON.stringify(old),
  );

  // 4. Admin weekly KPIs.
  await admin.goto(`${web}/admin/finance/hotel-analytics`, { waitUntil: 'networkidle' });
  check(
    'admin sees weekly KPIs',
    (await admin.getByRole('heading', { name: 'Weekly KPIs' }).count()) === 1,
  );
  await audit(admin, '04-admin-kpis');
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await guest.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
