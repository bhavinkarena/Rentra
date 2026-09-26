// Requires the disposable published fixture + seed-pricing-operations-gate.mjs on :4106,
// and isolated Next on :3106. This gate has not passed until its output says so.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const results = [];
const check = (name, pass) => {
  results.push({ check: name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
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
  const owner = await ctx('owner'),
    other = await ctx('other'),
    admin = await ctx('admin'),
    limited = await ctx('limited'),
    anon = await ctx();
  const id = fixture.ids.listing,
    order = fixture.booking.order;
  const root = `${api}/partner/listings/${id}`;
  check(
    'anonymous owner queue denied',
    (await anon.request.get(`${api}/partner/records?tab=today`)).status() === 401,
  );
  check(
    'owner cookie cannot read admin queue',
    (await owner.request.get(`${api}/admin/records?tab=today`)).status() === 401,
  );
  check(
    'foreign record denied',
    (await other.request.get(`${api}/partner/records/${order}`)).status() === 404,
  );
  check(
    'customer-only filters remain bounded',
    (await owner.request.get(`${api}/partner/records?tab=unknown`)).status() === 400,
  );
  const current = async () => (await (await owner.request.get(root)).json()).data.listing;
  const values = {
    day_weekday: '1800',
    day_weekend: '2200',
    night_weekday: '0',
    night_weekend: '0',
    full_day_weekday: '0',
    full_day_weekend: '0',
    extraGuestCharge: '100',
    contentVersion: (await current()).contentVersion,
    mode: 'preview',
  };
  check(
    'invalid price denied',
    (
      await owner.request.post(`${root}/pricing`, { data: { ...values, day_weekday: '-1' } })
    ).status() === 422,
  );
  check(
    'foreign pricing denied',
    (await other.request.post(`${root}/pricing`, { data: values })).status() === 404,
  );
  check(
    'unpreviewed price denied',
    (
      await owner.request.post(`${root}/pricing`, { data: { ...values, mode: 'apply' } })
    ).status() === 409,
  );
  const preview = (await (await owner.request.post(`${root}/pricing`, { data: values })).json())
    .data.preview;
  check('pricing preview returns effect', preview.effective.includes('Accepted bookings'));
  check(
    'preview did not mutate version',
    (await current()).contentVersion === values.contentVersion,
  );
  const commits = await Promise.all(
    [1, 2].map(() =>
      owner.request.post(`${root}/pricing`, {
        data: { ...values, mode: 'apply', previewToken: preview.token },
      }),
    ),
  );
  check(
    'concurrent pricing confirmation one winner',
    commits
      .map((r) => r.status())
      .sort()
      .join(',') === '200,409',
  );
  const page = await owner.newPage();
  page.setDefaultTimeout(30000);
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (label, target = page) => {
    check(
      `${label} no overflow`,
      await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await target.addScriptTag({ content: axe });
    console.log(
      JSON.stringify(
        await target.evaluate(async () =>
          (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
            .filter((v) => ['serious', 'critical'].includes(v.impact))
            .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) })),
        ),
      ),
    );
    check(
      `${label} axe clean`,
      !(
        await target.evaluate(async () =>
          (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((v) =>
            ['serious', 'critical'].includes(v.impact),
          ),
        )
      ).length,
    );
  };
  await page.goto(`${web}/partner/listings/${id}?from=${encodeURIComponent('/partner/listings')}`, {
    waitUntil: 'networkidle',
  });
  const pricing = page.locator('#section-pricing');
  await pricing.getByLabel('Day picnic weekday price').fill('1900');
  await pricing.getByRole('button', { name: 'Preview pricing', exact: true }).click();
  await pricing.getByRole('heading', { name: 'Review before applying' }).waitFor();
  check(
    'price preview retains input',
    (await pricing.getByLabel('Day picnic weekday price').inputValue()) === '1900',
  );
  await pricing.getByRole('button', { name: 'Confirm pricing', exact: true }).click();
  await pricing.getByText(/Effective booking version/).waitFor();
  check(
    'price receipt shows effective version',
    await pricing.getByText(/Effective booking version/).isVisible(),
  );
  const terms = page.locator('#section-terms');
  await terms.getByLabel('Cancellation policy', { exact: true }).selectOption('flexible');
  await terms.getByRole('button', { name: 'Preview terms', exact: true }).click();
  await terms.getByRole('heading', { name: 'Review before applying' }).waitFor();
  await terms.getByRole('button', { name: 'Confirm terms', exact: true }).click();
  await terms.getByText(/Effective booking version/).waitFor();
  check('terms persisted', (await current()).cancellationTier === 'flexible');
  await scan('property policy desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await scan('property policy mobile');
  await pricing.getByLabel('Day picnic weekday price').fill('1950');
  const remote = { ...values, contentVersion: (await current()).contentVersion };
  const rp = (await (await owner.request.post(`${root}/pricing`, { data: remote })).json()).data
    .preview;
  await owner.request.post(`${root}/pricing`, {
    data: { ...remote, mode: 'apply', previewToken: rp.token },
  });
  await pricing.getByRole('button', { name: 'Preview pricing', exact: true }).click();
  await pricing.getByRole('button', { name: 'Reload latest version' }).waitFor();
  check(
    'stale price preserves typed input',
    (await pricing.getByLabel('Day picnic weekday price').inputValue()) === '1950',
  );
  // The button reloads the document; wait for that navigation, not the already-idle old page.
  await Promise.all([
    page.waitForEvent('load'),
    pricing.getByRole('button', { name: 'Reload latest version' }).click(),
  ]);
  await page.waitForLoadState('networkidle');
  check(
    'reload shows latest saved price',
    (await pricing.getByLabel('Day picnic weekday price').inputValue()) === values.day_weekday,
  );
  await pricing.getByLabel('Day picnic weekday price').fill('1950');
  await pricing.getByRole('button', { name: 'Preview pricing', exact: true }).click();
  await pricing.getByRole('heading', { name: 'Review before applying' }).waitFor();
  await pricing.getByRole('button', { name: 'Confirm pricing', exact: true }).click();
  await pricing.getByText(/Effective booking version/).waitFor();
  const saved = (await (await owner.request.get(root)).json()).data;
  check(
    'stale pricing recovers after refresh',
    (await pricing.getByLabel('Day picnic weekday price').inputValue()) === '1950' &&
      JSON.stringify(saved).includes('"weekday":1950'),
  );
  await page.goto(`${web}/partner/listings/${id}/calendar`, { waitUntil: 'networkidle' });
  const schedule = page
    .locator('form')
    .filter({ has: page.getByRole('heading', { name: 'Booking hours and guest limits' }) });
  await schedule.getByLabel('Minimum notice (minutes)').fill('90');
  await schedule.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await schedule.getByRole('heading', { name: 'Review changes' }).waitFor();
  check(
    'schedule preview preserves input',
    (await schedule.getByLabel('Minimum notice (minutes)').inputValue()) === '90',
  );
  await schedule.getByRole('button', { name: 'Confirm: Save', exact: true }).click();
  await schedule.getByText(/Effective booking version/).waitFor();
  check('schedule confirmation receipt', true);
  await page.goto(`${web}/partner/listings/${id}/setup/pricing`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await page.getByRole('heading', { name: 'Review before applying' }).waitFor();
  check('wizard previews before advancing', page.url().endsWith('/setup/pricing'));
  await page.getByRole('button', { name: 'Save and continue', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/setup/pricing'));
  check('wizard advances after confirmation', true);

  await page.goto(`${web}/partner/bookings?tab=action_needed&q=ORD`, { waitUntil: 'networkidle' });
  check(
    'owner action queue contains mixed states',
    await page.getByText(/Visit states:/).isVisible(),
  );
  await scan('owner queue mobile');
  await page.locator(`a[href*="/partner/bookings/${order}"]`).first().click();
  await page.getByRole('heading', { name: 'Your visits', exact: true }).waitFor();
  check(
    'owner detail has mixed states',
    await page.getByText('Mixed visit statuses — check each visit below.').isVisible(),
  );
  check(
    'filtered return link',
    (await page.getByRole('link', { name: 'Back to bookings' }).getAttribute('href')).includes(
      'tab=action_needed',
    ),
  );
  check(
    'property overview link',
    await page.getByRole('link', { name: 'Property overview', exact: true }).isVisible(),
  );
  check(
    'due visit action',
    (await page.locator('summary').filter({ hasText: 'Record handover evidence' }).count()) === 1,
  );
  await scan('owner detail mobile');
  const detail = (await (await owner.request.get(`${api}/partner/records/${order}`)).json()).data;
  check(
    'cancelled visit has no arrival access',
    detail.arrival.visitIds.length === 1 &&
      detail.visits.find((v) => v.state === 'cancelled').operation.action === null,
  );
  const adminPage = await admin.newPage();
  await adminPage.goto(`${web}/admin/bookings?tab=today`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('link', { name: 'Open booking ORD-CP08' }).click();
  await adminPage.getByRole('link', { name: 'Customer detail', exact: true }).waitFor();
  check(
    'admin cross-record links',
    await adminPage.getByRole('link', { name: 'Client detail', exact: true }).isVisible(),
  );
  check('admin mixed state wording', await adminPage.getByText(/Mixed visit states/).isVisible());
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await scan('admin detail mobile', adminPage);
  await adminPage.getByRole('link', { name: 'Customer detail', exact: true }).focus();
  check(
    'admin relationship keyboard focus',
    await adminPage
      .getByRole('link', { name: 'Customer detail', exact: true })
      .evaluate((el) => el === document.activeElement),
  );
  const evidence = page
    .locator('details')
    .filter({ has: page.locator('summary').filter({ hasText: 'Record handover evidence' }) });
  await evidence.locator('summary').click();
  const observed = new Date(Date.now() + 330 * 60000 - 60000).toISOString().slice(0, 16);
  await evidence.getByLabel('When it occurred (India time)').fill(observed);
  await evidence
    .getByLabel('Evidence: what you observed')
    .fill('Guest keys handed over after the arrival inspection.');
  await evidence.getByRole('checkbox').check();
  const replay = await evidence
    .locator('form')
    .evaluate((form) => Object.fromEntries(new FormData(form)));
  await evidence.getByRole('button', { name: 'Record handover', exact: true }).click();
  await page.waitForTimeout(1000);
  const after = (await (await owner.request.get(`${api}/partner/records/${order}`)).json()).data;
  check(
    'browser records handover',
    after.visits.find((v) => v.id === fixture.operationalVisit).state === 'handed_over',
  );
  const repeated = await owner.request.post(`${api}/partner/records/visit`, { data: replay });
  const replayed = (await (await owner.request.get(`${api}/partner/records/${order}`)).json()).data;
  check(
    'browser evidence replay one effect',
    repeated.ok() &&
      replayed.visits.find((v) => v.id === fixture.operationalVisit).evidence.length === 1,
  );

  check(
    'read-only admin cannot operate visit',
    (
      await limited.request.post(`${api}/admin/records/visit`, {
        data: { visitId: fixture.operationalVisit },
      })
    ).status() === 403,
  );
  await page.goto(`${web}/partner/bookings?tab=today&q=no-such-booking`, {
    waitUntil: 'networkidle',
  });
  check(
    'operational empty state',
    await page.getByRole('heading', { name: 'No bookings in this queue' }).isVisible(),
  );
  await owner.request.post(`${api}/auth/logout`);
  check(
    'revocation blocks next operational request',
    (await owner.request.get(`${api}/partner/records?tab=today`)).status() === 401,
  );
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part11-12-gate.json', import.meta.url),
    JSON.stringify({ results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
