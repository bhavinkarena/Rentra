// Hotel closed-beta gate (hotel plan, Phase 9). Disposable stack of hotel_checkout_gate.mjs with
// 0069 applied and Hotels set to 'partners'. Anonymous guests see no Hotels; an admin invites the
// guest's phone; the guest opens /beta, gets the pass, and can search, open a hotel and reach checkout.
// axe (WCAG 2.1 AA) at 1440 and overflow at 390 on every new screen.
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
const out = process.env.GATE_OUT || 'hotel-beta-gate-out';
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
const day = (n) => new Date(Date.now() + 5.5 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const errors = [];
async function context(cookie) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  if (cookie) await ctx.addCookies([cookie]);
  const page = await ctx.newPage();
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      !/favicon\.ico$|tile\.openstreetmap/.test(m.location().url ?? '') &&
      !/404/.test(m.text())
    )
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
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.close();
}

const anon = await context(null);
const admin = await context({ name: 'rentra_admin', value: tokens.admin, url: web });
const guest = await context({
  name: 'rentra_session',
  value: process.env.GATE_GUEST_TOKEN,
  url: web,
});
try {
  await sql`UPDATE vertical_beta_guest SET revoked_at=now(), revoked_by=invited_by WHERE revoked_at IS NULL`;
  // 1. Anonymous: Hotels does not exist.
  // Next streams not-found with HTTP 200 once the shell has started; check the content instead.
  const hotelsHidden = async (page) => {
    await page.goto(`${web}/hotels`, { waitUntil: 'networkidle' });
    return (await page.getByText('Find a room that fits your trip.').count()) === 0;
  };
  check('anonymous /hotels shows not found in beta', await hotelsHidden(anon));
  await anon.goto(`${web}/search?vertical=hotel&city=surat`, { waitUntil: 'networkidle' });
  check('anonymous hotel search shows no hotels', (await anon.locator('article').count()) === 0);

  // 2. Admin invites the guest's phone.
  const [{ phone }] =
    await sql`SELECT right(phone, 10) AS phone FROM "user" WHERE email='hotel-guest@rentra.invalid'`;
  await admin.goto(`${web}/admin/catalogues/beta`, { waitUntil: 'networkidle' });
  await admin.getByLabel('Mobile numbers (one per line)').fill(`${phone}\n9898989898`);
  await admin.getByLabel('Note (optional)').fill('Team beta');
  await admin.getByRole('button', { name: 'Invite' }).click();
  await admin.getByText(/2 invited/).waitFor({ timeout: 20000 });
  check('admin invites two numbers', true);
  await audit(admin, '01-admin-beta');

  // 3. The invited guest opens the invite link and gets Hotels.
  await guest.goto(`${web}/beta`, { waitUntil: 'networkidle' });
  await audit(guest, '02-beta-invite');
  await guest.getByRole('button', { name: 'Open Hotels' }).click();
  await guest.waitForURL(/\/hotels$/, { timeout: 30000 });
  const pass = (await guest.context().cookies()).find((c) => c.name === 'rentra_beta');
  check('beta pass cookie set (7 days)', pass && pass.expires * 1000 > Date.now() + 6 * 86400000);
  check(
    'invited guest sees the Hotels home',
    (await guest.getByRole('heading', { level: 1 }).textContent()).length > 0,
  );
  await guest.goto(
    `${web}/search?vertical=hotel&city=surat&checkin=${day(60)}&checkout=${day(62)}`,
    { waitUntil: 'networkidle' },
  );
  const cards = await guest.locator('article').count();
  check('invited guest sees hotels in search', cards > 0, String(cards));
  await guest.locator('article a').first().click();
  await guest.waitForURL(/\/listing\//);
  await guest
    .getByRole('button', { name: /^Add a / })
    .first()
    .waitFor({ timeout: 30000 });
  await guest
    .getByRole('button', { name: /^Add a / })
    .first()
    .click();
  const rail = guest.getByRole('complementary', { name: 'Your selection' });
  await rail.getByText(/^Total for 1 room/).waitFor({ timeout: 20000 });
  await rail.getByRole('button', { name: 'Reserve' }).click();
  await guest.waitForURL(/\/checkout\/review\//, { timeout: 30000 });
  check('invited guest reaches checkout', true);

  // 4. Revoked and uninvited: a fresh guest without the pass still sees nothing.
  const other = await context(null);
  check('a browser without the pass still sees no Hotels', await hotelsHidden(other));
  const [{ n }] =
    await sql`SELECT count(*)::int AS n FROM vertical_beta_guest WHERE revoked_at IS NULL`;
  check('two active invites recorded', n === 2, String(n));
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await guest.screenshot({ path: `${out}/failure-guest.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
