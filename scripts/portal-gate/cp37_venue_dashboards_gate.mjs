// CP37 dashboards with venues (entertainment plan, Phase 11). Disposable stack only.
// Run after cp36 (which leaves a paid 7 PM Court 2 booking) and one farmhouse booking (any
// state) for the same customer, on the same database:
//   GATE_DB_JSON  {url, farm, venue, venueOwner}   GATE_TOKENS {customer, owner, admin}
//   web :3106; PLAYWRIGHT_DIR has playwright-core + @axe-core/playwright.
// The farmhouse is handed to the venue owner for this gate, so one owner has both kinds.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const req = createRequire(process.env.PLAYWRIGHT_DIR || process.cwd() + '/');
const { chromium } = req('playwright-core');
const { default: AxeBuilder } = await import(req.resolve('@axe-core/playwright'));
const postgres = createRequire(new URL('../../../rentra-backend/', import.meta.url).pathname)(
  'postgres',
);
const db = JSON.parse(await readFile(process.env.GATE_DB_JSON, 'utf8'));
if (!/^postgres:\/\/postgres@127\.0\.0\.1:55432\//.test(db.url))
  throw new Error('refusing non-disposable database');
const tokens = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const OUT = process.env.GATE_OUT || '/tmp';
const sql = postgres(db.url, { max: 1, onnotice: () => {} });
const web = 'http://localhost:3106';
const results = [];
const check = (name, pass, detail = '') => {
  results.push(!!pass);
  console.log((pass ? 'PASS ' : 'FAIL ') + name + (pass ? '' : ' — ' + detail));
};
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const problems = [];
async function open(cookie, width = 1440) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  await context.addCookies([{ ...cookie, url: web }]);
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/favicon|React DevTools/.test(m.text()) &&
      problems.push('console ' + m.text().slice(0, 200)),
  );
  return page;
}
const go = async (page, path) => {
  await page.goto(web + path, { waitUntil: 'networkidle' });
  return page.locator('main').innerText();
};
const axe = async (page, name) => {
  const r = await new AxeBuilder({ page })
    .include('main')
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  check(
    name + ' axe 0',
    r.violations.length === 0,
    r.violations.map((v) => v.id + ':' + v.nodes[0]?.target.join(' ')).join(', '),
  );
};
const courtLabel = /7:00 pm – 8:00 pm · Court 2 · Box cricket/;

try {
  await sql`UPDATE rentable SET client_id=${db.venueOwner} WHERE id=${db.farm}`;
  const [{ count }] =
    await sql`SELECT count(*)::int FROM booking_order WHERE rentable_id=${db.venue} AND state='confirmed'`;
  check('cp36 left a confirmed venue booking', count >= 1, String(count));

  // Customer.
  const customer = await open({ name: 'rentra_session', value: tokens.customer });
  let text = await go(customer, '/bookings');
  check('customer list: venue row shows time, court and activity', courtLabel.test(text));
  await customer.locator('a[href^="/bookings/"]', { hasText: 'Smash Arena' }).first().click();
  await customer.waitForURL(/\/bookings\/[0-9a-f-]{36}/);
  text = await customer.locator('main').innerText();
  check('customer detail: header in players', /1 visit · 1 player/.test(text), text.slice(0, 300));

  // Owner with a farmhouse and a venue.
  const owner = await open({ name: 'rentra_session', value: tokens.owner });
  text = await go(owner, '/partner');
  check(
    'dashboard: kind chips for an owner with both',
    /Farmhouses/.test(text) && /Venues/.test(text),
  );
  text = await go(owner, '/partner/listings');
  check('listings: venue capacity "3 courts · 12 players"', /3 courts · 12 players/.test(text));
  await owner.locator('#property-kind').selectOption('entertainment');
  await owner.waitForURL(/vertical=entertainment/);
  await owner.waitForLoadState('networkidle');
  text = await owner.locator('main').innerText();
  check(
    'listings: kind filter keeps only the venue',
    /Smash Arena/.test(text) && !/Review River Farm/.test(text),
  );
  await axe(owner, 'owner listings 1440');

  text = await go(owner, '/partner/bookings');
  check('owner bookings: venue row label', courtLabel.test(text));
  check('owner bookings: kind chips', /All kinds/.test(text) && /Venues/.test(text));
  await owner.getByRole('link', { name: 'Venues', exact: true }).click();
  await owner.waitForURL(/vertical=entertainment/);
  await owner.waitForLoadState('networkidle');
  text = await owner.locator('main').innerText();
  check('owner bookings: venues only', /Smash Arena/.test(text) && !/Review River Farm/.test(text));
  await go(owner, `/partner/bookings?property=${db.venue}`);
  const court = owner.getByLabel('Court', { exact: true });
  check(
    'owner bookings: court filter for the venue',
    (await court.locator('option').count()) === 4,
  );
  const [{ id: court1 }] =
    await sql`SELECT id FROM rentable_resource WHERE rentable_id=${db.venue} AND name='Court 1'`;
  await court.selectOption(court1);
  await owner.getByRole('button', { name: 'Apply' }).click();
  await owner.waitForURL(/resource=/);
  await owner.waitForLoadState('networkidle');
  check(
    'owner bookings: Court 1 has none of the Court 2 bookings',
    !courtLabel.test(await owner.locator('main').innerText()),
  );
  await axe(owner, 'owner bookings 1440');
  await owner.screenshot({ path: `${OUT}/owner-bookings-1440.png`, fullPage: true });

  text = await go(owner, `/partner/listings/${db.venue}/overview`);
  check(
    'overview: venue opens by weekly hours',
    /By weekly opening hours/.test(text) && !/Next open date\s*—/.test(text),
  );
  text = await go(owner, '/partner/calendar?view=agenda');
  check(
    'portfolio agenda: court timeline link and court on the booking',
    /Court timeline/.test(text) && /Booked visit · Court 2 · Box cricket/.test(text),
  );
  await axe(owner, 'portfolio agenda 1440');

  // Admin.
  const admin = await open({ name: 'rentra_admin', value: tokens.admin });
  text = await go(admin, '/admin/bookings');
  check('admin bookings: venue row label', courtLabel.test(text));
  check('admin bookings: kind chips', /All kinds/.test(text) && /Venues/.test(text));
  await axe(admin, 'admin bookings 1440');
  await admin.screenshot({ path: `${OUT}/admin-bookings-1440.png`, fullPage: true });
} finally {
  console.log('problems', problems);
  console.log(results.filter(Boolean).length + '/' + results.length + ' passed');
  await browser.close();
  await sql.end();
}
