// Local release rehearsal: audited launch switch, cache refresh and existing bookings.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';

const req = createRequire(process.env.PLAYWRIGHT_DIR || import.meta.url);
const { chromium } = req('playwright-core');
const postgres = createRequire(new URL('../../../rentra-backend/package.json', import.meta.url))(
  'postgres',
);
const fixture = JSON.parse(await readFile(process.env.GATE_DB_JSON, 'utf8'));
const target = new URL(fixture.url);
assert.ok(
  target.hostname === '127.0.0.1' &&
    target.port === '55432' &&
    target.pathname.startsWith('/rentra_test_'),
  'Disposable local database required',
);
const tokens = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const sql = postgres(fixture.url, { max: 1, onnotice: () => {} });
const web = process.env.GATE_WEB || 'http://localhost:3106';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(web).hostname));
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const context = await browser.newContext();
await context.addCookies([{ name: 'rentra_admin', value: tokens.admin, url: web }]);
const page = await context.newPage();
const checks = [];
const check = (name, pass) => {
  checks.push({ name, pass: Boolean(pass) });
  assert.ok(pass, name);
  console.log('PASS ' + name);
};
async function switchTo(status) {
  await page.goto(web + '/admin/catalogues/verticals');
  const row = page.locator('li').filter({ hasText: '(entertainment)' });
  await row.locator('select[name="status"]').selectOption(status);
  await row.getByLabel('Reason for change').fill('Disposable Phase 14 launch-switch rehearsal');
  await row.getByRole('button', { name: 'Preview changes' }).click();
  await row.getByRole('button', { name: 'Confirm and save' }).click();
  await row.getByRole('status').waitFor();
}
try {
  const before =
    await sql`SELECT id,state FROM booking_order WHERE rentable_id=${fixture.venue} ORDER BY id`;
  check(
    'confirmed hourly booking exists before hiding',
    before.some((row) => row.state === 'confirmed'),
  );
  await switchTo('partners');
  const guest = await browser.newPage();
  for (const path of ['/', '/search']) {
    await guest.goto(web + path, { waitUntil: 'networkidle' });
    check(
      path + ' has no vertical tabs after audited switch',
      (await guest.getByRole('navigation', { name: 'Categories' }).count()) === 0,
    );
  }
  for (const path of ['/entertainment', '/listing/smash-arena-venue001']) {
    const response = await fetch(web + path);
    const body = await response.text();
    check(
      path + ' is unavailable to guests',
      response.status === 404 ||
        (body.includes('NEXT_HTTP_ERROR_FALLBACK;404') && body.includes('noindex')),
    );
  }
  const customer = await browser.newContext();
  await customer.addCookies([{ name: 'rentra_session', value: tokens.customer, url: web }]);
  const records = await customer.newPage();
  await records.goto(web + '/bookings', { waitUntil: 'networkidle' });
  check(
    'customer can still manage existing venue bookings',
    await records.getByText('Smash Arena', { exact: true }).first().isVisible(),
  );
  assert.deepEqual(
    await sql`SELECT id,state FROM booking_order WHERE rentable_id=${fixture.venue} ORDER BY id`,
    before,
  );
  check('switch preserves every existing order state', true);
  await switchTo('public');
  await guest.goto(web + '/', { waitUntil: 'networkidle' });
  check(
    'public switch restores both header tabs',
    (await guest
      .locator('[data-site-header]')
      .getByRole('navigation', { name: 'Categories' })
      .getByRole('link')
      .count()) === 2,
  );
  await guest.goto(web + '/listing/smash-arena-venue001');
  await guest.getByRole('heading', { name: 'Smash Arena', exact: true }).waitFor();
  check('public switch restores venue detail', true);
  const [{ count }] =
    await sql`SELECT count(*)::int FROM audit_log WHERE entity='catalogue.verticals' AND entity_id='entertainment' AND "after"->>'reason'='Disposable Phase 14 launch-switch rehearsal'`;
  check('both switch actions have audit evidence', count >= 2);
} finally {
  // Leave the disposable stack ready for the public-vertical regression scripts.
  const [{ status }] = await sql`SELECT status FROM vertical WHERE code='entertainment'`;
  if (status !== 'public') await switchTo('public');
  if (process.env.GATE_OUT)
    await writeFile(process.env.GATE_OUT + '/cp39-results.json', JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
