// Run after stopping the disposable API fixture. The frontend must remain on :3106.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const results = [];
try {
  const context = await browser.newContext();
  await context.addCookies([
    { name: 'rentra_session', value: fixture.tokens.owner, url: 'http://localhost:3106' },
  ]);
  await context.addCookies([
    { name: 'rentra_admin', value: fixture.tokens.admin, url: 'http://localhost:3106' },
  ]);
  const customer = await browser.newContext();
  await customer.addCookies([
    { name: 'rentra_session', value: fixture.tokens.customer, url: 'http://localhost:3106' },
  ]);
  for (const [scope, paths] of [
    [context, ['/partner/disputes', '/admin/disputes']],
    [customer, ['/disputes']],
  ]) {
    const page = await scope.newPage();
    for (const base of paths) {
      for (const path of [
        base,
        base + '/' + fixture.disputeId,
        base + '/new?order=' + fixture.booking.order,
      ]) {
        await page.goto('http://localhost:3106' + path, { waitUntil: 'networkidle' });
        await page.getByRole('heading', { name: 'This page could not load' }).waitFor();
        const pass = await page.getByRole('button', { name: 'Try again', exact: true }).isVisible();
        results.push({ check: 'Retryable dispute outage ' + path, pass });
        console.log(pass ? 'PASS outage' : 'FAIL outage');
      }
      const result = await scope.request.get(
        'http://localhost:3106' +
          base +
          '/' +
          fixture.disputeId +
          '/attachments/00000000-0000-4000-8000-000000000000',
      );
      results.push({
        check: 'Unavailable download ' + base,
        pass: result.status() === 503 && !result.headers()['content-disposition'],
      });
    }
  }
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part23-outage-gate.json', import.meta.url),
    JSON.stringify({ results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
