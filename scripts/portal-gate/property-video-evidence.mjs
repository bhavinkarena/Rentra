// Story 1.3 browser gate: reviewer requests a property video, the owner uploads and sends it,
// the reviewer watches it. Run after owner-wizard.mjs on the same disposable fixture, with
// serve-owner-wizard.mjs started under OWNER_FIXTURE_VIDEO=1 (in-memory private video store).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { auditPage } from './browser-audit.mjs';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE),
  postgres = require(process.env.POSTGRES_MODULE);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const database = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname.startsWith('/rentra_test_'),
);
const sql = postgres(fixture.databaseUrl, { max: 1 });
const [property] = await sql`SELECT r.id FROM rentable r
  JOIN listing_submission s ON s.rentable_id=r.id
  WHERE r.client_id=${fixture.ids.owner} AND r.status='pending_review'
  ORDER BY s.submitted_at DESC LIMIT 1`;
assert.ok(property, 'run owner-wizard.mjs first so a submitted property exists');
const id = property.id;
const reviewState = () =>
  sql`SELECT status,content_version,review_pass FROM rentable WHERE id=${id}`;
const before = await reviewState();
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3143';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const errors = [];
async function open(width, cookie) {
  const context = await browser.newContext({
    viewport: { width, height: width < 500 ? 800 : 900 },
    reducedMotion: 'reduce',
  });
  if (cookie) await context.addCookies([{ ...cookie, url: web }]);
  // The signed direct upload goes to the provider; the gate stands in for it.
  await context.route('https://upload.test/**', (route) => route.fulfill({ json: { ok: true } }));
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
async function check(name, work) {
  await work();
  console.log('PASS', name);
}
async function fits(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const serious = (await auditPage(page)).violations.filter((v) =>
    ['serious', 'critical'].includes(v.impact),
  );
  assert.deepEqual(
    serious.map((v) => v.id),
    [],
  );
}
const reason = 'Show the pool area and the boundary wall facing the road.';
const admin = { name: 'rentra_admin', value: fixture.tokens.admin },
  owner = { name: 'rentra_session', value: fixture.tokens.owner };
const verification = `${web}/admin/properties/${id}?tab=verification`,
  overview = `${web}/partner/listings/${id}/overview`;
try {
  await check('1280: reviewer explicitly requests a video for the current pass', async () => {
    const page = await open(1280, admin);
    await page.goto(verification, { waitUntil: 'networkidle' });
    await page.getByLabel('What the video must show').fill(reason);
    await page.getByRole('button', { name: 'Request property video' }).click();
    // The confirmation checkbox is required: nothing is sent without it.
    assert.equal(
      (await sql`SELECT 1 FROM property_evidence_request WHERE rentable_id=${id}`).length,
      0,
    );
    await page.getByLabel(/Send this request to the owner/).check();
    await page.getByRole('button', { name: 'Request property video' }).click();
    await page.getByRole('status').filter({ hasText: 'Saved.' }).waitFor();
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText(/Pass \d+ · Requested — waiting for the owner/).waitFor();
    await fits(page);
    const [update] = await sql`SELECT action FROM client_update
      WHERE client_id=${fixture.ids.owner} AND action='evidence_requested'`;
    assert.ok(update, 'owner portal update recorded');
  });
  await check('another owner never sees the request', async () => {
    const page = await open(390, { name: 'rentra_session', value: fixture.tokens.other });
    await page.goto(overview, { waitUntil: 'networkidle' });
    assert.ok(!(await page.content()).includes(reason));
  });
  await check('360: owner uploads, sees not-sent state, then sends explicitly', async () => {
    const page = await open(360, owner);
    await page.goto(overview, { waitUntil: 'networkidle' });
    await page.getByText(reason).waitFor();
    await page.getByText(/MP4 or MOV video, up to 50 MB/).waitFor();
    const send = page.getByRole('button', { name: 'Send video to Rentra' });
    assert.equal(await send.isDisabled(), true);
    await page.getByLabel('Choose a video').setInputFiles({
      name: 'walkthrough.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.alloc(4096),
    });
    await page.getByText('Uploaded. Not sent yet — press Send video to Rentra.').waitFor();
    const [uploaded] =
      await sql`SELECT submitted_at FROM property_evidence_request WHERE rentable_id=${id}`;
    assert.equal(uploaded.submitted_at, null, 'uploading alone does not send');
    await fits(page);
    await send.click();
    await page.getByText(/Video sent to Rentra(\.| on .*\.) A reviewer will look at it/).waitFor();
    const [sent] =
      await sql`SELECT submitted_at FROM property_evidence_request WHERE rentable_id=${id}`;
    assert.ok(sent.submitted_at);
  });
  await check('1280: reviewer watches the sent video; nothing was approved', async () => {
    const page = await open(1280, admin);
    await page.goto(verification, { waitUntil: 'networkidle' });
    await page.getByText(/Sent by the owner — not a review outcome/).waitFor();
    await page.getByText(/Video evidence is not a physical inspection/).waitFor();
    const src = await page.locator('video').first().getAttribute('src');
    assert.ok(!/cloudinary|property-evidence\//.test(src));
    const video = await page.request.get(web + src);
    assert.equal(video.status(), 200);
    assert.equal(await video.text(), 'video-bytes');
    assert.ok(
      (await sql`SELECT 1 FROM audit_log WHERE action='evidence_video_viewed' AND entity_id=${id}`)
        .length,
    );
    const anonymous = await (await open(390)).request.get(web + src);
    assert.ok([401, 403, 404].includes(anonymous.status()));
    assert.deepEqual(await reviewState(), before);
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await sql.end();
}
