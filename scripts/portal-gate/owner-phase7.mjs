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
// Calendar-finish fixtures are seeded straight into the disposable fixture database (local only).
const backend = new URL('../../../rentra-backend/', import.meta.url);
const { default: postgres } = await import(
  new URL('node_modules/postgres/src/index.js', backend).href
);
assert.match(new URL(f.databaseUrl).hostname, /^(127\.0\.0\.1|localhost)$/, 'local fixture only');
const sql = postgres(f.databaseUrl, { max: 1, onnotice: () => {} });
const ist = (offset) =>
  new Date(Date.now() + 330 * 60000 + offset * 86400000).toISOString().slice(0, 10);
const today = ist(0);
const L = f.ids.listing;
// Day, Night and Full day offered; open dates for six weeks; one past-month-end night stay.
const [{ booking_config: config }] = await sql`SELECT booking_config FROM rentable WHERE id=${L}`;
const lane = (startTime, endTime, endDayOffset) => ({
  ...config.slots.day,
  startTime,
  endTime,
  endDayOffset,
});
await sql`UPDATE rentable SET booking_config=${JSON.stringify({ ...config, slots: { day: config.slots.day, night: lane('19:00', '10:00', 1), full_day: lane('09:00', '10:00', 1) } })}::text::jsonb WHERE id=${L}`;
await sql`INSERT INTO rentable_price(rentable_id,slot,weekday_minor,weekend_minor) VALUES (${L},'night',120000,150000),(${L},'full_day',200000,250000)`;
await sql`INSERT INTO availability(rentable_id,day,slot,units_available)
  SELECT ${L},d::date,s::availability_slot,1 FROM generate_series(${today}::date-3,${today}::date+45,interval '1 day') d
  CROSS JOIN unnest(ARRAY['day','night']) s ON CONFLICT DO NOTHING`;
await sql`UPDATE availability SET units_available=0 WHERE rentable_id=${L} AND day=${ist(9)}`;
await sql`INSERT INTO booking_price_override(rentable_id,day,slot,rent_minor) VALUES (${L},${ist(11)},'day',180000)`;
await sql`INSERT INTO inventory_reservation(rentable_id,source,blocked_start_at,blocked_end_at,state,created_by,reason)
  VALUES (${L},'owner_block',${ist(8) + 'T08:00:00+05:30'},${ist(8) + 'T20:00:00+05:30'},'committed',${f.ids.owner},'Painting walls')`;
// The fixture visit gets real hours and inventory, so the calendar shows it as booked.
await sql`UPDATE booking_order SET listing_snapshot=listing_snapshot||'{"contact":{"name":"Riya Patel","phone":"9876543210"}}'::jsonb WHERE id=${f.booking.order}`;
const [visit] =
  await sql`UPDATE booking SET hours_known=true,local_day=${ist(5)},starts_at=${ist(5) + 'T09:00:00+05:30'},ends_at=${ist(5) + 'T18:00:00+05:30'},
  blocked_start_at=${ist(5) + 'T09:00:00+05:30'},blocked_end_at=${ist(5) + 'T18:00:00+05:30'} WHERE order_id=${f.booking.order} RETURNING id`;
await sql`INSERT INTO inventory_reservation(rentable_id,booking_id,source,state,blocked_start_at,blocked_end_at)
  SELECT rentable_id,id,'booking','committed',blocked_start_at,blocked_end_at FROM booking WHERE id=${visit.id}`;
const monthEnd = (() => {
  const d = new Date(ist(20) + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
})();
const nextDay = new Date(Date.parse(monthEnd) + 86400000).toISOString().slice(0, 10);
const [night] =
  await sql`INSERT INTO booking(reference,rentable_id,customer_id,order_id,item_position,local_day,slot,state,starts_at,ends_at,hours_known,blocked_start_at,blocked_end_at,currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,units_booked,guests)
  SELECT 'V-NIGHT',rentable_id,customer_id,order_id,2,${monthEnd},'night','confirmed',${monthEnd + 'T19:00:00+05:30'},${nextDay + 'T10:00:00+05:30'},true,${monthEnd + 'T19:00:00+05:30'},${nextDay + 'T10:00:00+05:30'},currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,1,6
  FROM booking WHERE id=${visit.id} RETURNING id`;
await sql`INSERT INTO inventory_reservation(rentable_id,booking_id,source,state,blocked_start_at,blocked_end_at)
  SELECT rentable_id,id,'booking','committed',blocked_start_at,blocked_end_at FROM booking WHERE id=${night.id}`;
/** A guest hold on the 12th day that expires while the owner watches. */
async function seedHold(seconds) {
  const [order] =
    await sql`INSERT INTO booking_order(reference,customer_id,rentable_id,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,amount_rent_minor,amount_fee_minor,amount_deposit_minor,idempotency_key,request_hash,state,hold_expires_at)
    SELECT 'ORD-HOLD',customer_id,rentable_id,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,amount_rent_minor,amount_fee_minor,amount_deposit_minor,gen_random_uuid(),request_hash,'held',now()+make_interval(secs=>${seconds})
    FROM booking_order WHERE id=${f.booking.order} RETURNING id,hold_expires_at`;
  const [held] =
    await sql`INSERT INTO booking(reference,rentable_id,customer_id,order_id,item_position,local_day,slot,state,starts_at,ends_at,hours_known,blocked_start_at,blocked_end_at,currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,units_booked,guests)
    SELECT 'V-HOLD',rentable_id,customer_id,${order.id},1,${ist(12)},'day','requested',${ist(12) + 'T09:00:00+05:30'},${ist(12) + 'T18:00:00+05:30'},true,${ist(12) + 'T09:00:00+05:30'},${ist(12) + 'T18:00:00+05:30'},currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,1,2
    FROM booking WHERE id=${visit.id} RETURNING id`;
  await sql`INSERT INTO inventory_reservation(rentable_id,booking_id,source,state,blocked_start_at,blocked_end_at,hold_expires_at)
    SELECT rentable_id,id,'booking','held',blocked_start_at,blocked_end_at,${order.hold_expires_at} FROM booking WHERE id=${held.id}`;
}
// A venue for the same owner: two courts, a court booking today and a court block.
const [category] =
  await sql`INSERT INTO category(slug,name,vertical_code,default_rental_unit) VALUES ('gate-cricket','Box cricket','entertainment','hour') RETURNING id`;
const hours = [{ open: '06:00', close: '23:30' }];
const venueConfig = {
  model: 'hourly',
  timeZone: 'Asia/Kolkata',
  leadTimeMinutes: 30,
  bookingHorizonDays: 60,
  stepMinutes: 60,
  minDurationMinutes: 60,
  maxDurationMinutes: 180,
  bufferBeforeMinutes: 0,
  bufferAfterMinutes: 0,
  weeklyHours: Object.fromEntries(
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, hours]),
  ),
  inventoryReady: true,
};
const [venue] =
  await sql`INSERT INTO rentable(client_id,slug,title,category_id,city_id,area_id,public_code,rental_unit,capacity,cancellation_tier,booking_config,status)
  SELECT client_id,'gate-arena','Gate Arena',${category.id},city_id,area_id,'gatevn01','hour',12,'moderate',${JSON.stringify(venueConfig)}::text::jsonb,'live' FROM rentable WHERE id=${L} RETURNING id`;
const courts = [];
for (const [name, order] of [
  ['Court 1', 1],
  ['Court 2', 2],
]) {
  const [court] =
    await sql`INSERT INTO rentable_resource(rentable_id,name,capacity,sort_order) VALUES (${venue.id},${name},12,${order}) RETURNING id`;
  courts.push(court.id);
}
const [venueOrder] =
  await sql`INSERT INTO booking_order(reference,customer_id,rentable_id,currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,amount_rent_minor,amount_fee_minor,amount_deposit_minor,idempotency_key,request_hash,state,confirmed_at)
  SELECT 'ORD-COURT',customer_id,${venue.id},currency,time_zone,pricing_version,policy_version,policy_snapshot,listing_snapshot,amount_rent_minor,amount_fee_minor,amount_deposit_minor,gen_random_uuid(),request_hash,'confirmed',now()
  FROM booking_order WHERE id=${f.booking.order} RETURNING id`;
const [court] =
  await sql`INSERT INTO booking(reference,rentable_id,resource_id,customer_id,order_id,item_position,local_day,slot,state,starts_at,ends_at,hours_known,blocked_start_at,blocked_end_at,currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,units_booked,guests)
  SELECT 'V-COURT',${venue.id},${courts[0]},customer_id,${venueOrder.id},1,${today},'hourly','confirmed',${today + 'T18:00:00+05:30'},${today + 'T21:00:00+05:30'},true,${today + 'T18:00:00+05:30'},${today + 'T21:00:00+05:30'},currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,1,8
  FROM booking WHERE id=${visit.id} RETURNING id`;
await sql`INSERT INTO inventory_reservation(rentable_id,resource_id,booking_id,source,state,blocked_start_at,blocked_end_at)
  SELECT rentable_id,resource_id,id,'booking','committed',blocked_start_at,blocked_end_at FROM booking WHERE id=${court.id}`;
await sql`INSERT INTO inventory_reservation(rentable_id,resource_id,source,blocked_start_at,blocked_end_at,state,created_by,reason)
  VALUES (${venue.id},${courts[1]},'owner_block',${today + 'T07:00:00+05:30'},${today + 'T09:00:00+05:30'},'committed',${f.ids.owner},'Net repair')`;
const results = {};
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
  await page
    .locator('article', { hasText: 'Review River Farm' })
    .locator(`[data-calendar-day="${future}"]`)
    .click();
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
  // CAL-01 sticky property/photo column in the multi-property view.
  await page.goto(origin + '/partner/calendar?view=multi', { waitUntil: 'networkidle' });
  const stickyHeading = page.locator('.sticky h2', { hasText: 'Review River Farm' });
  await stickyHeading.waitFor();
  results.stickyPropertyColumn =
    (await stickyHeading.evaluate((h) => getComputedStyle(h.parentElement).position)) === 'sticky';
  assert.equal(results.stickyPropertyColumn, true);
  // CAL-01 mixed states in greyscale: every state keeps its own icon and words.
  const listingCal = `${origin}/partner/listings/${L}/calendar`;
  await page.goto(`${listingCal}?view=month&from=${today}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html{filter:grayscale(1)}' });
  const lanes = await page.locator('[data-state]').evaluateAll((all) =>
    all.map((el) => ({
      state: el.dataset.state,
      icon: el
        .querySelector('svg')
        ?.getAttribute('class')
        ?.match(/lucide-[a-z-]+/g)
        ?.at(-1),
      words: el.textContent
        .replace(/^(Day|Night) · /, '')
        .replace(/[0-9₹,.:]+/g, '#')
        .trim(),
    })),
  );
  const signature = {};
  for (const { state, icon, words } of lanes)
    (signature[state] ||= new Set()).add(`${icon}|${words}`);
  results.greyscaleStates = Object.keys(signature).sort();
  for (const state of ['booked', 'blocked', 'closed', 'open', 'past'])
    assert.ok(signature[state], `missing ${state} in ${results.greyscaleStates}`);
  for (const [a, sa] of Object.entries(signature))
    for (const [b, sb] of Object.entries(signature))
      if (a !== b) assert.ok(![...sa].some((x) => sb.has(x)), `${a} and ${b} look alike`);
  assert.ok(
    lanes.every((l) => l.icon),
    'every lane has an icon',
  );
  await mkdir(new URL('../../docs/evidence/owner-phase7/', import.meta.url), { recursive: true });
  await page.screenshot({
    path: new URL('../../docs/evidence/owner-phase7/calendar-greyscale.png', import.meta.url)
      .pathname,
    fullPage: true,
  });
  // CAL-01 arrival marker, and a night stay across the month boundary as two bars.
  await page.goto(`${listingCal}?view=month&from=${monthEnd}`, { waitUntil: 'networkidle' });
  const endCell = page.locator(`[data-calendar-day="${monthEnd}"] [data-state="booked"]`);
  assert.equal(await endCell.getAttribute('data-continues'), 'true');
  assert.match(await endCell.textContent(), /In 7:00 pm/i);
  await page.goto(`${listingCal}?view=month&from=${nextDay}`, { waitUntil: 'networkidle' });
  assert.match(
    await page.locator(`[data-calendar-day="${nextDay}"] [data-leaving]`).textContent(),
    /Out 10:00 am/i,
  );
  results.crossMonthNightBars = true;
  // CAL-01 hold countdown reaches zero and the calendar refreshes without the hold.
  await seedHold(20);
  await page.goto(`${listingCal}?view=week&from=${ist(12)}`, { waitUntil: 'networkidle' });
  const holdLane = page.locator(`[data-calendar-day="${ist(12)}"] [data-state="hold"]`).first();
  assert.match(await holdLane.textContent(), /Hold [01]m/);
  await page
    .locator(`[data-calendar-day="${ist(12)}"] [data-state="hold"]`)
    .first()
    .waitFor({ state: 'detached', timeout: 45000 });
  results.holdCountdownExpires = true;
  // CAL-03 exact block prefilled from the slot; CAL-04 multi-lane price with one-click Full day.
  const priced = ist(14);
  await page.goto(`${listingCal}?view=week&from=${priced}`, { waitUntil: 'networkidle' });
  await page.locator(`[data-calendar-day="${priced}"]`).click();
  await page.getByRole('checkbox', { name: 'Night stay' }).check();
  await page.getByText('Block an exact period').click();
  assert.equal(await page.locator('dialog input[name="startTime"]').inputValue(), '09:00');
  results.blockPrefill = true;
  await page.getByRole('button', { name: 'Set price', exact: true }).click();
  await page.getByLabel('Price (₹)').fill('2000');
  await page.getByRole('button', { name: 'Preview price', exact: true }).click();
  await page.getByRole('button', { name: 'Update Full day to Day + Night' }).click();
  await page.getByText(`${priced} · Full day`).waitFor();
  await page.getByRole('button', { name: 'Confirm changes', exact: true }).click();
  await page.getByRole('button', { name: 'Undo (10 seconds)', exact: true }).waitFor();
  const [full] =
    await sql`SELECT rent_minor FROM booking_price_override WHERE rentable_id=${L} AND day=${priced} AND slot='full_day'`;
  assert.equal(Number(full.rent_minor), 400000);
  results.multiLaneFullDayAlignment = true;
  await page.getByRole('button', { name: 'Close date detail' }).click();
  // CAL-03 guarded Undo of a block release; CAL-02 one-click auto-open offer.
  await page.goto(`${origin}/partner/listings/${L}/booking-rules`, { waitUntil: 'networkidle' });
  const blockForm = page.locator('form', { hasText: 'Painting walls' });
  await blockForm.getByRole('button', { name: 'Preview changes' }).click();
  await blockForm.getByRole('button', { name: 'Confirm: Release block' }).click();
  await page.getByRole('button', { name: 'Undo (10 seconds)' }).click();
  await page.getByText('Undone. The block is back.').waitFor();
  const [painted] =
    await sql`SELECT state FROM inventory_reservation WHERE reason='Painting walls'`;
  assert.equal(painted.state, 'committed');
  results.blockReleaseUndo = true;
  await page.getByRole('button', { name: 'Turn on', exact: true }).click();
  await page.getByRole('button', { name: 'Turn on', exact: true }).waitFor({ state: 'detached' });
  const [{ auto }] =
    await sql`SELECT booking_config->>'autoOpen' AS auto FROM rentable WHERE id=${L}`;
  assert.equal(auto, 'true');
  results.autoOpenOptIn = true;
  // CAL-05 venue day grid: now line, whole-venue lane, court/week occupancy, axe.
  await page.goto(`${origin}/partner/listings/${venue.id}/calendar?date=${today}`, {
    waitUntil: 'networkidle',
  });
  await page.getByRole('heading', { name: 'Occupancy this week' }).waitFor();
  const istMinute = Math.floor((((Date.now() / 60000 + 330) % 1440) + 1440) % 1440);
  results.venueNowLine = await page.locator('[data-now-line]').first().isVisible();
  if (istMinute >= 360 && istMinute <= 1410) assert.equal(results.venueNowLine, true);
  results.venueOccupancy = await page.locator('[data-week-occupancy]').allTextContents();
  assert.match(results.venueOccupancy[0], /^\d+%$/);
  assert.notEqual(results.venueOccupancy[0], '0%');
  assert.ok(await page.getByText('Whole venue').first().isVisible());
  const venueAudit = await auditPage(page);
  assert.equal(
    venueAudit.violations.length,
    0,
    JSON.stringify(
      venueAudit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ),
  );
  results.venueAxe = 0;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: 'networkidle' });
  const columns = page.locator('[data-court-column]');
  assert.ok((await columns.count()) >= 3);
  results.venueSwipeColumns = await page
    .getByRole('region', { name: 'Courts, swipe for more' })
    .evaluate(
      (el) => el.scrollWidth > el.clientWidth && getComputedStyle(el).scrollSnapType.includes('x'),
    );
  assert.equal(results.venueSwipeColumns, true);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.goto(`${listingCal}?view=month&from=${today}`, { waitUntil: 'networkidle' });
  results.phoneMiniMonth = await page.locator(`[data-mini-day="${ist(5)}"]`).isVisible();
  assert.equal(results.phoneMiniMonth, true);
  assert.match(
    await page.locator(`[data-mini-day="${ist(5)}"]`).getAttribute('aria-label'),
    /booked/,
  );
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
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
        ...results,
        errors,
      },
      null,
      2,
    ),
  );
  console.log('Phase 7 browser gates passed');
} finally {
  await browser.close();
  await sql.end();
}
