// CP35 venue time picker (entertainment plan, Phase 9). Disposable stack only:
//   GATE_DB_JSON  {url} of a disposable DB seeded with listing-review-fixture + venue-fixture (venue001)
//   GATE_TOKENS   {customer, owner} session cookies minted in that DB
//   API :4106 with test Razorpay keys, web :3106 (next dev); PLAYWRIGHT_DIR has playwright-core + @axe-core/playwright.
// Grid, chip names, keyboard, quote, court/activity rules, card pre-selection, conflict refresh,
// login hand-off, phone sheet, owner drag-to-block and a 30 courts × 20 hours timeline.
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const req = createRequire(process.env.PLAYWRIGHT_DIR || process.cwd() + '/');
const { chromium } = req('playwright-core');
const postgres = createRequire(new URL('../../../rentra-backend/', import.meta.url).pathname)(
  'postgres',
);
const { default: AxeBuilder } = await import(req.resolve('@axe-core/playwright'));
const db = JSON.parse(await readFile(process.env.GATE_DB_JSON, 'utf8'));
if (!/^postgres:\/\/postgres@127\.0\.0\.1:55432\//.test(db.url))
  throw new Error('refusing non-disposable database');
const tokens = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const sql = postgres(db.url, { max: 1, onnotice: () => {} });
const web = 'http://localhost:3106',
  OUT = process.env.GATE_OUT || '/tmp',
  path = '/listing/smash-arena-venue001';
const [venue] = await sql`SELECT id FROM rentable WHERE public_code='venue001'`;
// Re-runnable: drop the 30-court fixture from a previous run and restore 06:00–01:00.
await sql`DELETE FROM rentable_resource WHERE rentable_id=${venue.id} AND sort_order >= 10`;
await sql`DELETE FROM inventory_reservation WHERE rentable_id=${venue.id} AND source='owner_block'`;
await sql`UPDATE rentable SET booking_config = booking_config || ${sql.json({ weeklyHours: Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => [k, [{ open: '06:00', close: '01:00', closesNextDay: true }]])) })} WHERE id=${venue.id}`;
// A weekday 3 days out, India time.
let d = new Date(Date.now() + 5.5 * 36e5 + 3 * 864e5);
while ([0, 6].includes(d.getUTCDay())) d = new Date(+d + 864e5);
const date = d.toISOString().slice(0, 10);
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
async function open(width, cookie) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  if (cookie) await context.addCookies([{ name: 'rentra_session', value: cookie, url: web }]);
  const page = await context.newPage();
  page.on('pageerror', (e) => problems.push('pageerror ' + e.message));
  page.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      !/favicon|Download the React DevTools/.test(m.text()) &&
      problems.push('console ' + m.text().slice(0, 200)),
  );
  return page;
}
const axe = async (page, name, scope) => {
  let b = new AxeBuilder({ page });
  if (scope) b = b.include(scope);
  const r = await b.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  check(
    name + ' axe 0',
    r.violations.length === 0,
    r.violations
      .map(
        (v) =>
          v.id +
          ':' +
          v.nodes
            .map((n) => n.target.join(' '))
            .slice(0, 2)
            .join('|'),
      )
      .join(', '),
  );
};
const rail = (page) => page.locator('#book');

try {
  // Desktop, signed-in customer.
  const page = await open(1440, tokens.customer);
  await page.goto(web + path + '?date=' + date, { waitUntil: 'networkidle' });
  const chips = rail(page).getByRole('group', { name: 'Start time' }).getByRole('button');
  await chips.first().waitFor();
  check('grid shows 18 starts for 1 hr', (await chips.count()) === 18, String(await chips.count()));
  const peakName = await chips.nth(12).getAttribute('aria-label');
  check(
    'chip has full accessible name with Peak',
    /^6:00 PM to 7:00 PM, ₹1,200, Peak, 2 courts free$/.test(peakName),
    peakName,
  );
  check('chips >= 44px tall', (await chips.first().boundingBox()).height >= 44);
  // Keyboard: one tab stop, arrows move.
  await chips.first().focus();
  await page.keyboard.press('ArrowRight');
  check(
    'ArrowRight moves focus',
    (await page.evaluate(() => document.activeElement.getAttribute('aria-label'))).startsWith(
      '7:00 AM',
    ),
  );
  await page.keyboard.press('ArrowDown');
  check(
    'ArrowDown moves a row',
    (await page.evaluate(() => document.activeElement.getAttribute('aria-label'))).startsWith(
      '10:00 AM',
    ),
  );
  check(
    'roving tabindex',
    (await rail(page).locator('[aria-labelledby$="-times"] button[tabindex="0"]').count()) === 1,
  );
  await page.keyboard.press('Enter');
  await rail(page).locator('[data-quote-total]').waitFor();
  check(
    'quote total for 10 AM',
    (await rail(page).locator('[data-quote-total]').innerText()) === '₹864',
    await rail(page).locator('[data-quote-total]').innerText(),
  );
  await page.screenshot({ path: OUT + '/rail-quote-1440.png' });
  const court = rail(page).getByLabel('Court', { exact: true });
  check(
    'court select any free',
    (await court.locator('option').first().innerText()) === 'Any available court (2 free)',
  );
  await court.selectOption({ label: 'Court 2' });
  await page.waitForTimeout(600);
  check(
    'URL carries court and start',
    /start=10%3A00|start=10:00/.test(page.url()) && /court=/.test(page.url()),
    page.url(),
  );
  await axe(page, 'rail 1440');
  // Duration + changes price; choosing a time again needed.
  await rail(page).getByRole('button', { name: 'Longer' }).click();
  await chips.first().waitFor();
  check('2 hr grid still 06:00–23:00', (await chips.count()) === 18, String(await chips.count()));
  check(
    'time cleared on duration change',
    (await rail(page)
      .locator('button[aria-pressed="true"]')
      .filter({ hasText: /AM|PM/ })
      .count()) === 0,
  );
  // Activity with one court: no court select.
  await rail(page).getByLabel('Activity', { exact: true }).selectOption('pickleball');
  await chips.first().waitFor();
  await chips.first().click();
  await rail(page).locator('[data-quote-total]').waitFor();
  check(
    'single court shows 1 court, no select',
    (await rail(page).getByLabel('Court', { exact: true }).count()) === 0 &&
      (await rail(page).getByText('1 court', { exact: true }).count()) === 1,
  );
  // Review link after the tick.
  // Venues without a deposit have no rail tick (Phase 10); the review page carries the terms.
  check('no rail tick without deposit', (await rail(page).getByRole('checkbox').count()) === 0);
  const review = rail(page).getByRole('link', { name: 'Review booking' });
  check(
    'Review booking links to checkout review',
    /^\/checkout\/review\//.test(await review.getAttribute('href')),
  );

  // Pre-selection from a card chip.
  const pre = await open(1440, tokens.customer);
  await pre.goto(
    web + path + '?activity=box-cricket&date=' + date + '&duration=120&players=6&start=19:00',
    { waitUntil: 'networkidle' },
  );
  await rail(pre).locator('[data-quote-total]').waitFor();
  check(
    'card link pre-selects 7 PM for 2 hr',
    (await rail(pre)
      .locator('button[aria-pressed="true"]')
      .filter({ hasText: '7:00 PM' })
      .count()) === 1 && (await rail(pre).locator('output').first().innerText()) === '2 hr',
  );
  check(
    'pre-selected quote 2 hr peak',
    (await rail(pre).locator('[data-quote-total]').innerText()) === '₹2,592',
    await rail(pre).locator('[data-quote-total]').innerText(),
  );
  // Conflict: both courts get blocked at 19:00 behind the guest's back; changing court requotes, grid refreshes.
  await sql`INSERT INTO inventory_reservation (rentable_id, resource_id, source, blocked_start_at, blocked_end_at, state, reason)
    VALUES (${venue.id}, NULL, 'owner_block', ${date + 'T19:00:00+05:30'}, ${date + 'T21:00:00+05:30'}, 'committed', 'Gate conflict')`;
  await rail(pre).getByLabel('Court', { exact: true }).selectOption({ label: 'Court 1' });
  await rail(pre).getByText('That time was just taken').waitFor({ timeout: 15000 });
  check(
    'conflict refreshes grid and drops 7 PM',
    (await rail(pre)
      .getByRole('button', { name: /^7:00 PM to/ })
      .count()) === 0,
  );
  await sql`DELETE FROM inventory_reservation WHERE reason='Gate conflict'`;

  // Signed out: login hand-off.
  const anon = await open(1440);
  await anon.goto(web + path + '?date=' + date + '&start=08:00', { waitUntil: 'networkidle' });
  await rail(anon).getByRole('button', { name: 'Log in to book' }).waitFor();
  check('signed-out guest gets Log in to book', true);

  // Phone: bar opens the sheet with the picker.
  const phone = await open(390, tokens.customer);
  await phone.goto(web + path + '?date=' + date, { waitUntil: 'networkidle' });
  check(
    'rail picker hidden on phone',
    !(await rail(phone)
      .getByRole('group', { name: 'Start time' })
      .isVisible()
      .catch(() => false)),
  );
  await phone.evaluate(() => window.scrollTo(0, 1400));
  await phone.getByRole('button', { name: 'Check times' }).click();
  const sheet = phone.getByRole('dialog', { name: 'Book a time' });
  await sheet.getByRole('group', { name: 'Start time' }).getByRole('button').nth(14).click();
  await sheet.locator('[data-quote-total]').waitFor();
  await phone.screenshot({ path: OUT + '/sheet-390.png' });
  await axe(phone, 'sheet 390');
  check(
    'phone no overflow',
    (await phone.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0,
  );
  await sheet.getByRole('button', { name: 'Close' }).click();
  check(
    'bar shows total after quote',
    /booking total/.test(await phone.locator('[data-booking-bar]').innerText()),
  );

  // Owner: drag on the timeline pre-fills the block form.
  const owner = await open(1440, tokens.owner);
  await owner.goto(web + '/partner/listings/' + venue.id + '/calendar?date=' + date, {
    waitUntil: 'networkidle',
  });
  const lane = owner.locator('li', { hasText: 'Court 1' }).locator('div.cursor-crosshair');
  const box = await lane.boundingBox();
  const at = (minute) => box.x + ((minute - 360) / (1500 - 360)) * box.width + 2;
  await owner.mouse.move(at(600), box.y + 10);
  await owner.mouse.down();
  await owner.mouse.move(at(660), box.y + 10, { steps: 5 });
  await owner.mouse.up();
  const form = owner.locator('#block-form');
  const values = await form.evaluate((f) =>
    ['resourceId', 'from', 'startTime', 'to', 'endTime'].map((n) => f.elements.namedItem(n).value),
  );
  check(
    'drag 10:00–11:30 fills block form',
    values[1] === date && values[2] === '10:00' && values[4] === '11:30' && values[0].length > 30,
    JSON.stringify(values),
  );
  await owner.screenshot({ path: OUT + '/owner-drag-1440.png' });

  // 30 courts × 20 hours: no overflow, every lane laid out.
  await sql`INSERT INTO rentable_resource(rentable_id,name,capacity,sort_order) SELECT ${venue.id}, 'Court ' || g, 8, g FROM generate_series(10, 36) g`;
  const big = {
    weeklyHours: Object.fromEntries(
      ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((k) => [
        k,
        [{ open: '05:00', close: '01:00', closesNextDay: true }],
      ]),
    ),
  };
  await sql`UPDATE rentable SET booking_config = booking_config || ${sql.json(big)} WHERE id=${venue.id}`;
  await owner.goto(web + '/partner/listings/' + venue.id + '/calendar?date=' + date, {
    waitUntil: 'networkidle',
  });
  const lanes = owner.locator('div.cursor-crosshair');
  check('30 lanes rendered', (await lanes.count()) === 30, String(await lanes.count()));
  check(
    'page has no horizontal overflow at 30×20',
    (await owner.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0,
  );
  const heights = await lanes.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height),
  );
  check(
    'lanes keep their height',
    heights.every((h) => h === 64),
    heights.slice(0, 3).join(','),
  );
  await owner.screenshot({ path: OUT + '/owner-30x20-1440.png', fullPage: true });
  await axe(owner, 'owner timeline 1440 (main)', 'main');
} finally {
  console.log('problems', problems);
  console.log(results.filter(Boolean).length + '/' + results.length + ' passed');
  await browser.close();
  await sql.end();
}
