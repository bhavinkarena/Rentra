import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { auditPage } from './browser-audit.mjs';
const { chromium } = await import(
  pathToFileURL(
    process.env.PLAYWRIGHT_MODULE ||
      join(
        process.env.APPDATA,
        'npm/node_modules/@playwright/cli/node_modules/playwright/index.mjs',
      ),
  ).href
);
const fixture = JSON.parse(await readFile(process.env.CP06_GATE_FIXTURE, 'utf8'));
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3107';
const out = new URL('../../docs/evidence/owner-phase11/', import.meta.url);
await mkdir(out, { recursive: true });
const { default: postgres } = await import(
  new URL('../../../rentra-backend/node_modules/postgres/src/index.js', import.meta.url)
);
const db = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(db.hostname) && db.pathname.startsWith('/rentra_test_'),
);
const sql = postgres(fixture.databaseUrl, { max: 1, onnotice: () => {} });
const [draft] =
  await sql`INSERT INTO rentable(client_id,slug,title,description,category_id,city_id,area_id,public_code,capacity,farm_size,exact_address,check_in_from,check_out_by,photos,booking_config,house_rules) SELECT client_id,'mobile-draft','Mobile draft',description,category_id,city_id,area_id,'mobile11',capacity,farm_size,exact_address,check_in_from,check_out_by,photos,booking_config,house_rules FROM rentable WHERE id=${fixture.ids.listing} ON CONFLICT(slug) DO UPDATE SET title=excluded.title RETURNING id`;
await sql`INSERT INTO rentable_price(rentable_id,slot,weekday_minor,weekend_minor) SELECT ${draft.id},slot,weekday_minor,weekend_minor FROM rentable_price WHERE rentable_id=${fixture.ids.listing} ON CONFLICT DO NOTHING`;
await sql`UPDATE booking SET hours_known=true, blocked_start_at=now()-interval '30 minutes', blocked_end_at=now()+interval '8 hours', starts_at=now()-interval '30 minutes', ends_at=now()+interval '8 hours' WHERE order_id=${fixture.booking.order}`;
await sql.end();
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  reducedMotion: 'reduce',
});
await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [],
  checks = [],
  rows = [];
page.on('pageerror', (e) => errors.push(e.message));
const base = '/partner';
const routes = [
  '',
  'calendar',
  'bookings',
  'updates',
  'reviews',
  'team',
  'help',
  'support',
  'support/new',
  'disputes',
  'disputes/new',
  'settings',
  'settings/payout',
  'settings/notifications',
  'settings/calendar-sync',
  'settings/security',
  'settings/privacy',
  'earnings',
  'earnings/statements',
  'payouts',
  `bookings/${fixture.booking.order}`,
  ...[
    'overview',
    'calendar',
    'photos',
    'arrival-guide',
    'reviews',
    'activity',
    'booking-rules',
  ].map((s) => `listings/${fixture.ids.listing}/${s}`),
  'listings',
  ...[
    'type',
    'location',
    'space',
    'amenities',
    'photos',
    'story',
    'pricing',
    'availability',
    'rules',
    'ownership',
    'preview',
  ].map((s) => `listings/${draft.id}/setup/${s}`),
];
async function ready() {
  await page.locator('main').last().waitFor();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll('[aria-busy="true"]')].some(
        (el) => el.getBoundingClientRect().width > 0,
      ),
  );
  await page.getByText('Checking your session…', { exact: true }).waitFor({ state: 'hidden' });
  await page.waitForTimeout(150);
}
try {
  for (const route of routes) {
    await page.goto(`${web}${base}/${route}`, { timeout: 120000 });
    await ready();
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(100);
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        small: [
          ...document.querySelectorAll(
            '.owner-portal button,.owner-portal a,.owner-portal summary,.owner-wizard button,.owner-wizard a,.owner-wizard summary',
          ),
        ]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.height > 0 &&
              !el.closest('[inert]') &&
              !el.classList.contains('sr-only') &&
              (r.width < 43.5 || r.height < 43.5)
            );
          })
          .map((el) => ({
            text: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 50),
            w: el.getBoundingClientRect().width,
            h: el.getBoundingClientRect().height,
          })),
        smallInputs: [
          ...document.querySelectorAll(
            '.owner-portal input,.owner-portal select,.owner-portal textarea,.owner-wizard input,.owner-wizard select,.owner-wizard textarea',
          ),
        ]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return (
              r.width > 0 &&
              r.height > 0 &&
              !['checkbox', 'radio', 'hidden', 'file'].includes(el.type) &&
              parseFloat(getComputedStyle(el).fontSize) < 16
            );
          })
          .map((el) => el.name),
      }));
      rows.push({ route, width, ...geometry });
      assert.ok(geometry.scroll <= width, route + ' overflow at ' + width);
      assert.deepEqual(geometry.small, [], route + ' targets at ' + width);
      assert.deepEqual(geometry.smallInputs, [], route + ' input font');
      if (width === 360)
        await page.screenshot({
          path: join(fileURLToPath(out), route.replaceAll('/', '-') || 'today') + '.png',
          fullPage: true,
        });
    }
    await page.setViewportSize({ width: 360, height: 800 });
    if (
      ['', 'bookings', 'earnings', 'settings', `listings/${draft.id}/setup/pricing`].includes(route)
    ) {
      const audit = await auditPage(page, 'main');
      assert.deepEqual(
        audit.violations.map((v) => v.id),
        [],
        route + ' axe',
      );
    }
    checks.push('viewport matrix ' + route);
    console.log('PASS', route);
  }
  const applicantSql = postgres(fixture.databaseUrl, { max: 1, onnotice: () => {} });
  await applicantSql`UPDATE "user" SET account_status='pending_application' WHERE id=${fixture.ids.other}`;
  // Account-status changes revoke sessions; issue a fresh disposable applicant session.
  const [session] =
    await applicantSql`INSERT INTO auth_session(user_id,expires_at) VALUES (${fixture.ids.other},now()+interval '1 hour') RETURNING id`;
  const { SignJWT } = await import(
    new URL('../../../rentra-backend/node_modules/jose/dist/webapi/index.js', import.meta.url)
  );
  const applicantToken = await new SignJWT({
    userId: fixture.ids.other,
    role: 'client',
    sessionId: session.id,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('rentra:client')
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('cp06-local-fixture-signing-secret-not-for-deployment'));
  await applicantSql.end();
  const applicant = await browser.newContext({ viewport: { width: 360, height: 800 } });
  await applicant.addCookies([{ name: 'rentra_session', value: applicantToken, url: web }]);
  const onboarding = await applicant.newPage();
  onboarding.on('pageerror', (e) => errors.push(e.message));
  for (const step of ['details', 'phone', 'kyc', 'payout', 'consent', 'review']) {
    await onboarding.goto(`${web}/partner/onboarding/${step}`, { timeout: 120000 });
    if (step === 'phone') await onboarding.waitForURL('**/onboarding/details#verify-mobile');
    await onboarding.getByRole('heading', { level: 1 }).waitFor();
    await onboarding.getByRole('main').waitFor();
    for (const width of [360, 390, 768, 1024, 1440]) {
      await onboarding.setViewportSize({ width, height: 800 });
      await onboarding.waitForTimeout(100);
      const scroll = await onboarding.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(scroll <= width, 'onboarding ' + step + ' ' + width);
      rows.push({ route: 'onboarding/' + step, width, scroll });
    }
  }
  checks.push('applicant onboarding viewport matrix');
  await applicant.close();
  await page.goto(`${web}/partner/listings/${draft.id}/setup/story`);
  await ready();
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, value: 400 });
    visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.locator('[data-wizard-actions]').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'scale', { configurable: true, value: 2 });
    visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.locator('[data-wizard-actions]').waitFor();
  await page.evaluate(() => {
    delete visualViewport.height;
    delete visualViewport.scale;
    visualViewport.dispatchEvent(new Event('resize'));
  });
  checks.push('wizard keyboard hide, pinch zoom retains controls');
  await page.goto(`${web}/partner/bookings/${fixture.booking.order}`);
  await ready();
  await page.locator('.owner-visit-action').waitFor();
  assert.equal(
    await page.locator('.owner-visit-action').evaluate((el) => getComputedStyle(el).position),
    'fixed',
  );
  await page.evaluate(() => {
    Object.defineProperty(visualViewport, 'height', { configurable: true, value: 400 });
    visualViewport.dispatchEvent(new Event('resize'));
  });
  await page.locator('.owner-visit-action').waitFor({ state: 'hidden' });
  checks.push('booking thumb-zone action and keyboard hide');
  assert.deepEqual(errors, []);
  await writeFile(new URL('results.json', out), JSON.stringify({ checks, rows, errors }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, views: rows.length, errors }));
} finally {
  await browser.close();
}
