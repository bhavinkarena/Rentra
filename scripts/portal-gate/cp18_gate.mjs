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
  const admin = await context('admin'),
    owner = await context('owner'),
    other = await context('other'),
    limited = await context('limited'),
    customer = await context('customer'),
    anon = await context();
  const id = f.reviewId,
    root = `${api}/admin/reviews/${id}`,
    read = async () => (await (await admin.request.get(root)).json()).data;
  check('anonymous review detail denied', (await anon.request.get(root)).status() === 401);
  check('owner admin audience denied', (await owner.request.get(root)).status() === 401);
  check(
    'foreign owner detail denied',
    (await other.request.get(`${api}/partner/reviews/${id}`)).status() === 404,
  );
  check(
    'pending review absent from public',
    (await customer.request.get(`${api}/customer/reviews/${id}`)).status() === 404,
  );
  const p = await admin.newPage();
  p.setDefaultTimeout(30000);
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (page, label) => {
    check(
      label + ' no overflow',
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.addScriptTag({ content: axe });
    const v = await page.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((v) =>
        ['critical', 'serious'].includes(v.impact),
      ),
    );
    if (v.length)
      console.log(JSON.stringify(v.map((x) => ({ id: x.id, nodes: x.nodes.map((n) => n.html) }))));
    check(label + ' axe clean', !v.length);
  };
  await p.goto(`${web}/admin/reviews`, { waitUntil: 'networkidle' });
  await p.getByRole('link', { name: 'Review detail and moderation' }).click();
  await p.getByRole('heading', { name: 'Original customer review' }).waitFor();
  check(
    'admin property and booking links',
    (await p.getByRole('link', { name: 'Booking and visit evidence' }).isVisible()) &&
      (await p.getByRole('link', { name: 'Property detail', exact: true }).isVisible()),
  );
  await p
    .getByLabel('Policy reason (shared with author)')
    .fill('Genuine negative experience without private information or abuse.');
  await p.getByRole('button', { name: 'Preview publication change' }).click();
  await p.getByRole('heading', { name: 'Review before confirming' }).waitFor();
  check('preview no mutation', (await read()).version === 0);
  check('preview shows unchanged low score', await p.getByText('Original rating: 1/5').isVisible());
  await p.getByRole('button', { name: 'Confirm publication change' }).click();
  await p.getByText('Property public rating: 1 · 1 reviews', { exact: true }).waitFor();
  check('one-star review publishes with correct totals', (await read()).public === true);
  const discovery = async () =>
    (await (await anon.request.get(`${api}/discovery/listings/${f.publicCode}`)).json()).data;
  const searchCard = async () =>
    (await (await anon.request.get(`${api}/discovery/search`)).json()).data.items.find(
      (r) => r.id === f.ids.listing,
    );
  check('public listing totals after publish', (await discovery()).reviewCount === 1);
  check(
    'search totals after publish',
    (await searchCard()).reviewCount === 1 && (await searchCard()).rating === 1,
  );
  await scan(p, 'admin review desktop');
  await p.setViewportSize({ width: 390, height: 844 });
  await scan(p, 'admin review mobile');
  const op = await owner.newPage();
  await op.goto(`${web}/partner/reviews`, { waitUntil: 'networkidle' });
  await op.getByRole('link', { name: 'Review detail and history' }).click();
  await op
    .getByLabel('Owner reply', { exact: true })
    .fill('We are sorry about the garden and will improve its maintenance.');
  await op.getByRole('button', { name: 'Preview publication change' }).click();
  await op.getByRole('heading', { name: 'Review before confirming' }).waitFor();
  check('owner preview not saved', (await read()).ownerReply === null);
  await op.getByRole('button', { name: 'Confirm publication change' }).click();
  await op.getByRole('heading', { name: 'Current owner reply' }).waitFor();
  check('public owner reply persisted', (await read()).ownerReply.includes('sorry'));
  await op
    .getByLabel('Owner reply', { exact: true })
    .fill('Garden maintenance has now been scheduled. Thank you for your feedback.');
  await op.getByRole('button', { name: 'Preview publication change' }).click();
  await op.getByRole('button', { name: 'Confirm publication change' }).click();
  await op.getByText(/Previous reply: We are sorry/).waitFor();
  check(
    'response history preserves original',
    await op.getByText(/Previous reply: We are sorry/).isVisible(),
  );
  await op.locator('summary').filter({ hasText: 'Report a policy violation' }).click();
  await op
    .getByLabel('Report reason')
    .fill('Please check whether the review contains unrelated statements.');
  await op.getByRole('button', { name: 'Submit report', exact: true }).click();
  await op.getByRole('heading', { name: 'Your reports' }).waitFor();
  await op
    .getByText('Please check whether the review contains unrelated statements.', { exact: true })
    .waitFor();
  const report = (await read()).reports[0];
  check('owner report preserves public status', (await read()).public && report.state === 'open');
  await p.reload({ waitUntil: 'networkidle' });
  const reportSection = p.locator(`#report-${report.id}`);
  await reportSection
    .getByLabel('Resolution', { exact: true })
    .fill('Low ratings are not a policy violation. Keep the original review public.');
  await reportSection.getByRole('button', { name: 'Close report' }).click();
  await p.getByText(/Resolution: Low ratings are not a policy violation/).waitFor();
  check(
    'report resolution does not hide review',
    (await read()).public && (await read()).reports[0].state === 'closed',
  );
  const staleVersion = (await read()).version;
  const command = {
    id,
    version: staleVersion,
    state: 'hidden',
    category: 'private_information',
    reason: 'Review includes private information requiring removal.',
    mode: 'preview',
  };
  const preview = (
    await (await admin.request.post(`${api}/admin/reviews/moderate`, { data: command })).json()
  ).data.preview;
  check(
    'unpreviewed moderation refused',
    (
      await admin.request.post(`${api}/admin/reviews/moderate`, {
        data: { ...command, mode: 'apply' },
      })
    ).status() === 409,
  );
  const race = await Promise.all(
    [1, 2].map(() =>
      admin.request.post(`${api}/admin/reviews/moderate`, {
        data: { ...command, mode: 'apply', previewToken: preview.token },
      }),
    ),
  );
  check(
    'moderation race one winner',
    race
      .map((r) => r.status())
      .sort()
      .join(',') === '200,409',
  );
  await p
    .getByLabel('Policy reason (shared with author)')
    .fill('Typed stale moderation reason must remain here.');
  await p.getByRole('button', { name: 'Preview publication change' }).click();
  await p.getByRole('button', { name: 'Reload review' }).waitFor();
  check(
    'stale moderation keeps input',
    (await p.locator('textarea[name=reason]').inputValue()) ===
      'Typed stale moderation reason must remain here.',
  );
  check(
    'hidden review absent publicly',
    (await customer.request.get(`${api}/customer/reviews/${id}`)).status() === 404,
  );
  check(
    'public totals invalidated',
    (await read()).reviewCount === 0 && (await read()).ratingAverage === null,
  );
  check(
    'public listing and search removal reflected',
    (await discovery()).reviewCount === 0 && (await searchCard()).reviewCount === 0,
  );
  await op.goto(`${web}/partner/reviews`, { waitUntil: 'networkidle' });
  await op.getByRole('link', { name: 'Review detail and history' }).click();
  await op.getByText(/Resolution: Low ratings are not a policy violation/).waitFor();
  check(
    'owner can follow closed report after removal',
    await op.getByText(/Resolution: Low ratings are not a policy violation/).isVisible(),
  );
  check(
    'hidden review cannot receive public reply',
    (await op.getByLabel('Owner reply', { exact: true }).count()) === 0,
  );
  await op.setViewportSize({ width: 390, height: 844 });
  await scan(op, 'owner review mobile');
  await p.getByRole('button', { name: 'Reload review' }).click();
  await p.waitForFunction(
    (v) => document.querySelector('input[name=version]')?.value === String(v),
    (await read()).version,
  );
  await p
    .getByLabel('Policy reason (shared with author)')
    .fill('Further investigation confirms this review meets publication policy.');
  await p.getByRole('button', { name: 'Preview publication change' }).click();
  await p.getByRole('button', { name: 'Confirm publication change' }).click();
  await p.getByText('Property public rating: 1 · 1 reviews', { exact: true }).waitFor();
  check(
    'restore keeps original rating',
    (await read()).rating === 1 && (await read()).reviewCount === 1,
  );
  const denied = await limited.request.post(`${api}/admin/reviews/moderate`, { data: command });
  check('read-only admin mutation denied', denied.status() === 403);
  await p.getByLabel('Policy basis').focus();
  check(
    'moderation keyboard focus',
    await p.getByLabel('Policy basis').evaluate((el) => el === document.activeElement),
  );
  const foreign = await other.newPage();
  await foreign.goto(`${web}/partner/reviews`, { waitUntil: 'networkidle' });
  check('other owner empty queue', await foreign.getByText('No reviews on this page.').isVisible());
  const publicResult = (await (await customer.request.get(`${api}/customer/reviews/${id}`)).json())
    .data;
  check(
    'public response excludes moderation history',
    !('history' in publicResult) && !('reports' in publicResult),
  );
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part18-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
