// CP36 venue checkout (entertainment plan, Phase 10). Disposable stack only:
//   GATE_DB_JSON  {url} of a disposable DB seeded with venue-fixture (venue001), test payments on,
//                 and an active customer 9898981234 named "QA Player"
//   API :4106 with RAZORPAY_KEY_SECRET=$GATE_RZP_SECRET and the file-backed fake Razorpay at
//   $FAKE_RAZORPAY_STATE; web :3106 (next dev); PLAYWRIGHT_DIR has playwright-core + @axe-core/playwright.
// Venue → time → OTP login hand-off → review → hold → test payment → confirmed → .ics →
// booking record → cancel preview (hour bands) → book again, plus the farmhouse-unchanged copy check.
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const req = createRequire(process.env.PLAYWRIGHT_DIR || process.cwd() + '/');
const { chromium } = req('playwright-core');
import { auditPage } from './browser-audit.mjs';
const postgres = createRequire(new URL('../../../rentra-backend/package.json', import.meta.url))(
  'postgres',
);
const db = JSON.parse(await readFile(process.env.GATE_DB_JSON, 'utf8'));
if (!/^postgres:\/\/postgres@127\.0\.0\.1:55432\//.test(db.url))
  throw new Error('refusing non-disposable database');
const STATE = process.env.FAKE_RAZORPAY_STATE;
const SECRET = process.env.GATE_RZP_SECRET;
const OUT = process.env.GATE_OUT || '/tmp';
const sql = postgres(db.url, { max: 1, onnotice: () => {} });
const web = 'http://localhost:3106';
const path = '/listing/smash-arena-venue001';

// Re-runnable: drop this fixture phone's OTP challenges (resend cooldown) and earlier orders' courts.
await sql`DELETE FROM otp_challenge WHERE identifier LIKE '%9898981234'`;

let d = new Date(Date.now() + 5.5 * 36e5 + 3 * 864e5);
while ([0, 6].includes(d.getUTCDay())) d = new Date(+d + 864e5);
const date = d.toISOString().slice(0, 10);
const results = [];
const check = (name, pass, detail = '') => {
  results.push(!!pass);
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass ? '' : ' — ' + detail));
};
const browser = await chromium.launch({
  executablePath: process.env.CHROME || undefined,
});
const problems = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
// Razorpay's checkout.js is replaced by a stub that "captures" in the fake provider and
// answers with a real HMAC signature, so the API's verify path runs unchanged.
await context.exposeFunction('qaPay', async (orderId, amount) => {
  const state = existsSync(STATE)
    ? JSON.parse(await readFile(STATE, 'utf8'))
    : { counter: 0, orders: {}, payments: {} };
  const id = `pay_QA${++state.counter}`;
  state.payments[id] = {
    id,
    order_id: orderId,
    amount,
    currency: 'INR',
    status: 'captured',
    captured: true,
    method: 'upi',
  };
  await writeFile(STATE, JSON.stringify(state));
  return {
    razorpay_payment_id: id,
    razorpay_order_id: orderId,
    razorpay_signature: createHmac('sha256', SECRET).update(`${orderId}|${id}`).digest('hex'),
  };
});
await context.route('https://checkout.razorpay.com/v1/checkout.js', (route) =>
  route.fulfill({
    contentType: 'application/javascript',
    body: `window.Razorpay = function (o) { this.on = function () {}; this.open = async function () {
      o.handler(await window.qaPay(o.order_id, o.amount)); }; };`,
  }),
);
const page = await context.newPage();
page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
page.on(
  'console',
  (m) =>
    m.type() === 'error' &&
    !/favicon|React DevTools|checkout\.razorpay/.test(m.text()) &&
    problems.push('console ' + m.text().slice(0, 200)),
);
const axe = async (name) => {
  const r = await auditPage(page, 'main');
  check(
    name + ' axe 0',
    r.violations.length === 0,
    r.violations.map((v) => v.id + ':' + v.nodes[0]?.target.join(' ')).join(', '),
  );
};
let interactions = 0;
const act = async (fn) => {
  interactions += 1;
  await fn();
};

try {
  // 1. Signed out on the venue: pick a time and a court, then log in.
  await page.goto(web + path + '?date=' + date, { waitUntil: 'networkidle' });
  const rail = page.locator('#book');
  await act(() => rail.getByRole('button', { name: /^7:00 PM to 8:00 PM/ }).click());
  await act(() => rail.getByLabel('Court', { exact: true }).selectOption({ label: 'Court 2' }));
  await rail.getByRole('button', { name: 'Log in to book' }).click();
  await page.waitForURL(/\/login/);
  await page.locator('#phone').fill('9898981234');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByLabel('Digit 1 of 6').click();
  await page.keyboard.type('123456');
  await page.getByRole('button', { name: 'Verify & log in' }).click();
  await page.waitForURL(new RegExp(path.replace(/[/.]/g, '\\$&')), { timeout: 20000 });
  await rail.locator('[data-quote-total]').waitFor({ timeout: 20000 });
  check(
    'login hand-off keeps 7 PM on Court 2',
    (await rail.locator('button[aria-pressed="true"]').filter({ hasText: '7:00 PM' }).count()) ===
      1 &&
      (await rail.getByLabel('Court', { exact: true }).inputValue()).length > 30 &&
      /court=/.test(page.url()),
    page.url(),
  );
  check(
    'no rail tick for a venue without deposit',
    (await rail.getByRole('checkbox').count()) === 0,
  );

  // 2. Review.
  await act(() => rail.getByRole('link', { name: 'Review booking' }).click());
  await page.waitForURL(/\/checkout\/review\//);
  const main = page.locator('main');
  const text = await main.innerText();
  check('review: Your booking section', /Your booking/.test(text));
  check('review: time 7:00 pm – 8:00 pm', /7:00 pm – 8:00 pm/.test(text));
  check('review: chosen court and activity', /Court 2/.test(text) && /Box cricket/.test(text));
  check('review: court rent label', /Court rent · 1 hr/.test(text));
  check(
    'review: hour-band deadline (full refund until 24 hours before)',
    /Cancel before .*7:00 pm for a full rent refund/.test(text) &&
      /Deadlines count in hours/.test(text),
    text.match(/Cancel before[^\n]*/)?.[0],
  );
  check('review: venue rules shown', /Venue rules/.test(text) && /No smoking/.test(text));
  check('review: no deposit line', !/refundable deposit/.test(text));
  check('review: venue purposes', /Friendly match/.test(text) && !/Pool day/.test(text));
  await axe('review 1440');
  await page.screenshot({ path: `${OUT}/review-1440.png`, fullPage: true });
  await page.getByRole('button', { name: 'Friendly match' }).click();
  await act(() => page.getByRole('checkbox', { name: /I agree to these booking terms/ }).check());
  await act(() => page.getByRole('button', { name: 'Continue to payment' }).click());

  // 3. Hold → pay.
  await page.waitForURL(/\/checkout\/[0-9a-f-]{36}$/, { timeout: 20000 });
  const orderId = page.url().split('/').pop();
  await page
    .getByRole('button', { name: /^Pay ₹/ })
    .first()
    .waitFor({ timeout: 20000 });
  check(
    'held: court reserved for you',
    /Court 2/.test(await main.innerText()) && /reserved for you/.test(await main.innerText()),
  );
  check(
    'held: time wording',
    /Your time is held/.test(await main.innerText()),
    (await main.innerText()).slice(0, 300),
  );
  await act(() =>
    page
      .getByRole('button', { name: /^Pay ₹/ })
      .first()
      .click(),
  );
  await page.getByText('You’re all set!').waitFor({ timeout: 30000 });
  const confirmed = await main.innerText();
  check(
    'confirmed: court, time and arrive-early rule',
    /Enjoy your game/.test(confirmed) &&
      /Court 2, .*7:00 pm – 8:00 pm/.test(confirmed) &&
      /Arrive 10 minutes early/.test(confirmed),
    confirmed.match(/Enjoy your game[^\n]*\n?[^\n]*/)?.[0],
  );
  check('confirmed: hour-based cancellation copy', /counted in hours/.test(confirmed));
  await axe('confirmed 1440');
  await page.screenshot({ path: `${OUT}/confirmed-1440.png`, fullPage: true });
  check(`≤ 6 interactions from the venue page to paid (${interactions})`, interactions <= 6);

  // 4. Calendar file and booking record.
  const ics = await (await page.request.get(`${web}/bookings/${orderId}/calendar`)).text();
  check(
    '.ics names the court and activity',
    /Court 2/.test(ics) && /Box cricket/.test(ics),
    ics.slice(0, 400),
  );
  await page.goto(`${web}/bookings/${orderId}`, { waitUntil: 'networkidle' });
  check(
    'booking record uses describeVisit',
    /7:00 pm – 8:00 pm · Court 2 · Box cricket/.test(await main.innerText()),
  );
  const summary = await (await page.request.get(`${web}/bookings/${orderId}/summary`)).text();
  check(
    'summary .txt labels the visit and lists venue rules',
    /Court 2 · Box cricket/.test(summary) && /No smoking/.test(summary),
    summary.slice(0, 500),
  );

  // 5. Cancel preview: more than 24 hours ahead, moderate → the full rent back.
  const [{ rent }] =
    await sql`SELECT b.amount_rent_minor::int AS rent FROM booking b WHERE b.order_id=${orderId}`;
  await page.goto(`${web}/bookings/${orderId}/cancel`, { waitUntil: 'networkidle' });
  const visitBox = main.getByRole('checkbox').first();
  if (await visitBox.count()) await visitBox.check();
  await page.getByRole('button', { name: 'Preview cancellation' }).click();
  await page.getByText('Review your cancellation').waitFor();
  const preview = await main.innerText();
  const rupees = `₹${(rent / 100).toLocaleString('en-IN')}`;
  check(
    `cancel preview refunds the full rent ${rupees}`,
    preview.includes(`Test refund for this visit: ${rupees}`) &&
      /100% rent entitlement/.test(preview),
    preview.match(/Test refund[^\n]*/)?.[0],
  );
  await axe('cancel 1440');
  await page.screenshot({ path: `${OUT}/cancel-1440.png`, fullPage: true });

  // 6. Book again: the venue page, same activity, duration and players a week later.
  await page.goto(`${web}/bookings/${orderId}/again`, { waitUntil: 'networkidle' });
  const next = new Date(Date.parse(date + 'T12:00:00Z') + 7 * 864e5).toISOString().slice(0, 10);
  check(
    'book again opens the venue a week later',
    page.url().includes(path) &&
      page.url().includes(`date=${next}`) &&
      /activity=box-cricket/.test(page.url()) &&
      /duration=60/.test(page.url()),
    page.url(),
  );
} finally {
  console.log('problems', problems);
  console.log(results.filter(Boolean).length + '/' + results.length + ' passed');
  await browser.close();
  await sql.end();
  if (results.some((ok) => !ok) || problems.length) process.exitCode = 1;
}
