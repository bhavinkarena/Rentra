// Run against serve-property-review + seed-calendar-gate on :4106 and isolated Next :3106.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const results = [];
function check(name, passed) {
  results.push({ check: name, pass: !!passed });
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
}
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const context = async (kind, width = 1280) => {
    const ctx = await browser.newContext({ viewport: { width, height: 950 } });
    if (kind)
      await ctx.addCookies([
        {
          name: kind === 'admin' ? 'rentra_admin' : 'rentra_session',
          value: f.tokens[kind],
          url: web,
        },
      ]);
    return ctx;
  };
  const owner = await context('owner'),
    other = await context('other'),
    anonymous = await context(),
    admin = await context('admin');
  const root = `${api}/partner/listings/${f.ids.listing}/calendar`;
  check(
    'anonymous portfolio denied',
    (await anonymous.request.get(`${api}/partner/calendar`)).status() === 401,
  );
  check(
    'admin audience denied',
    (await admin.request.get(`${api}/partner/calendar`)).status() === 401,
  );
  check('other owner interval denied', (await other.request.get(`${root}/state`)).status() === 404);
  check(
    'invalid calendar filters rejected',
    (await owner.request.get(`${api}/partner/calendar?days=366`)).status() === 400,
  );
  check(
    'foreign mutation denied',
    (
      await other.request.post(`${root}/open-dates`, {
        data: {
          from: f.calendarDay,
          to: f.calendarDay,
          mode: 'preview',
          expectedCalendarVersion: 'foreign',
        },
      })
    ).status() === 404,
  );
  const portfolio = await owner.request.get(`${api}/partner/calendar?from=${f.calendarDay}`);
  check('owner reads portfolio', portfolio.status() === 200);
  check(
    'no customer identity in calendar',
    !JSON.stringify(await portfolio.json()).includes('customer_id'),
  );
  const version = async () =>
    (await (await owner.request.get(root)).json()).data.listing.calendar_version;
  const input = {
    day: f.calendarDay,
    slot: 'day',
    rent: '1450',
    expectedCalendarVersion: await version(),
    mode: 'preview',
  };
  const preview = await owner.request.post(`${root}/price-override`, { data: input });
  check('override preview succeeds', preview.status() === 200);
  const token = (await preview.json()).data.preview.token;
  check(
    'apply without preview denied',
    (
      await owner.request.post(`${root}/price-override`, { data: { ...input, mode: 'apply' } })
    ).status() === 409,
  );
  check(
    'changed preview inputs denied',
    (
      await owner.request.post(`${root}/price-override`, {
        data: { ...input, rent: '1550', mode: 'apply', previewToken: token },
      })
    ).status() === 409,
  );
  check(
    'exact preview commits',
    (
      await owner.request.post(`${root}/price-override`, {
        data: { ...input, mode: 'apply', previewToken: token },
      })
    ).status() === 200,
  );
  check(
    'stale override rejected',
    (
      await owner.request.post(`${root}/price-override`, {
        data: { ...input, mode: 'apply', previewToken: token },
      })
    ).status() === 409,
  );
  check(
    'bulk bound enforced',
    (
      await owner.request.post(`${root}/open-dates`, {
        data: {
          from: '2030-01-01',
          to: '2030-03-01',
          expectedCalendarVersion: await version(),
          mode: 'preview',
        },
      })
    ).status() === 400,
  );
  const page = await owner.newPage();
  page.setDefaultTimeout(20000);
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (label) => {
    check(
      `${label}: no horizontal overflow`,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.addScriptTag({ content: axe });
    check(
      `${label}: axe serious/critical clean`,
      !(
        await page.evaluate(async () =>
          (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((v) =>
            ['serious', 'critical'].includes(v.impact),
          ),
        )
      ).length,
    );
  };
  await page.goto(`${web}/partner/calendar?from=${f.calendarDay}`, { waitUntil: 'networkidle' });
  check(
    'portfolio heading',
    await page.getByRole('heading', { name: 'Portfolio calendar', exact: true }).isVisible(),
  );
  await page.locator('summary').filter({ hasText: 'Booked visit' }).first().click();
  check(
    'booking source link',
    await page.getByRole('link', { name: 'Open booking record' }).first().isVisible(),
  );
  check(
    'buffer detail',
    await page
      .getByText(/Buffer before:/)
      .first()
      .isVisible(),
  );
  check(
    'price override shown',
    await page.locator('summary').filter({ hasText: 'Price override' }).first().isVisible(),
  );
  await scan('portfolio desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await scan('portfolio mobile');
  await page.getByRole('link', { name: 'Accessible agenda list' }).click();
  await page.waitForURL(/view=agenda/);
  check('agenda is URL backed', page.url().includes('view=agenda'));
  const summary = page.locator('summary').filter({ hasText: 'Booked visit' }).first();
  await summary.evaluate((e) => {
    e.parentElement.open = false;
  });
  await summary.focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => [...document.querySelectorAll('details')].some((e) => e.open));
  check('keyboard interval expansion', await summary.evaluate((e) => e.parentElement.open));
  await page.locator('select[name=view]').selectOption('month');
  await page.locator('select[name=slot]').selectOption('night');
  await page.locator('select[name=property]').selectOption(f.ids.listing);
  await page.getByRole('button', { name: 'Show calendar', exact: true }).click();
  await page.waitForURL(/view=month/);
  await page.waitForFunction(
    () => document.querySelectorAll('article section[aria-label]').length === 31,
  );
  check(
    'month and property/slot filters persist',
    page.url().includes('slot=night') && page.url().includes(`property=${f.ids.listing}`),
  );
  await scan('filtered month mobile');
  await page.goto(`${web}/partner/listings/${f.ids.listing}/calendar?from=${f.calendarDay}`, {
    waitUntil: 'networkidle',
  });
  await scan('property mobile');
  const open = page.locator('form').filter({
    has: page.getByRole('heading', { name: 'Add dates to your calendar', exact: true }),
  });
  await open.getByLabel('First date').fill(f.calendarDay);
  await open.getByLabel('Last date').fill(f.calendarDay);
  await open.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await open.getByRole('heading', { name: 'Review changes' }).waitFor();
  check(
    'preview retains input',
    (await open.getByLabel('First date').inputValue()) === f.calendarDay,
  );
  check(
    'affected slots shown',
    await open.getByRole('list', { name: 'Affected date slots' }).isVisible(),
  );
  await open.getByRole('button', { name: 'Confirm: Add dates' }).click();
  await open.getByText(/^Saved\./).waitFor();
  await open.getByRole('button', { name: 'Preview changes', exact: true }).waitFor();
  check(
    'open dates receipt',
    /Saved\. Added \d+ date slots; existing slots were preserved\./.test(
      await open.getByRole('status').innerText(),
    ),
  );
  const price = page.locator('#price-override');
  await price.getByLabel('Visit start date').fill(f.calendarDay);
  await price.getByLabel('Rent (₹, before fees and extra guests)').fill('1800');
  await price.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await price.getByRole('heading', { name: 'Review changes' }).waitFor();
  const fresh = {
    day: f.calendarDay,
    slot: 'day',
    rent: '1900',
    expectedCalendarVersion: await version(),
    mode: 'preview',
  };
  const p = (await (await owner.request.post(`${root}/price-override`, { data: fresh })).json())
    .data.preview;
  await owner.request.post(`${root}/price-override`, {
    data: { ...fresh, mode: 'apply', previewToken: p.token },
  });
  await price.getByRole('button', { name: 'Confirm: Save' }).click();
  await price.getByRole('alert').waitFor();
  check(
    'stale UI retains typed rent',
    (await price.getByLabel('Rent (₹, before fees and extra guests)').inputValue()) === '1800',
  );
  check(
    'stale UI offers reload',
    await price.getByRole('button', { name: 'Reload latest calendar' }).isVisible(),
  );
  await page.screenshot({ path: '/tmp/cp10-mobile.png', fullPage: true });
  await page.reload({ waitUntil: 'networkidle' });
  const blockForm = page
    .locator('form')
    .filter({ has: page.getByRole('heading', { name: 'Block an exact period', exact: true }) });
  const blockDay = new Date(new Date(f.calendarDay).getTime() + 3 * 86400000)
    .toISOString()
    .slice(0, 10);
  await blockForm.getByLabel('From date', { exact: true }).fill(blockDay);
  await blockForm.getByLabel('To date', { exact: true }).fill(blockDay);
  await blockForm.getByLabel('From time (India)').fill('09:00');
  await blockForm.getByLabel('To time (India)').fill('18:00');
  await blockForm.getByLabel('Reason (visible to your team)').fill('Maintenance CP10 gate');
  await blockForm.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await blockForm.getByRole('heading', { name: 'Review changes' }).waitFor();
  await blockForm.getByRole('button', { name: 'Confirm: Block period' }).click();
  await blockForm.getByText(/^Saved\./).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  const release = page.locator('form').filter({ hasText: 'Maintenance CP10 gate' });
  check('owner block persisted', (await release.count()) === 1);
  await release.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await release.getByRole('heading', { name: 'Review changes' }).waitFor();
  await release.getByRole('button', { name: 'Confirm: Release block' }).click();
  await release.waitFor({ state: 'detached' });
  check('owner unblock persists', (await page.getByText('Maintenance CP10 gate').count()) === 0);
  const foreign = await other.newPage();
  await foreign.goto(`${web}/partner/listings/${f.ids.listing}/calendar`);
  await foreign.getByRole('heading', { name: 'Record not found', exact: true }).waitFor();
  check(
    'foreign property shows not found',
    await foreign.getByText('Record not found', { exact: true }).isVisible(),
  );
  await owner.request.post(`${api}/auth/logout`);
  check(
    'revoked session denied on next calendar read',
    (await owner.request.get(`${api}/partner/calendar`)).status() === 401,
  );
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part10-gate.json', import.meta.url),
    JSON.stringify({ results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
