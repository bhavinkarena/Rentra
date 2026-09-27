// CP19 browser/API gate. Requires the disposable published fixture on :4106 started with
// FAKE_RAZORPAY_STATE and RAZORPAY_TEST_* set, seeded with seed-pricing-operations-gate.mjs then
// seed-payment-investigation-gate.mjs (same variables), and isolated Next on :3106.
// GATE_WEBHOOK_SECRET must equal the fixture's RAZORPAY_TEST_WEBHOOK_SECRET.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const results = [];
let completed = false;
const check = (name, pass, info) => {
  results.push({ check: name, pass: !!pass });
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${name}${pass || info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 600)}`,
  );
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const ctx = async (kind) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (kind)
      await c.addCookies([
        {
          name: ['admin', 'limited'].includes(kind) ? 'rentra_admin' : 'rentra_session',
          value: fixture.tokens[kind],
          url: web,
        },
      ]);
    return c;
  };
  const admin = await ctx('admin'),
    limited = await ctx('limited'),
    owner = await ctx('owner'),
    anon = await ctx();
  const { paid, stuck, unknown, simulated } = fixture.payments;
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (label, target) => {
    check(
      `${label} no overflow`,
      await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await target.addScriptTag({ content: axe });
    const violations = await target.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html.slice(0, 120)) })),
    );
    check(`${label} axe clean`, !violations.length, violations);
  };
  const list = async (query = '') =>
    (await (await admin.request.get(`${api}/admin/payments/orders${query}`)).json()).data;
  const detail = async (id) =>
    (await (await admin.request.get(`${api}/admin/payments/orders/${id}`)).json()).data;

  check(
    'anonymous payment list denied',
    (await anon.request.get(`${api}/admin/payments/orders`)).status() === 401,
  );
  check(
    'owner cookie cannot read payments',
    (await owner.request.get(`${api}/admin/payments/orders`)).status() === 401,
  );
  check(
    'records-only admin cannot read payments',
    (await limited.request.get(`${api}/admin/payments/orders`)).status() === 403,
  );

  // Totals: Test only by default; list items add up to the totals; simulated never mixes in.
  const testData = await list();
  const sum = (key) => testData.items.reduce((total, item) => total + item[key], 0);
  check(
    'default view is Test with a single Test total',
    testData.environment === 'test' &&
      testData.totals.length === 1 &&
      testData.totals[0].environment === 'test',
  );
  check(
    'Test totals equal the sum of their rows (no duplicated joins)',
    testData.total === testData.items.length &&
      testData.totals[0].capturedMinor === sum('capturedMinor') &&
      testData.totals[0].refundPendingMinor === sum('refundPendingMinor') &&
      testData.totals[0].expectedMinor === sum('expectedMinor'),
    testData.totals,
  );
  check(
    'simulated payment absent from Test',
    !testData.items.some((i) => i.id === simulated.paymentOrderId) &&
      testData.totals[0].simulatedMinor === 0,
  );
  const allData = await list('?environment=all');
  check(
    'All view keeps environments in separate totals',
    allData.totals.map((t) => t.environment).join() === 'simulated,test' &&
      allData.totals.find((t) => t.environment === 'simulated').capturedMinor === 0,
  );
  check(
    'unknown filter values fall back safely',
    (await list('?environment=bogus&state=nope')).environment === 'test',
  );

  const page = await admin.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${web}/admin/finance/payments`, { waitUntil: 'networkidle' });
  const totalsRegion = page.getByRole('region', { name: 'Totals by environment' });
  check(
    'list shows verified Test totals and actual bank money ₹0',
    (await totalsRegion.innerText()).includes('Captured · verified') &&
      (await totalsRegion.getByText('₹0.00').count()) > 0,
  );
  await page.getByRole('link', { name: 'All', exact: true }).click();
  await page.waitForURL(/environment=all/);
  check(
    'All tab renders one card per environment',
    (await page
      .getByRole('region', { name: 'Totals by environment' })
      .getByText('Simulated (no money)')
      .count()) === 1,
  );
  await page.goto(`${web}/admin/finance/payments?attention=needs_review`, {
    waitUntil: 'networkidle',
  });
  const review = (await list('?attention=needs_review')).items.map((i) => i.id);
  check(
    'Needs review lists the unresolved payments only',
    review.includes(stuck.paymentOrderId) &&
      review.includes(unknown.paymentOrderId) &&
      !review.includes(paid.paymentOrderId),
  );
  check(
    'search by provider order id finds exactly one payment',
    (await list(`?q=${stuck.providerOrderId}`)).items.map((i) => i.id).join() ===
      stuck.paymentOrderId,
  );
  await page.goto(`${web}/admin/finance/payments?q=SIM-CP19`, { waitUntil: 'networkidle' });
  check(
    'empty filtered view says so',
    await page.getByRole('heading', { name: 'No payments match this view' }).isVisible(),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${web}/admin/finance/payments?environment=all`, { waitUntil: 'networkidle' });
  await scan('payment list mobile', page);
  const firstLink = page.getByRole('link', { name: /^Open payment for / }).first();
  await firstLink.focus();
  check(
    'payment link keyboard focusable',
    await firstLink.evaluate((el) => el === document.activeElement),
  );
  await page.setViewportSize({ width: 1280, height: 950 });

  // Paid payment: allocations, pending refund, masked key, no secrets.
  const paidData = await detail(paid.paymentOrderId);
  const allocated = paidData.transactions
    .flatMap((t) => t.allocations)
    .reduce((s, a) => s + a.actualMinor, 0);
  check(
    'detail allocations equal the verified capture',
    allocated === paidData.capturedMinor && paidData.capturedMinor > 0,
  );
  check(
    'pending refund linked with its visit allocation',
    paidData.status.key === 'refund_pending' &&
      paidData.refunds.length === 1 &&
      paidData.refunds[0].allocations.length > 0,
  );
  const raw = JSON.stringify(paidData);
  check(
    'no secrets, snapshots or full key id leave the API',
    /^rzp_test_…[A-Za-z0-9]{4}$/.test(paidData.execution.credential) &&
      !raw.includes(process.env.GATE_KEY_ID ?? 'rzp_test_CP19GATE') &&
      !/secret|snapshot|request_hash|idempotency/i.test(raw),
  );
  await page.goto(`${web}/admin/finance/payments/${paid.paymentOrderId}`, {
    waitUntil: 'networkidle',
  });
  check(
    'paid detail shows refund pending and no re-fetch',
    (await page.getByText('Captured · refund pending').count()) > 0 &&
      (await page.getByRole('button', { name: 'Re-fetch from provider' }).count()) === 0,
  );

  // A signed webhook is stored (as an object) and shown in the event timeline.
  const body = Buffer.from(
    JSON.stringify({
      event: 'payment.captured',
      payload: { payment: { entity: { id: 'pay_FAKESTUCK', order_id: stuck.providerOrderId } } },
    }),
  );
  const signature = createHmac('sha256', process.env.GATE_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  const hook = await anon.request.post('http://localhost:4106/webhooks/razorpay', {
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': 'evt_CP19STUCK',
    },
    data: body,
  });
  const forged = await anon.request.post('http://localhost:4106/webhooks/razorpay', {
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': 'f'.repeat(64),
      'x-razorpay-event-id': 'evt_CP19FORGED',
    },
    data: body,
  });
  const stuckBefore = await detail(stuck.paymentOrderId);
  check(
    'signed webhook stored; forged webhook refused',
    hook.ok() &&
      forged.status() === 400 &&
      stuckBefore.events.some((e) => e.externalEventId === 'evt_CP19STUCK'),
  );
  check(
    'a received callback alone does not mark paid',
    stuckBefore.state !== 'succeeded' && stuckBefore.capturedMinor === 0,
  );

  // Re-fetch: read-only denied; disabled gateway still settles the outstanding payment once.
  check(
    'records-only admin cannot re-fetch',
    (
      await limited.request.post(`${api}/admin/payments/orders/reconcile`, {
        data: { id: stuck.paymentOrderId, requestKey: randomUUID() },
      })
    ).status() === 403,
  );
  await page.goto(`${web}/admin/finance/payments/${stuck.paymentOrderId}`, {
    waitUntil: 'networkidle',
  });
  check(
    'paused gateway still reconciles outstanding payments',
    await page
      .getByText('New payment attempts are paused. This existing payment is still reconciled.')
      .isVisible(),
  );
  check(
    'provider event appears in the timeline',
    await page.getByText('evt_CP19STUCK').isVisible(),
  );
  const refetch = page.getByRole('button', { name: 'Re-fetch from provider' });
  await refetch.focus();
  check(
    're-fetch button keyboard focusable',
    await refetch.evaluate((el) => el === document.activeElement),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await scan('payment detail mobile', page);
  await page.setViewportSize({ width: 1280, height: 950 });
  await refetch.click();
  await page
    .getByText('Re-fetched from the provider. Only what the provider verified was recorded.')
    .first()
    .waitFor();
  const stuckAfter = await detail(stuck.paymentOrderId);
  check(
    're-fetch records the verified capture and confirms the booking',
    stuckAfter.state === 'succeeded' &&
      stuckAfter.capturedMinor === stuckAfter.expectedMinor &&
      stuckAfter.booking.state === 'confirmed',
  );
  check(
    'a second re-fetch is refused with no second capture',
    (
      await admin.request.post(`${api}/admin/payments/orders/reconcile`, {
        data: { id: stuck.paymentOrderId, requestKey: randomUUID() },
      })
    ).status() === 409 &&
      (await detail(stuck.paymentOrderId)).transactions.filter((t) => t.kind === 'capture')
        .length === 1,
  );
  await page.reload({ waitUntil: 'networkidle' });
  check(
    'history records who re-fetched and the result',
    (await page.getByText(/re-fetch by .*: checked/i).count()) > 0 &&
      (await page.getByRole('button', { name: 'Re-fetch from provider' }).count()) === 0,
  );

  // Unknown provider outcome: honest message, nothing marked paid.
  await page.goto(`${web}/admin/finance/payments/${unknown.paymentOrderId}`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('button', { name: 'Re-fetch from provider' }).click();
  await page
    .getByText(
      'The provider could not confirm an outcome. Nothing was marked paid; the payment stays pending.',
    )
    .first()
    .waitFor();
  const unknownAfter = await detail(unknown.paymentOrderId);
  check(
    'unconfirmed outcome stays pending and visible',
    unknownAfter.state !== 'succeeded' &&
      unknownAfter.capturedMinor === 0 &&
      unknownAfter.status.attention,
  );

  // Booking record links to the investigation.
  await page.goto(`${web}/admin/bookings/${paid.orderId}?tab=payments`, {
    waitUntil: 'networkidle',
  });
  const investigate = page.getByRole('link', { name: 'Investigate payment' });
  check(
    'booking payments tab links to the investigation',
    (await investigate.getAttribute('href')) === `/admin/finance/payments/${paid.paymentOrderId}`,
  );

  await admin.request.post(`${api}/admin/auth/logout`);
  check(
    'revocation blocks the next payment read',
    (await admin.request.get(`${api}/admin/payments/orders`)).status() === 401,
  );
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part19-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
