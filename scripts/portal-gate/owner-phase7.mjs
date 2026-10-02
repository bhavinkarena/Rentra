import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(
  pathToFileURL(
    process.env.PLAYWRIGHT_MODULE ||
      join(
        process.env.APPDATA,
        'npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs',
      ),
  ).href
);
import { auditPage } from './browser-audit.mjs';
const f = JSON.parse(await readFile(process.env.CP06_GATE_FIXTURE, 'utf8'));
const origin = process.env.GATE_WEB_ORIGIN || 'http://localhost:3107';
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
  headless: true,
});
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'rentra_session', value: f.tokens.owner, url: origin }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(origin + '/partner/calendar', { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Portfolio calendar', exact: true }).waitFor();
  const audit = await auditPage(page);
  assert.equal(
    audit.violations.length,
    0,
    JSON.stringify(
      audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ),
  );
  const first = page.locator('[data-calendar-day]').first();
  const date = await first.getAttribute('data-calendar-day');
  await first.focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(
    await page.locator(':focus').getAttribute('data-calendar-day'),
    new Date(Date.parse(date) + 86400000).toISOString().slice(0, 10),
  );
  const future = new Date(Date.now() + 10 * 86400000 + 330 * 60000).toISOString().slice(0, 10);
  await page.goto(`${origin}/partner/calendar?from=${future}&view=week`, {
    waitUntil: 'networkidle',
  });
  await page.locator(`[data-calendar-day="${future}"]`).click();
  await page.getByRole('button', { name: 'Set price', exact: true }).click();
  await page.getByLabel('Price (₹)').fill('1800');
  await page.getByRole('button', { name: 'Preview price', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
  await page.getByRole('button', { name: 'Undo (10 seconds)', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Undo (10 seconds)', exact: true }).click();
  await page.getByRole('button', { name: 'Close date detail' }).click();
  await page.goto(`${origin}/partner/bookings/${f.booking.order}`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Your guest', exact: true }).waitFor();
  await page
    .getByLabel('Private note (owner and assigned caretakers only)')
    .fill('Gate test private note');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/partner/calendar', { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(errors.length, 0, errors.join('\n'));
  await mkdir(new URL('../../docs/evidence/owner-phase7/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../../docs/evidence/owner-phase7/browser-checks.json', import.meta.url),
    JSON.stringify(
      {
        calendarAxe: 0,
        keyboard: true,
        pricePreviewConfirmUndo: true,
        ownerDetail: true,
        mobileNoOverflow: true,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Phase 7 browser gates passed');
} finally {
  await browser.close();
}
