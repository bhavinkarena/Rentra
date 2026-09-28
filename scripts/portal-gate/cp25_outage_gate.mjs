// Stop only the disposable API fixture before running; keep frontend :3106 running.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
let completed = false;
const results = [];
try {
  const ctx = await browser.newContext();
  await ctx.addCookies([
    { name: 'rentra_admin', value: f.tokens.admin, url: 'http://localhost:3106' },
  ]);
  const p = await ctx.newPage();
  for (const path of [
    '/admin/content',
    ...['terms', 'privacy', 'cancellation', 'help', 'contact'].map((k) => '/admin/content/' + k),
    '/help',
    '/policies/terms',
    '/policies/terms/' + f.contentVersion,
    '/help/history/help/2026-09-21',
  ]) {
    await p.goto('http://localhost:3106' + path, { waitUntil: 'networkidle' });
    await p
      .getByRole('heading', {
        name: path.startsWith('/admin')
          ? 'This page could not load'
          : 'This page is temporarily unavailable',
        exact: true,
      })
      .waitFor();
    const pass = await p.getByRole('button', { name: 'Try again', exact: true }).isVisible();
    results.push({ check: 'Retryable publication outage ' + path, pass });
    console.log(`${pass ? 'PASS' : 'FAIL'} ${path}`);
  }
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part25-outage-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
