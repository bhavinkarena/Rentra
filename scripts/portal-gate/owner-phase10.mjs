import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { auditPage } from './browser-audit.mjs';
const { chromium } = await import(
  pathToFileURL(
    process.env.PLAYWRIGHT_MODULE ||
      join(
        process.env.APPDATA,
        'npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs',
      ),
  ).href
);
const fixture = JSON.parse(await readFile(process.env.CP06_GATE_FIXTURE, 'utf8'));
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3107';
const out = new URL('../../docs/evidence/owner-phase10/', import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const checks = [],
  errors = [];
const fault = async (re = '', mode = 'fail') => {
  await fetch(
    `http://localhost:4106/__fault/set?re=${encodeURIComponent(re)}&mode=${mode}&ms=2000`,
  );
};
async function ready(page) {
  await page.locator('main').waitFor();
  await page.getByText('Checking your session…', { exact: true }).waitFor({ state: 'hidden' });
  await page.locator('[aria-busy="true"]').waitFor({ state: 'hidden', timeout: 60000 });
}
try {
  const empty = await browser.newContext({ viewport: { width: 360, height: 800 } });
  await empty.addCookies([{ name: 'rentra_session', value: fixture.tokens.other, url: web }]);
  const page = await empty.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  for (const route of [
    'listings',
    'calendar',
    'bookings?tab=upcoming',
    'reviews?tab=all',
    'updates',
    'support',
    'disputes',
    'team',
    'earnings',
    'payouts',
    'settings/payout',
    'settings/privacy',
  ]) {
    await page.goto(`${web}/partner/${route}`, { timeout: 120000 });
    await ready(page);
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(out.pathname.replace(/^\/(\w:)/, '$1'), route.replaceAll(/[/?=]/g, '-') + '.png'),
      fullPage: true,
    });
    const audit = await auditPage(page, 'main');
    assert.deepEqual(
      audit.violations.map((v) => v.id),
      [],
      route + ' accessibility',
    );
    checks.push('empty route ' + route);
  }
  await page.goto(web + '/partner/listings');
  await ready(page);
  await page.getByRole('heading', { name: "You haven't added a property yet" }).waitFor();
  let release;
  await page.route('**/api/partner-identity', async (route) => {
    await new Promise((r) => (release = r));
    await route.continue();
  });
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  for (let i = 0; i < 50 && !release; i++) await page.waitForTimeout(100);
  assert.equal(typeof release, 'function', 'background identity request started');
  assert.ok(
    await page.getByRole('heading', { name: "You haven't added a property yet" }).isVisible(),
  );
  assert.equal(await page.getByText('Checking your session…', { exact: true }).count(), 0);
  const identityResponse = page.waitForResponse((r) => r.url().endsWith('/api/partner-identity'));
  release();
  await identityResponse;
  await page.unroute('**/api/partner-identity');
  checks.push('background identity keeps content');
  await page.route('**/api/partner-identity', (route) => route.fulfill({ status: 503 }));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('alert').filter({ hasText: 'Could not refresh your session' }).waitFor();
  assert.ok(
    await page.getByRole('heading', { name: "You haven't added a property yet" }).isVisible(),
  );
  await page.unroute('**/api/partner-identity');
  checks.push('background identity outage keeps content and retry');
  const owner = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await owner.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
  const live = await owner.newPage();
  live.on('pageerror', (e) => errors.push(e.message));
  await live.goto(`${web}/partner/listings/${fixture.ids.listing}/overview`, { timeout: 120000 });
  await ready(live);
  if (await live.getByRole('button', { name: 'Resume bookings', exact: true }).count()) {
    await live.getByRole('button', { name: 'Resume bookings', exact: true }).click();
    await live.getByRole('button', { name: 'Pause bookings', exact: true }).waitFor();
  }
  await live.getByRole('button', { name: 'Pause bookings', exact: true }).click();
  const dialog = live.getByRole('dialog');
  await dialog.waitFor();
  for (let i = 0; i < 8; i++) {
    await live.keyboard.press('Tab');
    assert.ok(
      await dialog.evaluate(
        (el) => el.contains(document.activeElement) || document.activeElement === document.body,
      ),
    );
  }
  await live.keyboard.press('Escape');
  await dialog.waitFor({ state: 'hidden' });
  await live.getByRole('button', { name: 'Pause bookings', exact: true }).click();
  await dialog.getByRole('button', { name: 'Pause bookings', exact: true }).click();
  await live.getByRole('status').filter({ hasText: 'Bookings paused.' }).waitFor();
  checks.push('pause confirmation keyboard and success announcement');
  for (const [section, title] of [
    ['needsYou', 'Needs you'],
    ['visits', 'Today’s visits'],
    ['week', 'This week'],
    ['earnings', 'Earnings'],
    ['properties', 'Properties'],
  ]) {
    await fault('partner/today.*section=' + section);
    await live.goto(web + '/partner', { timeout: 120000 });
    await ready(live);
    const failure = live.getByRole('alert').filter({ hasText: title + ' could not load' });
    await failure.waitFor();
    assert.equal(await live.getByRole('alert').filter({ hasText: 'could not load' }).count(), 1);
    checks.push('isolated Today failure ' + section);
  }
  for (const [route, api] of [
    ['listings', 'partner/listings'],
    ['bookings', 'partner/records'],
    ['calendar', 'partner/calendar'],
    ['reviews', 'partner/reviews'],
    ['updates', 'partner/updates'],
    ['support', 'partner/support'],
    ['disputes', 'partner/disputes'],
    ['team', 'partner/team'],
    ['earnings', 'partner/earnings'],
  ]) {
    await fault(api);
    await live.goto(web + '/partner/' + route, { timeout: 120000 });
    await ready(live);
    await live.getByRole('heading', { name: 'This page could not load' }).waitFor();
    checks.push('page read outage ' + route);
  }
  await fault();
  const { default: postgres } = await import(
    new URL('../../../rentra-backend/node_modules/postgres/src/index.js', import.meta.url)
  );
  const database = new URL(fixture.databaseUrl);
  assert.ok(
    ['127.0.0.1', 'localhost'].includes(database.hostname) &&
      database.pathname.startsWith('/rentra_test_'),
  );
  const sql = postgres(fixture.databaseUrl, { max: 1, onnotice: () => {} });
  try {
    await sql`UPDATE rentable SET status='live', booking_config=jsonb_set(booking_config,'{autoOpen}','false') WHERE id=${fixture.ids.listing}`;
    await sql`DELETE FROM availability WHERE rentable_id=${fixture.ids.listing} AND day>(now() AT TIME ZONE 'Asia/Kolkata')::date+7`;
    await sql`INSERT INTO client_update(client_id,event_key,category,kind,action,rentable_id) VALUES(${fixture.ids.owner},'phase10-confirm','property','action','dates_running_out',${fixture.ids.listing}) ON CONFLICT(client_id,event_key) DO UPDATE SET read_at=NULL`;
    await live.goto(web + '/partner/updates', { timeout: 120000 });
    await ready(live);
    await live.getByRole('button', { name: 'Mark all as read', exact: true }).focus();
    await live.keyboard.press('Enter');
    const confirm = live.getByRole('dialog', { name: 'Mark all updates read?' });
    await confirm.waitFor();
    await live.keyboard.press('Escape');
    await confirm.waitFor({ state: 'hidden' });
    const [{ unread }] =
      await sql`SELECT read_at IS NULL AS unread FROM client_update WHERE client_id=${fixture.ids.owner} AND event_key='phase10-confirm'`;
    assert.equal(unread, true);
    await live.getByRole('button', { name: 'Mark all as read', exact: true }).click();
    await confirm.getByRole('button', { name: 'Mark all read', exact: true }).click();
    await live.getByRole('status').filter({ hasText: 'All updates marked read.' }).waitFor();
    const [{ read }] =
      await sql`SELECT read_at IS NOT NULL AS read FROM client_update WHERE client_id=${fixture.ids.owner} AND event_key='phase10-confirm'`;
    assert.equal(read, true);
    checks.push('ConfirmedForm keyboard cancel and confirmed server action');
  } finally {
    await sql.end();
  }
  await page.bringToFront();
  await page.route('**/api/partner-identity', (route) => route.fulfill({ status: 401 }));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForURL('**/partner/login?session=ended&next=*');
  assert.equal(new URL(page.url()).searchParams.get('next'), '/partner/listings');
  checks.push('expired identity redirects with return path');
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', out), JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }));
} finally {
  await fault();
  await browser.close();
}
