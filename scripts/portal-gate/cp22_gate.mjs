import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  { chromium } = require(
    process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
  );
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8')),
  web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  }),
  results = [];
let completed = false;
const check = (name, pass) => {
  results.push({ check: name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};
try {
  const context = async (kind) => {
    const c = await browser.newContext({
      viewport: { width: 1280, height: 950 },
      acceptDownloads: true,
    });
    if (kind)
      await c.addCookies([
        {
          name: ['admin', 'limited'].includes(kind) ? 'rentra_admin' : 'rentra_session',
          value: f.tokens[kind],
          url: web,
        },
      ]);
    return c;
  };
  const admin = await context('admin'),
    owner = await context('owner'),
    other = await context('other'),
    limited = await context('limited'),
    customer = await context('customer'),
    anon = await context();
  const q = `period=${f.finance.period}&environment=live`,
    base = '/partner/finance',
    ab = '/admin/payments/finance';
  check('anonymous finance denied', (await anon.request.get(api + base)).status() === 401);
  check('customer finance denied', (await customer.request.get(api + base)).status() === 403);
  check('owner admin audience denied', (await owner.request.get(api + ab)).status() === 401);
  check(
    'operator without payment read denied',
    (await limited.request.get(api + ab)).status() === 403,
  );
  const get = async (c, path) => (await (await c.request.get(api + path)).json()).data;
  const s = await get(owner, base + '?' + q);
  check(
    'statement totals reconcile',
    s.count === 2 &&
      s.totals.collectedMinor === '108000' &&
      s.totals.refundedMinor === '20000' &&
      s.totals.eligibleMinor === '40000' &&
      s.totals.settledMinor === '30000',
  );
  const allocation = await get(owner, base + '/allocations/' + f.finance.live.allocationId);
  check(
    'detail reconciles with statement',
    allocation.collectedMinor === '100000' &&
      allocation.refunds.length === 3 &&
      allocation.refundedMinor === '20000',
  );
  const payouts = await get(owner, base + '/payouts?' + q),
    payout = await get(owner, base + '/payouts/' + f.finance.payoutId);
  check(
    'payout list and detail reconcile',
    payouts.totalMinor === payout.amountMinor && payout.amountMinor === '30000',
  );
  check(
    'pinned destination masked',
    payout.destination.version === 1 &&
      payout.destination.masked.includes('6789') &&
      !JSON.stringify(payout).includes('account_last4'),
  );
  check(
    'foreign allocation hidden',
    (
      await other.request.get(api + base + '/allocations/' + f.finance.live.allocationId)
    ).status() === 404,
  );
  check(
    'foreign payout hidden',
    (await other.request.get(api + base + '/payouts/' + f.finance.payoutId)).status() === 404,
  );
  check(
    'foreign export rejected',
    (
      await other.request.get(api + base + '/statement.csv?' + q + '&ownerId=' + f.ids.owner)
    ).status() === 404,
  );
  check(
    'unknown allocation hidden',
    (
      await owner.request.get(api + base + '/allocations/' + f.finance.unresolved.allocationId)
    ).status() === 404,
  );
  const a = await get(admin, ab + '?' + q);
  check(
    'admin unresolved history visible',
    a.count === 4 && a.items.some((x) => x.attribution === 'unresolved'),
  );
  for (const environment of ['test', 'simulated', 'legacy_unknown']) {
    const x = await get(owner, base + `?period=${f.finance.period}&environment=${environment}`);
    check(
      environment + ' cannot become live eligibility',
      x.totals.eligibleMinor === '0' && x.totals.settledMinor === '0',
    );
  }
  check(
    'invalid period rejected',
    (await owner.request.get(api + base + '?period=2026-99')).status() === 400,
  );
  check(
    'finance has no disbursement command',
    (
      await owner.request.post(api + base + '/payouts/' + f.finance.payoutId, {
        data: { status: 'paid' },
      })
    ).status() >= 400,
  );
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (page, label) => {
    check(
      label + ' no horizontal overflow',
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((x) =>
        ['serious', 'critical'].includes(x.impact),
      ),
    );
    if (violations.length)
      console.log(
        JSON.stringify(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }))),
      );
    check(label + ' axe clean', !violations.length);
  };
  const p = await owner.newPage();
  await p.goto(web + '/partner/finance?' + q, { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Finance statements · ' + f.finance.period }).waitFor();
  check(
    'owner finance discoverable',
    await p.getByRole('link', { name: 'Finance', exact: true }).isVisible(),
  );
  check(
    'settlement limitation visible',
    await p
      .getByText('Live payout execution and bank verification are unavailable.', { exact: false })
      .isVisible(),
  );
  await scan(p, 'owner statement desktop');
  await p.getByLabel('Property', { exact: true }).selectOption(f.ids.listing);
  await p.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await p.waitForURL(/propertyId=/);
  check(
    'property filter persists',
    (await p.getByLabel('Property', { exact: true }).inputValue()) === f.ids.listing,
  );
  await p.getByRole('link', { name: 'Open period statement' }).click();
  await p.getByRole('heading', { name: 'Statement · ' + f.finance.period }).waitFor();
  check(
    'period statement retains filters',
    new URL(p.url()).searchParams.get('propertyId') === f.ids.listing,
  );
  await p.getByLabel('UTC month', { exact: true }).fill('2000-01');
  await p.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await p.getByRole('heading', { name: 'Finance statements · 2000-01' }).waitFor();
  check(
    'period detail filter changes the month',
    new URL(p.url()).searchParams.get('period') === '2000-01',
  );
  const downloadResponse = await owner.request.get(
    web + `/partner/statements/${f.finance.period}/download?` + q,
  );
  const csv = await downloadResponse.text();
  check(
    'scoped CSV download reconciles',
    downloadResponse.status() === 200 && csv.includes('108000') && csv.includes('current refund'),
  );
  check(
    'CSV has attachment and no-store headers',
    downloadResponse.headers()['content-disposition']?.includes('attachment') &&
      downloadResponse.headers()['cache-control']?.includes('no-store'),
  );
  await p.goto(web + '/partner/allocations/' + f.finance.live.allocationId, {
    waitUntil: 'networkidle',
  });
  await p.getByRole('heading', { name: 'Allocation detail' }).waitFor();
  check(
    'refund adjustments visible',
    await p.getByRole('heading', { name: 'Refund adjustments' }).isVisible(),
  );
  await p.getByRole('link', { name: 'Payout detail', exact: true }).click();
  await p.getByRole('heading', { name: 'Payout detail · paid' }).waitFor();
  check(
    'payout reference and destination visible',
    (await p.getByText('Provider reference: FIXTURE-UTR', { exact: true }).isVisible()) &&
      (await p.getByText(/Pinned destination v1/).isVisible()),
  );
  await p.setViewportSize({ width: 390, height: 844 });
  await scan(p, 'owner payout mobile');
  await p.goto(web + '/partner/finance?period=2000-01', { waitUntil: 'networkidle' });
  check(
    'empty period explained',
    await p.getByText(/No allocations match this period/).isVisible(),
  );
  await p.goto(web + '/partner/finance?period=bad', { waitUntil: 'networkidle' });
  check(
    'invalid filters recoverable',
    await p.getByRole('heading', { name: 'Check the statement filters' }).isVisible(),
  );
  const ap = await admin.newPage();
  await ap.goto(web + '/admin/finance/statements?' + q, { waitUntil: 'networkidle' });
  await ap.getByRole('heading', { name: 'Finance statements · ' + f.finance.period }).waitFor();
  check(
    'unresolved owner visible in admin UI',
    (await ap
      .getByText('Owner attribution unresolved — excluded from owner statements.', { exact: true })
      .count()) === 2,
  );
  await ap.getByLabel('Environment').focus();
  check(
    'filter keyboard focus',
    await ap.getByLabel('Environment').evaluate((el) => el === document.activeElement),
  );
  await ap.setViewportSize({ width: 390, height: 844 });
  await scan(ap, 'admin statement mobile');
  await ap.goto(web + '/admin/finance/allocations/' + f.finance.live.allocationId, {
    waitUntil: 'networkidle',
  });
  check(
    'admin payment and refund links',
    (await ap.getByRole('link', { name: 'Payment evidence' }).isVisible()) &&
      (await ap.getByRole('link', { name: 'Refund detail', exact: true }).count()) === 3,
  );
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part22-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
