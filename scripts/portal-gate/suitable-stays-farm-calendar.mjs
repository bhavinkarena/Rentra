import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const out = new URL('../../docs/qa/story-3-12/farm-calendar/', import.meta.url);
await mkdir(out, { recursive: true });
const resultFile = new URL('results.json', out);
await writeFile(
  resultFile,
  JSON.stringify(
    {
      status: 'incomplete',
      checks: [
        { name: 'runner completed', ok: false, detail: 'Setup or execution has not completed' },
      ],
    },
    null,
    2,
  ),
);
const { auditPage } = await import('./browser-audit.mjs');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = JSON.parse(
  await readFile(
    new URL('../../../rentra-backend/tmp/story312/fixture.json', import.meta.url),
    'utf8',
  ),
);
const url = new URL(fixture.databaseUrl);
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.port, '55432');
assert.match(url.pathname, /^\/rentra_test_[a-f0-9]{32}$/);
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const checks = [];
const runtimeErrors = [];

const check = (name, ok, detail = '') => {
  checks.push({ source: 'browser', name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  assert.ok(ok, name);
};
async function auditState(name, page) {
  const result = await auditPage(page);
  check(
    `${name}: axe`,
    result.violations.length === 0,
    result.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    })),
  );
}
for (const width of [1440, 390]) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  context.on('page', (page) => {
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && /Each child|[Hh]ydrat/.test(message.text()))
        runtimeErrors.push(message.text());
    });
  });
  await context.addCookies([
    { name: 'rentra_session', value: fixture.tokens.farmOwner, url: 'http://127.0.0.1:3112' },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const day = new Date(Date.now() + 330 * 60000 + (width === 1440 ? 5 : 6) * 86400000)
    .toISOString()
    .slice(0, 10);
  try {
    await page.goto(`http://127.0.0.1:3112/partner/calendar?property=${fixture.ids.farm.listing}`, {
      waitUntil: 'networkidle',
    });
    check(
      `${width}: property title is readable`,
      await page
        .getByRole('heading', { name: 'Review River Farm', exact: true })
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    );
    const selectDay = async () =>
      width === 390
        ? page.locator(`[data-mini-day="${day}"]`).click()
        : page.locator(`[data-calendar-day="${day}"]`).click({ modifiers: ['Shift'] });
    await selectDay();
    const selection =
      width === 390
        ? page.locator('dialog[data-calendar-detail]')
        : page.getByRole('complementary', { name: 'Change selected dates', exact: true });
    await selection.getByRole('button', { name: 'Set price', exact: true }).click();
    await selection.getByPlaceholder('e.g. 12000').fill('2000');
    await selection.getByRole('button', { name: 'Preview price', exact: true }).click();
    await selection.getByRole('region', { name: 'Review changes', exact: true }).waitFor();
    check(
      `${width}: farm fixed-price preview reached`,
      (await selection.innerText()).includes('₹2,000'),
    );
    await auditState(`${width}: farm change preview`, page);
    await selection.getByRole('button', { name: 'Confirm changes', exact: true }).click();
    if (width === 390) {
      await selection
        .getByRole('region', { name: 'Review changes', exact: true })
        .waitFor({ state: 'hidden' });
      await selection.getByRole('button', { name: 'Close date detail', exact: true }).click();
    }
    await selection.waitFor({ state: 'hidden' });
    await selectDay();
    await selection.getByRole('button', { name: 'Set price', exact: true }).click();
    await selection
      .getByRole('checkbox', { name: 'Use a percentage of the current price', exact: true })
      .check();
    await selection.getByPlaceholder('e.g. 15 or -10').fill('10');
    await selection.getByRole('button', { name: 'Preview price', exact: true }).click();
    await selection.getByRole('region', { name: 'Review changes', exact: true }).waitFor();
    check(
      `${width}: farm percent preview uses effective override`,
      (await selection.innerText()).includes('₹2,000') &&
        (await selection.innerText()).includes('₹2,200'),
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`preview-${width}.png`, out)),
      fullPage: true,
    });
    await auditState(`${width}: farm change preview`, page);
    await selection.getByRole('button', { name: 'Confirm changes', exact: true }).click();
    if (width === 390) {
      await selection
        .getByRole('region', { name: 'Review changes', exact: true })
        .waitFor({ state: 'hidden' });
      await selection.getByRole('button', { name: 'Close date detail', exact: true }).click();
    }
    await selection.waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'networkidle' });
    if (width === 390) await selectDay();
    if (width === 390) await selection.getByText('₹2,200', { exact: true }).first().waitFor();
    check(
      `${width}: saved farm override survives reload`,
      width === 390
        ? (await selection.innerText()).includes('₹2,200')
        : (await page.locator(`[data-calendar-day="${day}"]`).getAttribute('aria-label')).includes(
            '₹2,200',
          ),
    );
    await page.screenshot({
      path: fileURLToPath(new URL(`saved-${width}.png`, out)),
      fullPage: true,
    });
  } catch (error) {
    if (!checks.length || checks.at(-1).ok)
      checks.push({
        source: 'browser',
        name: `${width}: farm calendar journey complete`,
        ok: false,
        detail: error.message,
      });
    console.error(error.message);
    await page
      .screenshot({ path: fileURLToPath(new URL(`failure-${width}.png`, out)), fullPage: true })
      .catch(() => {});
  } finally {
    await context.close();
  }
}
checks.push({
  source: 'browser',
  name: 'no browser runtime or React hydration/key errors',
  ok: runtimeErrors.length === 0,
  detail: runtimeErrors,
});
await browser.close();
await writeFile(
  resultFile,
  JSON.stringify(
    { status: checks.some((check) => !check.ok) ? 'failed' : 'completed', checks },
    null,
    2,
  ),
);
if (checks.some((c) => !c.ok)) process.exitCode = 1;
