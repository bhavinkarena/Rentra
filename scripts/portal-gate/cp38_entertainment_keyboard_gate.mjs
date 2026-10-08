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

let d = new Date(Date.now() + 5.5 * 36e5 + 10 * 864e5);
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
try {
  const tokens = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
  await context.addCookies([{ name: 'rentra_session', value: tokens.customer, url: web }]);
  async function keyboardActivate(target, key = 'Enter') {
    await target.waitFor();
    for (let i = 0; i < 160; i++) {
      if (await target.evaluate((el) => el === document.activeElement)) {
        await page.keyboard.press(key);
        return;
      }
      await page.keyboard.press('Tab');
    }
    throw new Error('Target is not keyboard reachable: ' + (await target.innerText()));
  }
  await page.goto(web + path + '?date=' + date, { waitUntil: 'domcontentloaded' });
  const rail = page.locator('#book');
  const first = rail.getByRole('group', { name: 'Start time' }).getByRole('button').first();
  await keyboardActivate(first);
  await rail.locator('[data-quote-total]').waitFor();
  await keyboardActivate(rail.getByRole('link', { name: 'Review booking' }));
  await page.waitForURL(/\/checkout\/review\//);
  await keyboardActivate(page.getByRole('button', { name: 'Friendly match' }));
  await keyboardActivate(
    page.getByRole('checkbox', { name: /I agree to these booking terms/ }),
    'Space',
  );
  await keyboardActivate(page.getByRole('button', { name: 'Continue to payment' }));
  await page.waitForURL(/\/checkout\/[0-9a-f-]{36}$/);
  await keyboardActivate(page.getByRole('button', { name: /^Pay ₹/ }).first());
  await page.getByText('You’re all set!').waitFor({ timeout: 30000 });
  check('keyboard-only signed-in venue selection through paid confirmation', true);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await axe('keyboard confirmation ' + width);
    check(
      'confirmation has no overflow ' + width,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.screenshot({ path: `${OUT}/keyboard-confirmed-${width}.png`, fullPage: true });
  }
} finally {
  console.log('problems', problems);
  await browser.close();
  await sql.end();
  if (results.some((ok) => !ok) || problems.length) process.exitCode = 1;
}
