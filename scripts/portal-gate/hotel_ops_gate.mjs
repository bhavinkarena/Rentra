// Hotel operations gate (hotel plan, Phase 5). Same disposable stack as hotel_wizard_gate.mjs, with a
// live hotel (run hotel_wizard_gate.mjs and hotel_admin_gate.mjs first). The owner opens Rates & rooms,
// bulk-raises prices for 90 nights on every room type, closes one room type for one night from the grid,
// sees the phone day list, and gives a team member the Front desk role. axe at 1440, overflow at 390.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const postgres = require(
  process.env.POSTGRES_MODULE || '../../../rentra-backend/node_modules/postgres',
);

const DB = process.env.GATE_DATABASE_URL ?? '';
if (!/127\.0\.0\.1:55432\/rentra_cp02$/.test(DB))
  throw new Error('refusing non-disposable database');
const web = process.env.GATE_WEB || 'http://localhost:3106';
const out = process.env.GATE_OUT || 'hotel-ops-gate-out';
fs.mkdirSync(out, { recursive: true });
const tokens = JSON.parse(fs.readFileSync(process.env.GATE_TOKENS, 'utf8'));
const axe = fs.readFileSync(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const sql = postgres(DB, { max: 2, onnotice: () => {} });
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
const addDays = (date, n) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rentra_session', value: tokens.owner, url: web }]);
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url ?? '')) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));

async function audit(name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(async () =>
    (
      await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })
    ).violations.map((v) => `${v.id}(${v.nodes.length})`),
  );
  check(`axe ${name} (1440)`, result.length === 0, result.join(', '));
  await page.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(page.url(), { waitUntil: 'networkidle' });
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.screenshot({ path: `${out}/${name}-390.png`, fullPage: true });
  await phone.close();
}

try {
  const [hotel] =
    await sql`SELECT r.id FROM rentable r JOIN category c ON c.id=r.category_id JOIN "user" u ON u.id=r.client_id
    WHERE c.vertical_code='hotel' AND r.status='live' AND u.email='client@gmail.com' ORDER BY r.updated_at DESC LIMIT 1`;
  if (!hotel)
    throw new Error('No live hotel: run hotel_wizard_gate.mjs and hotel_admin_gate.mjs first.');
  const id = hotel.id;
  await sql`DELETE FROM rate_override o USING rate_plan p WHERE p.id=o.rate_plan_id AND p.rentable_id=${id}`;
  await sql`DELETE FROM room_night n USING room_type t WHERE t.id=n.room_type_id AND t.rentable_id=${id} AND n.sold=0 AND n.held=0`;

  // 1. Rates & rooms grid in the calendar.
  await page.goto(`${web}/partner/calendar?property=${id}`, { waitUntil: 'networkidle' });
  await page.getByRole('region', { name: 'Rates and rooms grid' }).waitFor({ timeout: 30000 });
  const rows = await page.locator('[aria-label="Rates and rooms grid"] tbody tr').count();
  check('grid shows every room type', rows === 3, String(rows));
  check('no farmhouse day/night lanes', (await page.getByText('No dates open').count()) === 0);
  await audit('01-rates-rooms');

  // 2. Bulk edit: next 90 nights, every room type, price ₹3,200.
  await page.getByRole('button', { name: 'Change rates or rooms' }).click();
  const dialog = page.getByRole('dialog', { name: 'Change rates or rooms' });
  await dialog.locator('input[type="date"]').first().fill(today);
  await dialog.locator('input[type="date"]').nth(1).fill(addDays(today, 89));
  await dialog.getByLabel('₹ per night').fill('3200');
  await dialog.getByRole('button', { name: 'Preview' }).click();
  await dialog.getByText(/This changes 270 room-nights/).waitFor({ timeout: 30000 });
  check('preview counts 90 nights × 3 room types', true);
  await audit('02-bulk-preview');
  const started = Date.now();
  await dialog.getByRole('button', { name: 'Apply to 270 room-nights' }).click();
  await dialog.waitFor({ state: 'detached', timeout: 30000 });
  check(
    'bulk edit saved within 2 s (incl. round trip)',
    Date.now() - started < 2000,
    `${Date.now() - started} ms`,
  );
  const [{ n }] =
    await sql`SELECT count(*)::int AS n FROM rate_override o JOIN rate_plan p ON p.id=o.rate_plan_id WHERE p.rentable_id=${id} AND o.rate_minor=320000`;
  check('270 date prices stored', n === 270, String(n));
  await page.getByText('₹3,200').first().waitFor({ timeout: 30000 });
  check('grid shows the new price', true);

  // 3. Close one room type for tomorrow from its cell.
  await page
    .getByRole('button', { name: /^Deluxe Double, .*Edit$/ })
    .nth(1)
    .click();
  const cell = page.getByRole('dialog', { name: 'Change rates or rooms' });
  await cell.getByText('Close (stop selling)').click();
  await cell.getByRole('button', { name: 'Preview' }).click();
  await cell.getByRole('button', { name: 'Apply to 1 room-nights' }).click();
  await cell.waitFor({ state: 'detached', timeout: 30000 });
  const [closed] =
    await sql`SELECT n.stop_sell FROM room_night n JOIN room_type t ON t.id=n.room_type_id WHERE t.rentable_id=${id} AND t.name='Deluxe Double' AND n.night=${addDays(today, 1)}`;
  check('one night closed from the grid', closed?.stop_sell === true);
  await audit('03-after-close');

  // 4. Rooms open can't go below rooms booked (a held room on a night, set to 0).
  await page.getByRole('button', { name: 'Change rates or rooms' }).click();
  const guard = page.getByRole('dialog', { name: 'Change rates or rooms' });
  await sql`INSERT INTO room_night (room_type_id, night, allotment, held)
    SELECT t.id, ${addDays(today, 5)}, t.room_count, 1 FROM room_type t WHERE t.rentable_id=${id} AND t.name='Standard Twin'
    ON CONFLICT (room_type_id, night) DO UPDATE SET held=1`;
  await guard.locator('input[type="date"]').first().fill(addDays(today, 5));
  await guard.locator('input[type="date"]').nth(1).fill(addDays(today, 5));
  await guard.getByText('Rooms open to Rentra').click();
  await guard.getByLabel('rooms', { exact: true }).fill('0');
  await guard.getByRole('button', { name: 'Preview' }).click();
  await guard.getByRole('button', { name: /^Apply to/ }).click();
  await guard.getByText(/Rooms open cannot go below rooms booked/).waitFor({ timeout: 30000 });
  check('rooms below booked refused with the night named', true);
  await sql`UPDATE room_night n SET held=0 FROM room_type t WHERE t.id=n.room_type_id AND t.rentable_id=${id} AND t.name='Standard Twin' AND n.night=${addDays(today, 5)}`;
  await guard.getByRole('button', { name: 'Close' }).first().click();

  // 5. Phone: day list with Open/Close.
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(`${web}/partner/calendar?property=${id}`, { waitUntil: 'networkidle' });
  check(
    'phone shows the day list',
    (await phone.getByRole('button', { name: 'Open', exact: true }).count()) >= 1 &&
      (await phone.getByRole('button', { name: 'Close', exact: true }).count()) >= 1,
  );
  await phone.close();

  // 6. Team: invite a front desk member.
  await page.goto(`${web}/partner/team/invite`, { waitUntil: 'networkidle' });
  const role = page.locator('select[name="hotelRole"]').first();
  await role.waitFor({ timeout: 30000 });
  check(
    'team form offers hotel roles',
    (await role.locator('option').allTextContents()).join('|').includes('Front desk'),
  );
  await audit('04-team');
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
