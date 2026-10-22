// Hotel post-stay gate (hotel plan, Phase 8). Disposable stack of hotel_checkout_gate.mjs plus 0068
// applied and `.qa-hotel-payable.mjs` run (two paid Riverside stays moved into the past: one checked in,
// one non-refundable and cancelled), with a hotel commission rule covering their dates.
// Admin: hotel payouts preview reconciles, Test run is made, UTR recorded; hotel analytics.
// Owner: hotel earnings, statement (totals add up), draft commission invoice, hotel analytics.
// axe (WCAG 2.1 AA) at 1440 and overflow at 390 on every screen.
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
const out = process.env.GATE_OUT || 'hotel-post-stay-gate-out';
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
const rupees = (text) => Number(String(text).replace(/[^\d.]/g, ''));

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];
async function context(cookie) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([cookie]);
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (m.type() === 'error' && !/favicon\.ico$/.test(m.location().url ?? ''))
      errors.push(`${page.url()} ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
async function audit(page, name) {
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
  const phone = await page.context().newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(page.url(), { waitUntil: 'networkidle' });
  await phone.waitForTimeout(500);
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.screenshot({ path: `${out}/${name}-390.png`, fullPage: true });
  await phone.close();
}

const admin = await context({ name: 'rentra_admin', value: tokens.admin, url: web });
const owner = await context({
  name: 'rentra_session',
  value: process.env.GATE_HOTEL_OWNER_TOKEN,
  url: web,
});
try {
  // 1. Admin: the Test run preview reconciles and is made exactly once; the UTR settles it.
  await admin.goto(`${web}/admin/finance/hotel-payouts?environment=test`, {
    waitUntil: 'networkidle',
  });
  const before = await sql`SELECT count(*)::int AS n FROM payout_run`;
  check(
    'payout preview lists payable stays',
    (await admin.getByText(/Paid ₹[\d,.]+ − refunds/).count()) >= 1,
  );
  await audit(admin, '01-admin-payouts');
  await admin.getByRole('button', { name: 'Make payout run' }).click();
  await admin.getByRole('button', { name: 'Confirm run' }).click();
  await admin.getByText(/Run P-\d+ created/).waitFor({ timeout: 30000 });
  const [run] =
    await sql`SELECT id, run_number, net_minor::int AS net, total_bookings, snapshot FROM payout_run ORDER BY created_at DESC LIMIT 1`;
  const lines = run.snapshot.lines;
  const t = run.snapshot.totals;
  check(
    'one run made',
    (await sql`SELECT count(*)::int AS n FROM payout_run`)[0].n === before[0].n + 1,
  );
  check(
    'run reconciles to the paisa',
    t.netMinor ===
      t.paidMinor -
        t.refundedMinor -
        t.gstRentraOwesMinor -
        t.commissionMinor -
        t.commissionGstMinor -
        t.tcsMinor -
        t.tdsMinor && run.net === t.netMinor,
    `${t.paidMinor} − ${t.refundedMinor} − ${t.commissionMinor} − ${t.commissionGstMinor} − ${t.tcsMinor} − ${t.tdsMinor} = ${t.netMinor}`,
  );
  check(
    'test run moves no money',
    (
      await sql`SELECT count(*)::int AS n FROM payout WHERE payout_run_id=${run.id} AND (actual_net_minor<>0 OR funding_allocation_id IS NOT NULL)`
    )[0].n === 0,
  );
  await admin.reload({ waitUntil: 'networkidle' });
  await admin.getByRole('button', { name: 'Record transfer' }).first().click();
  await admin.getByLabel(`Bank UTR for run ${run.run_number}`).fill('HDFCN2026102712345');
  await admin.getByLabel(`Bank UTR for run ${run.run_number}`).press('Enter');
  await admin.waitForTimeout(2500);
  const [settled] = await sql`SELECT status FROM payout_run WHERE id=${run.id}`;
  check('UTR recorded settles the run', settled.status === 'completed');
  await admin.goto(`${web}/admin/finance/hotel-analytics`, { waitUntil: 'networkidle' });
  check(
    'admin hotel analytics shows occupancy',
    (await admin.getByText(/Occupancy/i).count()) >= 1,
  );
  await audit(admin, '02-admin-analytics');

  // 2. Owner: earnings, the statement adds up, the invoice is a draft (no company details configured).
  const ownerLines = lines.filter((line) => line.ownerId === process.env.GATE_HOTEL_OWNER_ID);
  await owner.goto(`${web}/partner/earnings/hotels`, { waitUntil: 'networkidle' });
  check(
    'owner hotel earnings page',
    (await owner.getByRole('heading', { level: 1 }).count()) === 1,
  );
  await audit(owner, '03-owner-earnings');
  await owner.goto(`${web}/partner/earnings/hotels/${run.id}`, { waitUntil: 'networkidle' });
  const net = ownerLines.reduce((sum, line) => sum + line.netMinor, 0);
  const shown = await owner
    .getByText(
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
        .format(net / 100)
        .replace('.00', ''),
    )
    .count();
  check('statement shows the owner net', shown >= 1, `₹${net / 100}`);
  check('statement shows the UTR', (await owner.getByText('HDFCN2026102712345').count()) >= 1);
  await audit(owner, '04-owner-statement');
  await owner.goto(`${web}/partner/earnings/hotels/${run.id}/invoice`, {
    waitUntil: 'networkidle',
  });
  check('invoice marked draft', (await owner.getByText(/Draft/).count()) >= 1);
  await audit(owner, '05-owner-invoice');
  await owner.goto(`${web}/partner/earnings/hotels/analytics`, { waitUntil: 'networkidle' });
  check('owner analytics shows occupancy', (await owner.getByText(/Occupancy/i).count()) >= 1);
  await audit(owner, '06-owner-analytics');
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await admin.screenshot({ path: `${out}/failure-admin.png`, fullPage: true }).catch(() => {});
  await owner.screenshot({ path: `${out}/failure-owner.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
