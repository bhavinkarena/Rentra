// Stop only the disposable API fixture before running this gate.
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
let completed = false;
try {
  const c = await browser.newContext();
  await c.addCookies([
    { name: 'rentra_admin', value: fixture.tokens.admin, url: 'http://localhost:3106' },
  ]);
  const p = await c.newPage();
  for (const type of ['categories', 'amenities', 'cities', 'areas']) {
    for (const suffix of ['', '/new', '/' + fixture.catalogueId]) {
      const path = '/admin/catalogues/' + type + suffix;
      await p.goto('http://localhost:3106' + path, { waitUntil: 'networkidle' });
      await p.getByRole('heading', { name: 'This page could not load' }).waitFor();
      const pass = await p.getByRole('button', { name: 'Try again', exact: true }).isVisible();
      results.push({ check: 'Retryable catalogue outage ' + path, pass });
      console.log(`${pass ? 'PASS' : 'FAIL'} ${path}`);
    }
  }
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part24-outage-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
