// CP23 acceptance against the disposable published booking fixture.
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
  const ctx = async (kind) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
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
  const owner = await ctx('owner'),
    admin = await ctx('admin'),
    customer = await ctx('customer'),
    other = await ctx('other'),
    limited = await ctx('limited'),
    anon = await ctx();
  check('anonymous denied', (await anon.request.get(api + '/partner/disputes')).status() === 401);
  check(
    'admin payment read required',
    (await limited.request.get(api + '/admin/payments/disputes')).status() === 403,
  );
  check(
    'foreign booking context hidden',
    (await other.request.get(api + '/partner/disputes/context/' + f.booking.order)).status() ===
      404,
  );
  const p = await owner.newPage();
  await p.goto(web + '/partner/disputes/new?order=' + f.booking.order, {
    waitUntil: 'networkidle',
  });
  await p.getByLabel('Case type', { exact: true }).selectOption('deposit');
  await p.getByLabel('Shared subject').fill('CP23 fixture deposit concern');
  await p
    .getByLabel('Explanation', { exact: true })
    .fill('Private owner claim should not appear to the guest.');
  await p.getByRole('button', { name: 'Open dispute', exact: true }).click();
  await p.waitForURL(/\/partner\/disputes\/[0-9a-f-]{36}$/);
  const id = p.url().split('/').at(-1);
  const read = async (c, root) => (await (await c.request.get(`${api}${root}/${id}`)).json()).data;
  check(
    'deposit unavailable visible',
    await p.getByText(/Deposit collection, release and deduction are unavailable/).isVisible(),
  );
  check('owner body private', (await read(customer, '/customer/disputes')).messages.length === 0);
  check(
    'foreign case hidden',
    (await other.request.get(`${api}/partner/disputes/${id}`)).status() === 404,
  );
  const a = await admin.newPage();
  await a.goto(web + '/admin/disputes/' + id, { waitUntil: 'networkidle' });
  await a.getByText('Assignment', { exact: true }).click();
  await a.getByLabel('Finance operator').selectOption(f.ids.admin);
  const assign = a
    .locator('form')
    .filter({ has: a.getByRole('button', { name: 'Save assignment' }) });
  await assign.getByLabel('Explanation').fill('Assign to the reviewing finance administrator.');
  await assign.getByRole('button', { name: 'Save assignment' }).click();
  await a.waitForFunction(() => document.querySelector('input[name="version"]')?.value === '2');
  check(
    'assignment persisted',
    (await read(admin, '/admin/payments/disputes')).assigneeId === f.ids.admin,
  );
  await p
    .getByLabel('Explanation', { exact: true })
    .fill('This stale response must stay typed until reload.');
  await p.getByRole('button', { name: 'Send response' }).click();
  await p.getByRole('button', { name: 'Reload case' }).waitFor();
  check(
    'stale reply preserves input',
    (await p.getByLabel('Explanation', { exact: true }).inputValue()) ===
      'This stale response must stay typed until reload.',
  );
  await p.getByRole('button', { name: 'Reload case' }).click();
  await p.waitForFunction(() => document.querySelector('input[name="version"]')?.value === '2');
  await p
    .getByLabel('Explanation', { exact: true })
    .fill('Owner private photographed evidence for finance staff only.');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=',
    'base64',
  );
  await p
    .getByLabel('Evidence photos')
    .setInputFiles({ name: 'owner.png', mimeType: 'image/png', buffer: png });
  await p.getByRole('button', { name: 'Send response' }).click();
  await p.waitForFunction(() => document.querySelector('input[name="version"]')?.value === '3');
  const evidence = (await read(owner, '/partner/disputes')).messages.flatMap(
    (m) => m.attachments,
  )[0];
  check('owner photo saved', !!evidence);
  const photo = await owner.request.get(`${web}/partner/disputes/${id}/attachments/${evidence.id}`);
  check(
    'owner download returns image and no-store',
    photo.status() === 200 &&
      photo.headers()['content-type'].includes('image/png') &&
      photo.headers()['cache-control'].includes('no-store'),
  );
  check(
    'customer cannot read owner photo',
    (
      await customer.request.get(`${api}/customer/disputes/${id}/attachments/${evidence.id}`)
    ).status() === 404,
  );
  await a.reload({ waitUntil: 'networkidle' });
  await a.getByText('Request a participant response', { exact: true }).click();
  await a.getByLabel('Requested participant').selectOption('customer');
  const local = new Date(Date.now() + 86400000);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  await a.getByLabel('Response deadline', { exact: true }).fill(local.toISOString().slice(0, 16));
  const request = a
    .locator('form')
    .filter({ has: a.getByRole('button', { name: 'Request response', exact: true }) });
  await request
    .getByLabel('Explanation')
    .fill('Please provide your account and evidence of this visit.');
  await request.getByRole('button', { name: 'Request response', exact: true }).click();
  await a.waitForFunction(() => document.querySelector('input[name="version"]')?.value === '4');
  check(
    'customer response deadline recorded',
    (await read(customer, '/customer/disputes')).requestedParty === 'customer',
  );
  const cp = await customer.newPage();
  await cp.goto(`${web}/disputes/${id}`, { waitUntil: 'networkidle' });
  await cp
    .getByLabel('Explanation', { exact: true })
    .fill('Customer private photographed evidence for finance review.');
  await cp
    .getByLabel('Evidence photos')
    .setInputFiles({ name: 'customer.png', mimeType: 'image/png', buffer: png });
  await cp.getByRole('button', { name: 'Send response' }).click();
  await cp.waitForFunction(() => document.querySelector('input[name="version"]')?.value === '5');
  const customerRead = await read(customer, '/customer/disputes');
  check('customer response clears request', customerRead.requestedParty === null);
  check(
    'customer photo stays private',
    !(await read(owner, '/partner/disputes')).messages.some((m) =>
      m.body.startsWith('Customer private'),
    ),
  );
  await a.reload({ waitUntil: 'networkidle' });
  check(
    'admin sees both participant evidence',
    (await read(admin, '/admin/payments/disputes')).messages.flatMap((m) => m.attachments)
      .length === 2,
  );
  await a.getByLabel('Resolution reason').focus();
  check(
    'resolution keyboard focus',
    await a.getByLabel('Resolution reason').evaluate((el) => el === document.activeElement),
  );
  await a
    .getByLabel('Resolution reason')
    .fill('No actual deposit was collected; no financial action is authorized.');
  await a.getByRole('button', { name: 'Preview resolution' }).click();
  await a.getByRole('heading', { name: 'Review before resolving' }).waitFor();
  check(
    'preview does not resolve',
    (await read(admin, '/admin/payments/disputes')).state === 'open',
  );
  await a.getByRole('button', { name: 'Confirm resolution' }).click();
  await a.getByRole('heading', { name: 'Recorded resolution' }).waitFor();
  check('resolution shared', (await read(customer, '/customer/disputes')).state === 'resolved');
  check(
    'refund workflow linked',
    await a.getByRole('link', { name: 'Review refund in authoritative workflow' }).isVisible(),
  );
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  for (const [page, label] of [
    [a, 'admin'],
    [p, 'owner'],
    [cp, 'customer'],
  ]) {
    await page.reload({ waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 });
    check(
      label + ' mobile no overflow',
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.addScriptTag({ content: axe });
    const issues = await page.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact),
      ),
    );
    check(label + ' mobile axe clean', !issues.length);
  }
  f.disputeId = id;
  await writeFile(process.env.GATE_TOKENS, JSON.stringify(f));
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part23-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
