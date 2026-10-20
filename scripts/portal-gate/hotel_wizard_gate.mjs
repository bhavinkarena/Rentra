// Hotel owner wizard gate (hotel plan, Phase 3). Disposable stack only:
//   DB  127.0.0.1:55432/rentra_cp02 (fixture-migrate.mjs, `db:seed`, `seed-amenities`, `seed:hotels`)
//   API :4106 (rentra-backend `.qa-serve.mjs`), web :3106 (RENTRA_BROWSER_FIXTURE=1 next dev)
//   GATE_TOKENS from hotel-mint.mjs; GATE_OUT for screenshots; POSTGRES_MODULE / PLAYWRIGHT_MODULE / CHROME paths.
// An owner creates a 30-room hotel through the wizard (3 room types, 4 rates, check-in, rules, GST),
// reopens it on a second device and submits it. axe (WCAG 2.1 AA) at 1440, overflow at 390, on every step.
// Photos, the ownership file and the map pin are written directly: Cloudinary and PostGIS are absent here.
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
const out = process.env.GATE_OUT || 'hotel-gate-out';
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
const started = Date.now();

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rentra_session', value: tokens.owner, url: web }]);
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => {
  if (
    m.type() === 'error' &&
    !/Download the React DevTools|favicon/.test(m.text()) &&
    !/favicon\.ico$/.test(m.location().url ?? '')
  )
    errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));

async function audit(name) {
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
const go = (path) => page.goto(`${web}${path}`, { waitUntil: 'networkidle' });
const next = async () => {
  await page
    .getByRole('button', { name: /Save and continue|^Continue$|Check and send/ })
    .first()
    .click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
};

try {
  // 0. Start: choose Hotel or resort.
  await go('/partner/listings/new');
  await page.getByLabel('Hotel or resort').check();
  await page.locator('select[name="categoryId"]').selectOption({ label: 'Hotel' });
  await audit('00-start');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/\/setup\/location/, { timeout: 30000 });
  await page.waitForLoadState('networkidle');
  const id = page.url().match(/listings\/([0-9a-f-]{36})/)[1];
  check('draft hotel created', true, id);
  const [row] =
    await sql`SELECT rental_unit::text AS unit, c.vertical_code FROM rentable r JOIN category c ON c.id=r.category_id WHERE r.id=${id}`;
  check(
    'draft is a night-booked hotel listing',
    row.unit === 'night' && row.vertical_code === 'hotel',
  );
  check(
    'rail says "Your hotel"',
    await page
      .getByText('Your hotel', { exact: true })
      .filter({ visible: true })
      .first()
      .waitFor({ timeout: 30000 })
      .then(
        () => true,
        () => false,
      ),
  );

  // Location: the fixture DB has no PostGIS, so the pin is written directly (as in the venue gate).
  const [area] =
    await sql`SELECT a.id, a.city_id FROM area a JOIN city c ON c.id=a.city_id WHERE c.slug='surat' ORDER BY a.name LIMIT 1`;
  const pin = Buffer.alloc(25);
  pin.writeUInt8(1, 0);
  pin.writeUInt32LE(0x20000001, 1);
  pin.writeUInt32LE(4326, 5);
  pin.writeDoubleLE(72.79, 9);
  pin.writeDoubleLE(21.19, 17);
  await sql`DROP TRIGGER IF EXISTS fixture_rentable_geo ON rentable`;
  await sql`UPDATE rentable SET city_id=${area.city_id}, area_id=${area.id}, exact_address='12 Riverfront Road, Adajan, Surat', location=${pin.toString('hex')} WHERE id=${id}`;

  // Rooms: three types, 12 + 14 + 4 = 30 rooms.
  await go(`/partner/listings/${id}/setup/space`);
  check(
    'rooms step heading',
    await page.getByRole('heading', { name: 'Rooms' }).first().isVisible(),
  );
  const name0 = page.locator('input[id$="-name"]').first();
  await name0.fill('Deluxe Double');
  await page.locator('input[id$="-roomCount"]').first().fill('12');
  await page.getByRole('button', { name: /Add a room type/ }).click();
  await page.locator('input[id$="-name"]').nth(1).fill('Standard Twin');
  await page.locator('input[id$="-roomCount"]').nth(1).fill('14');
  await page.getByRole('button', { name: /Add a room type/ }).click();
  await page.locator('input[id$="-name"]').nth(2).fill('Family Suite');
  await page.locator('input[id$="-roomCount"]').nth(2).fill('4');
  await page.locator('input[id$="-maxAdults"]').nth(2).fill('4');
  await page.locator('input[id$="-maxOccupancy"]').nth(2).fill('5');
  await page.locator('input[id$="-extraAdult"]').first().fill('700');
  check(
    'room total updates live',
    await page.getByText('3 room types · 30 rooms in total').isVisible(),
  );
  await audit('01-rooms');
  await next();
  const rooms =
    await sql`SELECT name, room_count FROM room_type WHERE rentable_id=${id} ORDER BY sort_order`;
  check(
    '3 room types saved, 30 rooms',
    rooms.length === 3 && rooms.reduce((s, r) => s + r.room_count, 0) === 30,
    rooms.map((r) => `${r.name}:${r.room_count}`).join(' '),
  );
  check('moved on to amenities', page.url().endsWith('/setup/amenities'), page.url());
  {
    const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await other.addCookies([{ name: 'rentra_session', value: tokens.owner, url: web }]);
    const phone = await other.newPage();
    await phone.goto(`${web}/partner/listings/${id}/setup/space`, { waitUntil: 'networkidle' });
    const names = await phone
      .locator('input[id$="-name"]')
      .evaluateAll((els) => els.map((e) => e.value));
    check(
      'saved rooms reappear on another device',
      names.join('|') === 'Deluxe Double|Standard Twin|Family Suite',
      names.join('|'),
    );
    await other.close();
  }

  // Amenities: three hotel amenities.
  const boxes = page.locator('input[type="checkbox"]');
  for (let i = 0; i < 3; i += 1) await boxes.nth(i).check({ force: true });
  await audit('02-amenities');
  await next();

  // Photos: Cloudinary is not configured on the fixture API, so 8 photos are written directly.
  const photos = Array.from({ length: 8 }, (_, i) => ({
    url: `/seed/lawn-1557296440.jpg?v=${i}`,
    alt: `Photo ${i + 1}`,
    tag: i ? 'Room: Deluxe Double' : 'Exterior',
  }));
  await sql`UPDATE rentable SET photos=${JSON.stringify(photos)}::text::jsonb WHERE id=${id}`;
  await go(`/partner/listings/${id}/setup/photos`);
  check(
    'photo step asks for 8 minimum and allows 40',
    await page.getByText('8 of 8 minimum · 8 of 40 maximum').isVisible(),
  );
  check(
    'room types appear as photo prompts',
    (await page.locator('select option', { hasText: 'Room: Family Suite' }).count()) === 1,
  );
  await audit('03-photos');
  await next();

  // Story.
  await page.locator('input[name="title"]').fill('Riverside Residency, Adajan');
  await page
    .locator('textarea[name="description"]')
    .fill(
      'A 30-room hotel on the Adajan riverfront, ten minutes from the Diamond Bourse road. Renovated in 2024.',
    );
  await next();

  // Rates: base prices for each room type, plus a breakfast plan for Deluxe.
  check('rates step reached', page.url().endsWith('/setup/pricing'), page.url());
  const prices = [
    ['2600', '3000'],
    ['2000', '2300'],
    ['4200', '4800'],
  ];
  for (const [i, [weekday, weekend]] of prices.entries()) {
    await page.locator('input[id$="-weekday"]').nth(i).fill(weekday);
    await page.locator('input[id$="-weekend"]').nth(i).fill(weekend);
  }
  await page.getByRole('button', { name: '+ Breakfast plan' }).first().click();
  check(
    'GST preview shows the guest price',
    await page.getByText('Guests pay ₹2,730 on a weekday incl. GST (5%)').isVisible(),
  );
  await audit('04-rates');
  await next();
  const plans =
    await sql`SELECT p.name, t.name AS room, p.derived_from IS NOT NULL AS derived FROM rate_plan p JOIN room_type t ON t.id=p.room_type_id WHERE p.rentable_id=${id} AND p.is_active ORDER BY t.sort_order, p.sort_order`;
  check(
    '4 rates saved, breakfast follows Deluxe room only',
    plans.length === 4 && plans.some((p) => p.room === 'Deluxe Double' && p.derived),
    plans.map((p) => `${p.room}/${p.name}`).join(' | '),
  );

  // Check-in and check-out: defaults are fine; saving records the answer.
  check('check-in step reached', page.url().endsWith('/setup/availability'), page.url());
  await audit('05-checkin');
  await next();

  // House rules.
  await page.getByText('Yes', { exact: true }).first().click();
  await page.getByText('Yes', { exact: true }).nth(1).click();
  const highlighted = await page
    .getByText('Yes', { exact: true })
    .first()
    .evaluate((el) => getComputedStyle(el.closest('label') ?? el).backgroundColor);
  check(
    'chosen answer is highlighted',
    !/rgba\(0, 0, 0, 0\)|transparent/.test(highlighted),
    highlighted,
  );
  await audit('06-rules');
  await next();
  const [profile] =
    await sql`SELECT policies, check_in_minute FROM hotel_profile WHERE rentable_id=${id}`;
  check(
    'rules and times saved',
    profile?.policies.couples === true &&
      profile.policies.localId === true &&
      profile.policies.stayAnswered === true &&
      profile.check_in_minute === 720,
    JSON.stringify(profile?.policies),
  );

  // Proof and GST: the document is written directly (no Cloudinary); GST answered in the UI.
  await sql`INSERT INTO document(owner_type,owner_id,doc_type,storage_key,status) VALUES ('rentable',${id},'rent_agreement','fixture/hotel-lease','uploaded')`;
  await go(`/partner/listings/${id}/setup/ownership`);
  check(
    'hotel document types offered',
    (await page
      .locator('option', { hasText: 'Shop & Establishment (Gumasta) registration' })
      .count()) >= 1 || (await page.getByText('Rent or lease agreement').count()) >= 1,
  );
  await page.getByText('No', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Save GST' }).click();
  await page.getByText('Saved', { exact: true }).waitFor({ timeout: 15000 });
  await audit('07-proof-gst');
  await go(`/partner/listings/${id}/setup/preview`);
  check(
    'preview says ready to send',
    await page.getByRole('heading', { name: 'Ready to send' }).isVisible(),
  );
  await audit('08-preview');
  await page
    .getByRole('button', { name: /Submit for review/ })
    .first()
    .click();
  await page.waitForTimeout(3000);
  const [status] = await sql`SELECT status FROM rentable WHERE id=${id}`;
  check('submitted for review', status.status === 'pending_review', status.status);

  // Manage page renders the hotel sections and no farmhouse ones.
  await go(`/partner/listings/${id}`);
  check(
    'manage page shows Rooms, Rates, Check-in, House rules, GST',
    (
      await Promise.all(
        ['Rooms', 'Rates', 'Check-in and check-out', 'House rules', 'GST'].map((t) =>
          page.getByRole('heading', { name: t, exact: true }).first().isVisible(),
        ),
      )
    ).every(Boolean),
  );
  check(
    'manage page hides farmhouse deposit/cancellation section',
    (await page.getByRole('heading', { name: /Deposit and cancellation/ }).count()) === 0,
  );
  await audit('09-manage');
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(
    `\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass · ${Math.round((Date.now() - started) / 1000)} s`,
  );
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
  await sql.end();
}
