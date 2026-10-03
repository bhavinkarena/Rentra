// Phase 7 bookings gate: BOOK-01 list tables and detail modals, BOOK-05/08 no-show prefill, BOOK-08 arrival guide
// and BOOK-06 caretaker contact toggle. Seeds the disposable fixture database directly
// (serve-property-review.mjs with FIXTURE_STAGE=published); refuses any nonlocal database.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { auditPage } from './browser-audit.mjs';
const { chromium } = await import(
  pathToFileURL(
    process.env.PLAYWRIGHT_MODULE ||
      join(
        process.env.APPDATA ?? '',
        'npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs',
      ),
  ).href
);
const backend = new URL('../../../rentra-backend/', import.meta.url);
const { default: postgres } = await import(
  new URL('node_modules/postgres/src/index.js', backend).href
);
const f = JSON.parse(await readFile(process.env.CP06_GATE_FIXTURE, 'utf8'));
assert.match(new URL(f.databaseUrl).hostname, /^(127\.0\.0\.1|localhost)$/, 'local fixture only');
const origin = process.env.GATE_WEB_ORIGIN || 'http://localhost:3117';
const sql = postgres(f.databaseUrl, { max: 1, onnotice: () => {} });

// An overdue arrival today (never checked in) plus a second visit later: a multi-visit order.
const order = f.booking.order;
await sql`UPDATE booking_order SET listing_snapshot=listing_snapshot||'{"contact":{"name":"Riya Patel","phone":"9876543210"}}'::jsonb WHERE id=${order}`;
await sql`UPDATE booking SET hours_known=true,starts_at=now()-interval '1 hour',ends_at=now()+interval '3 hours',
  blocked_start_at=now()-interval '1 hour',blocked_end_at=now()+interval '3 hours',local_day=(now() AT TIME ZONE 'Asia/Kolkata')::date WHERE order_id=${order}`;
await sql`INSERT INTO booking(reference,rentable_id,customer_id,order_id,item_position,local_day,slot,state,starts_at,ends_at,hours_known,blocked_start_at,blocked_end_at,currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,units_booked,guests)
  SELECT 'V-GATE-2',rentable_id,customer_id,order_id,2,local_day+3,'day','confirmed',starts_at+interval '3 days',ends_at+interval '3 days',true,starts_at+interval '3 days',ends_at+interval '3 days',currency,time_zone,amount_rent_minor,amount_fee_minor,amount_deposit_minor,1,4
  FROM booking WHERE order_id=${order} AND item_position=1`;
const [staff] =
  await sql`INSERT INTO client_staff(client_id,phone,name,permissions,accepted_at) VALUES(${f.ids.owner},'9811111111','Gate Caretaker','{"evidence":true,"guestContact":true}',now()) RETURNING id`;
await sql`INSERT INTO staff_property(staff_id,rentable_id) VALUES(${staff.id},${f.ids.listing})`;
const [session] =
  await sql`INSERT INTO auth_session(staff_id,expires_at) VALUES(${staff.id},now()+interval '1 hour') RETURNING id`;
const staffToken = await new SignJWT({ staffId: staff.id, sessionId: session.id })
  .setProtectedHeader({ alg: 'HS256' })
  .setAudience('rentra:staff')
  .setIssuedAt()
  .setExpirationTime('1h')
  .sign(new TextEncoder().encode('cp06-local-fixture-signing-secret-not-for-deployment'));

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME_PATH ||
    join(process.env.ProgramFiles ?? '', 'Google/Chrome/Application/chrome.exe'),
  headless: true,
});
const axe = (audit) =>
  assert.equal(
    audit.violations.length,
    0,
    JSON.stringify(
      audit.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
    ),
  );
const results = {};
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([
    { name: 'rentra_session', value: f.tokens.owner, url: origin },
    { name: 'rentra_staff', value: staffToken, url: origin },
  ]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // BOOK-01: compact booking row, with all visits and contact in its detail modal.
  await page.goto(`${origin}/partner/bookings?tab=upcoming`, { waitUntil: 'networkidle' });
  const row = page
    .getByRole('region', { name: 'Bookings', exact: true })
    .locator('tbody tr', { hasText: 'Riya' })
    .first();
  await row.getByRole('link', { name: /View booking/ }).click();
  const modal = page.getByRole('dialog', { name: 'Booking details', exact: true });
  await modal.waitFor();
  await modal.getByRole('button', { name: 'Record check-in', exact: true }).first().waitFor();
  assert.equal(
    await modal.getByRole('link', { name: 'Call guest', exact: true }).getAttribute('href'),
    'tel:9876543210',
  );
  assert.equal(
    await modal.getByRole('link', { name: 'WhatsApp', exact: true }).getAttribute('href'),
    'https://wa.me/919876543210',
  );
  const visits = modal.locator('section', {
    has: modal.getByRole('heading', { name: 'Visits', exact: true }),
  });
  assert.equal(await visits.locator('ul > li').count(), 2);
  axe(await auditPage(page));
  results.listTable = { guest: true, action: true, contact: true, modalVisits: 2, axe: 0 };

  // BOOK-05/08: the overdue arrival offers a pre-filled no-show request.
  await page.goto(`${origin}/partner/bookings/${order}`, { waitUntil: 'networkidle' });
  const noShow = page.locator('details', {
    has: page.locator('summary', { hasText: 'Guest didn’t arrive' }),
  });
  await noShow.locator('summary').click();
  assert.equal(await noShow.locator('select[name="type"]').inputValue(), 'no_show');
  assert.equal(await noShow.locator('input[name="visitId"]').isChecked(), true);
  assert.match(await noShow.locator('textarea[name="reason"]').inputValue(), /did not arrive/);
  await noShow.getByRole('button', { name: 'Send request to Rentra' }).click();
  let cases = [];
  for (let i = 0; i < 20 && !cases.length; i++) {
    cases = await sql`SELECT type FROM booking_case WHERE order_id=${order} AND type='no_show'`;
    if (!cases.length) await new Promise((r) => setTimeout(r, 500));
  }
  assert.equal(cases.length, 1, 'no_show case opened');
  results.noShowPrefill = {
    type: 'no_show',
    visitChecked: true,
    reasonPrefilled: true,
    caseOpened: true,
  };

  // BOOK-08: owner edits the arrival guide.
  await page.goto(`${origin}/partner/listings/${f.ids.listing}/arrival-guide`, {
    waitUntil: 'networkidle',
  });
  await page.getByLabel('Landmark').fill('Blue gate after the temple');
  await page.getByLabel('Parking').fill('Inside, 4 cars');
  await page.getByLabel('Include my caretaker’s name and phone').check();
  await page.getByRole('button', { name: 'Save arrival guide' }).click();
  await page.getByRole('status').filter({ hasText: 'Arrival guide saved.' }).waitFor();
  const [{ arrival_guide: guide }] =
    await sql`SELECT arrival_guide FROM rentable WHERE id=${f.ids.listing}`;
  assert.equal(guide.landmark, 'Blue gate after the temple');
  assert.equal(guide.caretakerVisible, true);
  axe(await auditPage(page));
  results.arrivalGuideEdit = { saved: true, axe: 0 };

  // BOOK-06: caretaker list shows guest contact on the visit day, and hides it when turned off.
  await page.goto(`${origin}/staff`, { waitUntil: 'networkidle' });
  await page.getByText('Guest:').first().waitFor();
  assert.equal(
    await page.getByRole('link', { name: 'Call Riya' }).first().getAttribute('href'),
    'tel:+919876543210',
  );
  assert.equal(
    await page.getByRole('link', { name: 'WhatsApp Riya' }).first().getAttribute('href'),
    'https://wa.me/919876543210',
  );
  axe(await auditPage(page));
  await sql`UPDATE client_staff SET permissions='{"evidence":true,"guestContact":false}' WHERE id=${staff.id}`;
  await page.goto(`${origin}/staff`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { level: 1 }).waitFor();
  assert.equal(await page.getByText('Guest:').count(), 0);
  assert.equal(await page.locator('a[href^="tel:+91987"]').count(), 0);
  await page.goto(`${origin}/staff/visits/${order}`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('a[href*="9876543210"]').count(), 0);
  results.caretakerContactToggle = {
    shownWhenOn: true,
    hiddenWhenOff: true,
    detailHiddenWhenOff: true,
  };

  // Phone width: no sideways scroll on the list.
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(`${origin}/partner/bookings?tab=upcoming`, { waitUntil: 'networkidle' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  results.mobileNoOverflow360 = true;
  assert.equal(errors.length, 0, errors.join('\n'));
  results.errors = errors;
  await mkdir(new URL('../../docs/evidence/owner-phase7/', import.meta.url), { recursive: true });
  await writeFile(
    new URL('../../docs/evidence/owner-phase7/bookings-checks.json', import.meta.url),
    JSON.stringify(results, null, 2) + '\n',
  );
  console.log('Phase 7 bookings browser gates passed');
} finally {
  await browser.close();
  await sql.end();
}
