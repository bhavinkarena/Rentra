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
  const page = await context.newPage();
  for (const path of [
    '/partner/support',
    '/partner/support/' + fixture.ids.listing,
    '/admin/support',
    '/admin/support/' + fixture.ids.listing,
  ]) {
    await page.goto(`http://localhost:3106${path}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'This page could not load' }).waitFor();
    const pass =
      (await page.getByRole('button', { name: 'Try again', exact: true }).isVisible()) &&
      !(await page.getByRole('heading', { name: 'Record not found' }).count());
    results.push({
      check: `Retryable support outage ${path}`,
      pass,
    });
    console.log(pass ? 'PASS retryable outage' : 'FAIL outage');
  }
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part17-outage-gate.json', import.meta.url),
    JSON.stringify({ results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
