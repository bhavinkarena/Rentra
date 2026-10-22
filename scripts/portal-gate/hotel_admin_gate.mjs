// Hotel admin gate (hotel plan, Phase 4). Same disposable stack as hotel_wizard_gate.mjs; run that first
// so a hotel is waiting in review. Admin reviews the room and rate panes, approves, verifies with the hotel
// checklist and publishes; the launch switch refuses public; a commission rule and new tax rates are
// previewed and saved. axe (WCAG 2.1 AA) at 1440 and overflow at 390 on every admin screen.
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
const out = process.env.GATE_OUT || 'hotel-admin-gate-out';
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
const addDays = (n) =>
  new Date(Date.now() + 5.5 * 3600000 + n * 86400000).toISOString().slice(0, 10);

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rentra_admin', value: tokens.admin, url: web }]);
const desk = await ctx.newPage();
const errors = [];
desk.on('console', (m) => {
  if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url ?? '')) errors.push(m.text());
});
desk.on('pageerror', (e) => errors.push(e.message));

async function audit(name) {
  // Let a post-save refresh finish: a half-rendered page reports transient title/contrast issues.
  await desk.waitForLoadState('networkidle');
  await desk.waitForTimeout(1000);
  await desk.addScriptTag({ content: axe });
  const result = await desk.evaluate(async () =>
    (
      await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })
    ).violations.map((v) => `${v.id}(${v.nodes.length})`),
  );
  check(`axe ${name} (1440)`, result.length === 0, result.join(', '));
  await desk.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(desk.url(), { waitUntil: 'networkidle' });
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.screenshot({ path: `${out}/${name}-390.png`, fullPage: true });
  await phone.close();
}
const go = (path) => desk.goto(`${web}${path}`, { waitUntil: 'networkidle' });
const waitStatus = async (id, status) => {
  for (
    let i = 0;
    i < 60 && (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status !== status;
    i += 1
  )
    await desk.waitForTimeout(250);
  return (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status;
};

try {
  const [hotel] = await sql`SELECT r.id FROM rentable r JOIN category c ON c.id=r.category_id
    WHERE c.vertical_code='hotel' AND r.status='pending_review' ORDER BY r.updated_at DESC LIMIT 1`;
  if (!hotel) throw new Error('No hotel waiting in review: run hotel_wizard_gate.mjs first.');
  const id = hotel.id;

  // 1. Review panes.
  await go(`/admin/properties/${id}`);
  await desk.getByRole('heading', { name: 'Room types', exact: true }).waitFor({ timeout: 30000 });
  check(
    'room types pane',
    await desk.getByRole('heading', { name: 'Room types', exact: true }).isVisible(),
  );
  check('rates pane', await desk.getByRole('heading', { name: 'Rates', exact: true }).isVisible());
  check(
    'hotel facts (30 rooms)',
    (await desk.locator('text=/Rooms\\s*30/').count()) > 0 ||
      (await desk.getByText('30', { exact: true }).count()) > 0,
  );
  check(
    'no farmhouse deposit field',
    (await desk.getByText('Deposit Amount', { exact: true }).count()) === 0,
  );
  await audit('01-review');

  // 2. Decision: hotel sections are flaggable; approve for a visit.
  await go(`/admin/properties/${id}?tab=decision`);
  await desk.getByRole('button', { name: 'Assign to me' }).click();
  await desk.getByRole('button', { name: 'Release assignment' }).waitFor();
  const flags = await desk
    .locator('input[name="flagged"]')
    .evaluateAll((nodes) => nodes.map((n) => n.value));
  check(
    'hotel sections flaggable',
    ['rooms', 'rates', 'stay', 'gst'].every((k) => flags.includes(k)) &&
      !flags.includes('capacity') &&
      !flags.includes('terms'),
    flags.join(','),
  );
  await audit('02-decision');
  await desk.locator('select[name="outcome"]').selectOption('approved_for_visit');
  await desk
    .locator('textarea[name="reason"]')
    .fill('Room types, rates, rules and the lease checked.');
  await desk.getByRole('button', { name: 'Record decision' }).click();
  check(
    'approved for verification',
    (await waitStatus(id, 'pending_verification')) === 'pending_verification',
  );

  // 3. Verification with the hotel checklist, then publish.
  await go(`/admin/properties/${id}?tab=verification`);
  await desk
    .locator('input[name="scheduledAt"]')
    .first()
    .fill(`${addDays(1)}T11:00`);
  await desk.getByRole('button', { name: 'Schedule verification' }).click();
  await desk
    .getByRole('button', { name: 'Record verification outcome' })
    .waitFor({ timeout: 30000 });
  const items = desk.locator('input[name="checklist"]');
  const keys = await items.evaluateAll((nodes) => nodes.map((n) => n.value));
  check(
    'hotel checklist',
    ['roomsMatch', 'fireSafety', 'guestRegister'].every((k) => keys.includes(k)) &&
      !keys.includes('safeForGuests'),
    keys.join(','),
  );
  for (let i = 0; i < keys.length; i += 1) await items.nth(i).check();
  await desk
    .locator('textarea[name="findings"]')
    .fill('Video walk-through: all three room types, fire exits and the guest register.');
  await audit('03-verification');
  await desk.getByRole('button', { name: 'Record verification outcome' }).click();
  await desk.getByRole('button', { name: 'Publish this revision' }).waitFor({ timeout: 30000 });
  check(
    'publish panel says rooms are on sale',
    (await desk.getByText(/Bookable: 30 rooms on sale/).count()) > 0,
  );
  await desk.getByText('I have checked the verification evidence').click();
  await desk.getByRole('button', { name: 'Publish this revision' }).click();
  check('published', (await waitStatus(id, 'live')) === 'live');

  // 4. Launch switch: Hotels can be open to owners, not public yet.
  await go('/admin/catalogues/verticals');
  const row = desk.locator('li', { hasText: '(hotel)' });
  await row.locator('select[name="status"]').selectOption('public');
  await row.locator('input[name="reason"]').fill('Trying to open hotels to guests early.');
  await row.getByRole('button', { name: 'Preview changes' }).click();
  await row
    .getByText('Hotels cannot go public until guest booking ships.')
    .waitFor({ timeout: 30000 });
  check('public refused for hotels', true);

  // 5. Commission rule: preview, confirm; the same rule again is refused as an overlap.
  await go('/admin/finance/commission');
  await audit('04-commission');
  const addRule = async () => {
    await desk.locator('input[name="ratePercent"]').fill('13');
    await desk.locator('input[name="validFrom"]').fill(addDays(2));
    await desk
      .locator('input[name="reason"]')
      .last()
      .fill('Standard hotel commission after launch');
    await desk.getByRole('button', { name: 'Preview rule' }).click();
  };
  await sql`DELETE FROM commission_rule WHERE vertical_code='hotel' AND reason='Standard hotel commission after launch'`;
  await addRule();
  await desk.getByText(/₹390 commission \+ ₹70\.2 GST/).waitFor({ timeout: 30000 });
  check('commission preview shows the example', true);
  await desk.getByRole('button', { name: 'Confirm and save' }).click();
  await desk.getByText('Rule saved.', { exact: false }).waitFor({ timeout: 30000 });
  check(
    'rule listed',
    await desk
      .getByRole('cell', { name: '13%' })
      .first()
      .waitFor({ timeout: 30000 })
      .then(
        () => true,
        () => false,
      ),
  );
  await addRule();
  await desk.getByRole('button', { name: 'Confirm and save' }).click();
  await desk.getByText('Another rule already covers these dates').waitFor({ timeout: 30000 });
  check('overlapping rule refused', true);
  await audit('05-commission-saved');

  // 6. Tax: schedule new rates from a future date.
  await sql`DELETE FROM tax_slab WHERE vertical_code='hotel' AND effective_from > (now() AT TIME ZONE 'Asia/Kolkata')::date`;
  await sql`UPDATE tax_slab SET effective_to=NULL WHERE vertical_code='hotel' AND effective_from='2025-09-22'`;
  await go('/admin/finance/tax');
  await audit('06-tax');
  await desk.locator('input[name="effectiveFrom"]').fill(addDays(30));
  await desk.locator('input[name="reason"]').fill('Gate check notification 1/2026');
  await desk.getByRole('button', { name: 'Preview rates' }).click();
  await desk.getByText(/₹7,501: 18%/).waitFor({ timeout: 30000 });
  await desk.getByRole('button', { name: 'Confirm and save' }).click();
  await desk.getByText('New rates scheduled.').waitFor({ timeout: 30000 });
  check(
    'tax scheduled',
    await desk
      .getByText('Starts later')
      .first()
      .waitFor({ timeout: 30000 })
      .then(
        () => true,
        () => false,
      ),
  );
  await audit('07-tax-saved');
  const [{ n }] =
    await sql`SELECT count(*)::int AS n FROM audit_log WHERE action IN ('commission.create','tax_slabs.replace') AND at > now() - interval '10 minutes'`;
  check('commission and tax changes audited', n >= 2, String(n));
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await desk.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
