// CP32 venue owner journey (entertainment plan, Phase 5). Disposable stack only:
//   DB  127.0.0.1:55432/rentra_cp02 (migrated, `db:seed`, `seed-amenities`, `seed:entertainment`)
//   API :4106 (rentra-backend `.qa-serve.mjs`), web :3106 (RENTRA_BROWSER_FIXTURE=1 next dev)
//   GATE_TOKENS from venue-mint.mjs; POSTGRES_MODULE / PLAYWRIGHT_MODULE / CHROME paths.
// Owner lists a 3-court box-cricket venue through the wizard, submits it; admin reviews,
// verifies with the venue checklist and publishes; the vertical goes public and the venue
// is found in entertainment search. axe (WCAG 2.1 AA) at 1440 and 390 on every new screen.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const postgres = require(
  process.env.POSTGRES_MODULE || '../../../rentra-backend/node_modules/postgres',
);
const DB = process.env.GATE_DATABASE_URL ?? '';
if (!/127\.0\.0\.1:55432\/rentra_cp02$/.test(DB))
  throw new Error('refusing non-disposable database');
const sql = postgres(DB, { max: 1, onnotice: () => {} });
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = process.env.GATE_WEB || 'http://localhost:3106';
const api = process.env.GATE_API || 'http://localhost:4106/api/v1';
const out = process.env.GATE_OUT || null;
if (out) await mkdir(out, { recursive: true });
const axe = await readFile(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ check: name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass || !detail ? '' : ` — ${detail}`}`);
};

/** axe + horizontal overflow at desktop and phone width, with a screenshot of each. */
async function audit(page, name) {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(150);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return r.violations.map((v) => `${v.id}(${v.nodes.length})`);
    });
    check(`${name} @${width} axe 0`, violations.length === 0, violations.join(' '));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check(`${name} @${width} no horizontal overflow`, overflow <= 0, `${overflow}px`);
    if (out)
      await page.screenshot({
        path: `${out}/${name}-${width}.png`,
        fullPage: true,
        caret: 'initial',
      });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

const saveAndContinue = async (page, next) => {
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.waitForURL(new RegExp(`/setup/${next}`), { timeout: 30000 });
};

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || undefined,
});
let completed = false;
let page, desk;
const consoleErrors = [];
const watch = (p, who) =>
  p.on(
    'console',
    (m) =>
      m.type() === 'error' &&
      consoleErrors.push(
        `${who} ${p.url()}: ${m.text().slice(0, process.env.GATE_FULL_ERRORS ? 6000 : 160)}`,
      ),
  );
/** SRID=4326;POINT(lng lat) as hex EWKB, the value PostGIS would store. */
const ewkb = (lng, lat) => {
  const b = Buffer.alloc(25);
  b.writeUInt8(1, 0);
  b.writeUInt32LE(0x20000001, 1);
  b.writeUInt32LE(4326, 5);
  b.writeDoubleLE(lng, 9);
  b.writeDoubleLE(lat, 17);
  return b.toString('hex');
};
try {
  const owner = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  });
  await owner.addCookies([{ name: 'rentra_session', value: f.owner, url: web }]);
  const admin = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  });
  await admin.addCookies([{ name: 'rentra_admin', value: f.admin, url: web }]);
  page = await owner.newPage();
  watch(page, 'owner');

  // 1. What are you listing? → venue basics.
  await page.goto(`${web}/partner/listings/new`);
  await page.getByText('Sports or play venue').click();
  await audit(page, '01-new-venue');
  check(
    'vertical choice relabels category as main activity',
    await page.getByLabel('Main activity').isVisible(),
  );
  await page.getByLabel('Main activity').selectOption({ label: 'Box cricket' });
  await page.locator('#title').fill('Smash Arena box cricket Vesu');
  await page.locator('#highlight').fill('Floodlit until 1 AM');
  await page
    .locator('#description')
    .fill(
      'Three floodlit box-cricket cages off Vesu Main Road, nets on all sides, parking at the gate.',
    );
  await page.locator('#cityId').selectOption({ index: 1 });
  await page.locator('#areaId').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForURL(/\/setup\/location/, { timeout: 30000 });
  const id = page.url().match(/listings\/([0-9a-f-]{36})\//)[1];
  check(
    'draft created as a venue',
    (await sql`SELECT rental_unit::text AS u FROM rentable WHERE id=${id}`)[0].u === 'hour',
  );

  // 2. Location (no approach-road field any more).
  check('approach road field removed', (await page.locator('#approachNote').count()) === 0);
  await page.locator('#lat').fill('21.14');
  await page.locator('#lng').fill('72.77');
  await page.locator('#exactAddress').fill('Plot 12, Vesu Main Road, Surat 395007');
  await saveAndContinue(page, 'venue');
  // The no-PostGIS fixture nulls geometry on every write; pause that and store the pin itself.
  await sql`ALTER TABLE rentable DISABLE TRIGGER fixture_rentable_geo`;
  await sql`UPDATE rentable SET location=${ewkb(72.77, 21.14)} WHERE id=${id}`;
  await page.reload(); // the fixture write bumped the content version the form carries

  // 3. Courts: three box-cricket courts.
  await page.getByRole('button', { name: 'Add a court' }).click();
  await page.getByRole('button', { name: 'Add a court' }).click();
  await audit(page, '03-courts');
  await saveAndContinue(page, 'amenities');
  const courts =
    await sql`SELECT name FROM rentable_resource WHERE rentable_id=${id} AND is_active ORDER BY sort_order`;
  check(
    'three courts saved',
    courts.map((c) => c.name).join(',') === 'Court 1,Court 2,Court 3',
    courts.map((c) => c.name).join(','),
  );

  // 4. Amenities scoped to the vertical.
  const amenities = page.locator('input[name="amenity"]');
  for (let i = 0; i < 3; i += 1) await amenities.nth(i).check();
  await saveAndContinue(page, 'hours');

  // 5. Opening hours: preview, then confirm.
  await audit(page, '05-hours');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByText('Review before applying').waitFor();
  await saveAndContinue(page, 'rules');

  // 6. Venue rules.
  await page.locator('#footwear').selectOption('non_marking');
  await audit(page, '06-rules');
  await saveAndContinue(page, 'pricing');

  // 7. Hourly prices: peak preset, rates, preview, confirm.
  await page.getByRole('button', { name: 'Peak from 6 PM' }).click();
  const rates = page.getByLabel(/rate per hour/);
  for (let i = 0; i < (await rates.count()); i += 1)
    await rates.nth(i).fill(i % 2 ? '1200' : '800');
  check(
    'no price gaps after preset',
    (await page.getByText('These open hours have no price yet').count()) === 0,
  );
  await audit(page, '07-pricing');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByText('Review before applying').waitFor();
  await saveAndContinue(page, 'terms');
  // Terms preview the refund bands too, then confirm.
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await page.getByText('Review before applying').waitFor();
  await saveAndContinue(page, 'photos');

  // Photos and the ownership file need Cloudinary; the fixture supplies them.
  await sql`UPDATE rentable v SET photos=f.photos FROM (SELECT photos FROM rentable
    WHERE jsonb_array_length(photos) >= 6 ORDER BY created_at LIMIT 1) f WHERE v.id=${id}`;
  await sql`INSERT INTO document(owner_type,owner_id,doc_type,side,storage_key,mime_type,status,name_on_document)
    VALUES ('rentable',${id},'shop_establishment','single','fixture/venue-gate','application/pdf','uploaded','Smash Arena')`;

  // 8. Review and submit.
  await page.goto(`${web}/partner/listings/${id}/setup/review`);
  await audit(page, '08-review');
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await page.waitForURL(/submitted=1/, { timeout: 30000 });
  check(
    'submitted',
    (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status === 'pending_review',
  );

  // 9. Court calendar.
  const today = new Date(Date.now() + 5.5 * 3600000).toISOString().slice(0, 10);
  await sql`INSERT INTO inventory_reservation(rentable_id,resource_id,source,blocked_start_at,blocked_end_at,state,reason)
    SELECT ${id}, id, 'owner_block', ${`${today}T21:00:00+05:30`}, ${`${today}T23:00:00+05:30`}, 'committed', 'Net repair'
    FROM rentable_resource WHERE rentable_id=${id} AND name='Court 2'`;
  await page.goto(`${web}/partner/listings/${id}/calendar`);
  const timeline = page.getByRole('region', { name: 'Court timeline' });
  await timeline.waitFor();
  check(
    'calendar shows courts, not day/night slots',
    (await timeline.getByText('Court 3').count()) === 1 &&
      (await page.getByText('Day: Closed').count()) === 0,
  );
  check(
    'court block drawn on its own row',
    (await timeline.getByRole('img', { name: /^Court 2, .*Blocked.*Net repair/ }).count()) === 1,
  );
  await audit(page, '09-calendar');

  // 10. Admin: review panes, decision, verification with the venue checklist, publish.
  desk = await admin.newPage();
  watch(desk, 'admin');
  await desk.goto(`${web}/admin/properties/${id}`);
  await desk.getByRole('heading', { name: 'Hourly prices', exact: true }).waitFor();
  for (const pane of ['Courts', 'Opening hours and booking grid', 'Hourly prices'])
    check(
      `admin pane ${pane}`,
      await desk.getByRole('heading', { name: pane, exact: true }).isVisible(),
    );
  await audit(desk, '10-admin-review');
  await desk.goto(`${web}/admin/properties/${id}?tab=decision`);
  await desk.getByRole('button', { name: 'Assign to me' }).click();
  await desk.getByRole('button', { name: 'Release assignment' }).waitFor();
  check(
    'venue sections flaggable',
    (await desk.locator('input[name="flagged"][value="venue"]').count()) === 1 &&
      (await desk.locator('input[name="flagged"][value="hours"]').count()) === 1,
  );
  await desk.locator('select[name="outcome"]').selectOption('approved_for_visit');
  await desk
    .locator('textarea[name="reason"]')
    .fill('Courts, hours, prices and the business document checked.');
  await desk.getByRole('button', { name: 'Record decision' }).click();
  for (
    let i = 0;
    i < 40 &&
    (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status !== 'pending_verification';
    i += 1
  )
    await desk.waitForTimeout(250);
  check(
    'approved for verification',
    (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status === 'pending_verification',
  );

  await desk.goto(`${web}/admin/properties/${id}?tab=verification`);
  const tomorrow = new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
  await desk.locator('input[name="scheduledAt"]').first().fill(`${tomorrow}T11:00`);
  await desk.getByRole('button', { name: 'Schedule verification' }).click();
  await desk
    .getByRole('button', { name: 'Record verification outcome' })
    .waitFor({ timeout: 30000 });
  const items = desk.locator('input[name="checklist"]');
  const keys = await items.evaluateAll((nodes) => nodes.map((n) => n.value));
  check(
    'venue checklist',
    ['resourcesMatch', 'playSafety', 'lightingWorks'].every((k) => keys.includes(k)) &&
      !keys.includes('safeForGuests'),
    keys.join(','),
  );
  for (let i = 0; i < keys.length; i += 1) await items.nth(i).check();
  await desk
    .locator('textarea[name="findings"]')
    .fill('All three courts, nets, first aid and evening lighting verified on a video call.');
  await audit(desk, '10-admin-verification');
  await desk.getByRole('button', { name: 'Record verification outcome' }).click();
  await desk.getByRole('button', { name: 'Publish this revision' }).waitFor({ timeout: 30000 });
  await desk.getByText('I have checked the verification evidence').click();
  await desk.getByRole('button', { name: 'Publish this revision' }).click();
  for (
    let i = 0;
    i < 40 && (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status !== 'live';
    i += 1
  )
    await desk.waitForTimeout(250);
  check('published', (await sql`SELECT status FROM rentable WHERE id=${id}`)[0].status === 'live');

  // 11. Launch switch: verticals catalogue, preview then confirm, then guest search.
  await desk.goto(`${web}/admin/catalogues/verticals`);
  await audit(desk, '11-admin-verticals');
  const row = desk.locator('li', { hasText: '(entertainment)' });
  await row.locator('select[name="status"]').selectOption('public');
  await row.locator('input[name="reason"]').fill('Partner pilot venue verified and live.');
  await row.getByRole('button', { name: 'Preview changes' }).click();
  await row.getByRole('button', { name: 'Confirm and save' }).click();
  await row.getByText('Saved.').waitFor({ timeout: 30000 });
  // Guest search UI for entertainment is Phase 7; the public search API is the contract here.
  const found = await fetch(`${api}/discovery/search?vertical=entertainment`).then((r) => r.json());
  const card = found.data.items.find((item) => item.id === id);
  check(
    'venue appears in entertainment search',
    card?.resourceCount === 3,
    JSON.stringify(card ?? null).slice(0, 120),
  );
  check(
    'no console errors (hydration, runtime)',
    consoleErrors.length === 0,
    consoleErrors.join(' | '),
  );
  completed = true;
} catch (error) {
  check('journey completed', false, error.message.split('\n')[0]);
  for (const [name, p] of [
    ['owner', page],
    ['admin', desk],
  ])
    if (out && p)
      await p
        .screenshot({ path: `${out}/fail-${name}.png`, fullPage: true, caret: 'initial' })
        .catch(() => {});
} finally {
  await browser.close();
  await sql`ALTER TABLE rentable ENABLE TRIGGER fixture_rentable_geo`;
  await sql.end();
  const failed = results.filter((r) => !r.pass);
  if (out) await writeFile(`${out}/cp32-results.json`, JSON.stringify(results, null, 2));
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  process.exitCode = completed && !failed.length ? 0 : 1;
}
