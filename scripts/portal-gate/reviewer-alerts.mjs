// Stories 1.6/1.7 browser gate: a reviewer sees their own alerts with email state and marks one read.
// Run after owner-wizard.mjs on the serve-owner-wizard.mjs fixture (it leaves a submitted property).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { auditPage } from './browser-audit.mjs';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE),
  postgres = require(process.env.POSTGRES_MODULE);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const database = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname.startsWith('/rentra_test_'),
);
const sql = postgres(fixture.databaseUrl, { max: 1 });
const [property] = await sql`SELECT r.id, r.title FROM rentable r
  WHERE r.client_id=${fixture.ids.owner} AND r.status='pending_review' LIMIT 1`;
assert.ok(property, 'run owner-wizard.mjs first');
// Seeded the way the services raise them: one for this reviewer, one for another reviewer.
await sql`INSERT INTO admin_alert(admin_id, event_key, kind, rentable_id, detail, email_state, email_failure)
  VALUES (${fixture.ids.admin}, 'gate:mine', 'property_resubmitted', ${property.id},
    ${JSON.stringify({ pass: 2, title: property.title })}::text::jsonb, 'failed', 'CHANNEL_REJECTED'),
  (${fixture.ids.second}, 'gate:theirs', 'correction_unanswered', ${property.id},
    ${JSON.stringify({ pass: 1, days: 15, title: 'Someone else' })}::text::jsonb, 'sent', NULL)`;
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3143';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const errors = [];
try {
  for (const width of [360, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    await context.addCookies([{ name: 'rentra_admin', value: fixture.tokens.admin, url: web }]);
    const page = await context.newPage();
    page.setDefaultTimeout(90000);
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${web}/admin/properties`, { waitUntil: 'networkidle' });
    const region = page.getByRole('region', { name: /Your review alerts/ });
    await region.getByRole('link', { name: /Owner resubmitted/ }).waitFor();
    await region.getByText(/Email failed \(CHANNEL_REJECTED\)/).waitFor();
    assert.equal(await region.getByText('Someone else').count(), 0, 'only my alerts');
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    const serious = (await auditPage(page)).violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact),
    );
    assert.deepEqual(
      serious.map((v) => v.id),
      [],
    );
    console.log(`PASS ${width}: own alerts with visible email failure`);
    if (width === 1280) {
      await region.getByRole('button', { name: 'Mark read' }).click();
      await page.getByRole('region', { name: /Your review alerts/ }).waitFor({ state: 'detached' });
      console.log('PASS mark read removes the alert from the unread list');
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await sql.end();
}
