/** Production UI + real Next proxy against an in-memory API fixture. No database access.
 * Build: RENTRA_BUILD_FIXTURE=1 NEXT_PUBLIC_API_URL=http://127.0.0.1:4119/api/v1 npm run build
 * Run: PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node scripts/verification/partner-cache.mjs
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const { chromium } = await import(
  process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright'
);
const web = 'http://127.0.0.1:3119';
const requests = [];
let revoked = false;
let failReads = false;
let revision = '0';
const api = createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:4119');
  requests.push(url.pathname);
  const actor = req.headers.cookie?.includes('rentra_session=fixture-b') ? 'b' : 'a';
  const user = revoked
    ? null
    : {
        id: actor,
        role: 'client',
        name: `Fixture ${actor}`,
        accountStatus: 'active',
        cacheScope: `${actor}-${revision}`,
        capabilities: ['client.listings.write', 'client.records.read'],
      };
  let data;
  if (url.pathname === '/api/v1/auth/me') data = { user };
  else if (failReads) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false }));
    return;
  } else if (url.pathname === '/api/v1/partner/listings/summary')
    data = { total: 1, live: 0, inReview: 0, attention: 1 };
  else if (url.pathname === '/api/v1/partner/listings')
    data = {
      items: [
        {
          id: actor,
          title: `Private property ${actor}`,
          status: 'draft',
          updatedAt: '2026-09-27T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
      pages: 1,
    };
  else if (url.pathname === '/api/v1/partner/records')
    data = {
      items: [],
      total: 0,
      page: 1,
      pages: 1,
      q: url.searchParams.get('q') ?? '',
      tab: 'all',
      property: '',
      summary: { total: 0, today: 0, action_needed: 0, upcoming: 0, past: 0, cancelled: 0 },
    };
  else data = {};
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: true, data }));
});
await new Promise((resolve) => api.listen(4119, '127.0.0.1', resolve));
const next = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', '3119', '-H', '127.0.0.1'],
  {
    env: {
      ...process.env,
      RENTRA_BUILD_FIXTURE: '1',
      PARTNER_RTK_ENABLED: 'true',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:4119/api/v1',
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  },
);
let serverError = '';
next.stderr.on('data', (chunk) => {
  serverError += chunk;
});
let browser;
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (next.exitCode !== null) throw new Error(`Next exited: ${serverError}`);
    if (
      await fetch(web + '/api/partner-identity')
        .then((r) => r.ok)
        .catch(() => false)
    )
      break;
    await delay(200);
  }
  browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });
  const context = await browser.newContext();
  await context.addCookies([{ name: 'rentra_session', value: 'fixture-a', url: web }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(web + '/partner/listings');
  await page.getByRole('heading', { name: 'All properties', exact: true }).waitFor();
  assert.equal(requests.filter((p) => p === '/api/v1/partner/listings').length, 1);
  await page.getByRole('link', { name: 'Bookings', exact: true }).first().click();
  await page.getByRole('heading', { name: 'Booking records', exact: true }).waitFor();
  const began = Date.now();
  await page.getByRole('link', { name: 'Properties', exact: true }).first().click();
  await page.getByRole('heading', { name: 'All properties', exact: true }).waitFor();
  const warmMs = Date.now() - began;
  assert.equal(
    requests.filter((p) => p === '/api/v1/partner/listings').length,
    1,
    'warm navigation must reuse cache',
  );
  console.log(`PASS warm navigation: ${warmMs}ms; listings API calls: 1`);

  await page.locator('input[name="q"]').fill('other');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForURL('**/partner/listings?q=other');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.waitForURL('**/partner/listings');
  await page.goBack();
  await page.waitForURL('**/partner/listings?q=other');
  assert.equal(await page.locator('input[name="q"]').inputValue(), 'other');
  console.log('PASS search, clear and Back preserve committed filters');
  await page.getByRole('heading', { name: 'All properties', exact: true }).waitFor();
  // Preserve mounted form state during visibility checks.
  const field = page.locator('input[name="q"]');
  await field.fill('unsubmitted draft');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page
    .getByRole('heading', { name: 'All properties', exact: true })
    .waitFor({ state: 'visible' });
  assert.equal(await field.inputValue(), 'unsubmitted draft');
  console.log('PASS focus verification preserves local form state');

  failReads = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByText('Showing saved data. Refresh failed.', { exact: false }).waitFor();
  await page
    .getByRole('heading', { name: 'All properties', exact: true })
    .waitFor({ state: 'visible' });
  console.log('PASS failed background refresh retains labeled data');
  failReads = false;

  const other = await context.newPage();
  await other.goto(web + '/partner/bookings');
  await other.getByRole('heading', { name: 'Booking records', exact: true }).waitFor();
  await other.evaluate(() => {
    const channel = new BroadcastChannel('rentra:identity');
    channel.postMessage('changing');
    channel.close();
  });
  await page
    .getByRole('heading', { name: 'All properties', exact: true })
    .waitFor({ state: 'hidden' });
  await context.addCookies([{ name: 'rentra_session', value: 'fixture-b', url: web }]);
  await other.evaluate(() => {
    const channel = new BroadcastChannel('rentra:identity');
    channel.postMessage('changed');
    channel.close();
  });
  await page.getByRole('heading', { name: 'All properties', exact: true }).waitFor();
  assert.ok((await page.textContent('body')).includes('Fixture b'));
  assert.ok((await page.textContent('body')).includes('Private property b'));
  assert.ok(!(await page.textContent('body')).includes('Private property a'));
  console.log('PASS cross-tab account change hides and replaces cached UI');

  revision = '1';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForLoadState('networkidle');
  await page.getByRole('heading', { name: 'All properties', exact: true }).waitFor();
  revoked = true;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.waitForURL('**/partner/login?session=ended');
  console.log('PASS revoked session leaves private pages');
  assert.deepEqual(errors, []);
  console.log('PASS no browser runtime errors');
} finally {
  await browser?.close();
  next.kill('SIGTERM');
  api.closeAllConnections();
  await new Promise((resolve) => api.close(resolve));
}
