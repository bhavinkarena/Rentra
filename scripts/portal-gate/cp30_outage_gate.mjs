// Requires the CP30 fixture behind fault-proxy.mjs and production Next on :3106.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const results = [];
let completed = false;
const check = (check, pass) => {
  results.push({ check, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${check}`);
  assert(pass, check);
};
const fault = async (pattern = '') => {
  const response = await fetch(
    'http://localhost:4106/__fault/set?re=' + encodeURIComponent(pattern),
  );
  assert(response.ok);
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  for (const [role, prefix] of [
    ['admin', '/admin/bookings/'],
    ['owner', '/partner/bookings/'],
    ['customer', '/bookings/'],
    ['staff', '/staff/visits/'],
  ]) {
    const context = await browser.newContext();
    await context.addCookies([
      {
        name:
          role === 'admin' ? 'rentra_admin' : role === 'staff' ? 'rentra_staff' : 'rentra_session',
        value: f.tokens[role],
        url: 'http://localhost:3106',
      },
    ]);
    const page = await context.newPage();
    const url =
      'http://localhost:3106' +
      prefix +
      f.booking.order +
      '?tab=evidence&from=' +
      encodeURIComponent(prefix.slice(0, -1) + '?tab=today&q=ORD-CP08');
    await fault('/api/v1/(admin/records/|partner/records/|customer/records/|staff/visits/)');
    await page.goto(url, { waitUntil: 'networkidle' });
    const retry = page.getByRole('button', { name: 'Try again', exact: true });
    await retry.waitFor();
    check(`${role} outage is retryable`, await retry.isVisible());
    check(
      `${role} outage is not missing or empty`,
      !/Record not found|No bookings|No visits/.test(await page.locator('main').innerText()),
    );
    await fault();
    await retry.click();
    await page.getByText('ORD-CP08', { exact: false }).first().waitFor();
    check(
      `${role} retry restores committed record`,
      (await page.locator('main').innerText()).includes('ORD-CP08'),
    );
    check(`${role} retry preserves URL and return filters`, page.url() === url);
    await context.close();
  }
  completed = true;
} finally {
  await fault();
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part30-outage-gate.json', import.meta.url),
    JSON.stringify(
      { completed, evidence: 'local disposable fixture with HTTP fault injection', results },
      null,
      2,
    ) + '\n',
  );
}
