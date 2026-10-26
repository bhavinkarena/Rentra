// Story 1.2 browser gate: an admin inspects a submitted revision's evidence without changing it.
// Run after owner-wizard.mjs on the same disposable fixture (serve-owner-wizard.mjs on 4143),
// which leaves a submitted property for the fixture owner.
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
assert.ok(fixture.tokens.admin, 'restart serve-owner-wizard.mjs to mint the admin sessions');
const sql = postgres(fixture.databaseUrl, { max: 1 });
const [property] = await sql`SELECT r.id FROM rentable r
  JOIN listing_submission s ON s.rentable_id=r.id
  WHERE r.client_id=${fixture.ids.owner} AND r.status='pending_review'
  ORDER BY s.submitted_at DESC LIMIT 1`;
assert.ok(property, 'run owner-wizard.mjs first so a submitted property exists');
const id = property.id;
const state = () => sql`SELECT r.status,r.content_version,
  (SELECT count(*) FROM listing_submission WHERE rentable_id=r.id) AS submissions,
  (SELECT count(*) FROM listing_review WHERE rentable_id=r.id) AS reviews,
  (SELECT count(*) FROM verification_visit WHERE rentable_id=r.id) AS visits
  FROM rentable r WHERE r.id=${id}`;
const before = await state();
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3143';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const errors = [];
async function open(width, token) {
  const context = await browser.newContext({
    viewport: { width, height: width < 500 ? 800 : 900 },
    reducedMotion: 'reduce',
  });
  if (token) await context.addCookies([{ name: 'rentra_admin', value: token, url: web }]);
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
let documentHref;
try {
  for (const width of [360, 1280]) {
    await check(`${width}: revision, separate facts and evidence wording`, async () => {
      const page = await open(width, fixture.tokens.admin);
      await page.goto(`${web}/admin/properties/${id}?tab=submission`, {
        waitUntil: 'networkidle',
      });
      await page.getByText(/Pass 1, content version \d+/).waitFor();
      for (const label of ['Owner identity', 'Property review', 'Bookability'])
        await page
          .getByRole('region', { name: 'Revision context' })
          .getByText(label, { exact: true })
          .waitFor();
      await page
        .getByText(/Status when submitted:/)
        .first()
        .waitFor();
      const link = page.getByRole('link', { name: /^Open .+ \(opens in new tab\)$/ }).first();
      documentHref = await link.getAttribute('href');
      await link.focus();
      assert.notEqual(await link.evaluate((node) => getComputedStyle(node).outlineStyle), 'none');
      await fits(page);
      await page.goto(`${web}/admin/properties/${id}?tab=verification`, {
        waitUntil: 'networkidle',
      });
      await page.getByText('No completed site visit for pass 1.', { exact: false }).waitFor();
      await fits(page);
    });
  }
  await check(
    'opening evidence never serves a stored URL or claims review on failure',
    async () => {
      const page = await open(1280, fixture.tokens.admin);
      const response = await page.request.get(web + documentHref);
      const body = await response.text();
      assert.ok(!/res\.cloudinary\.com|fixture\/private-evidence/.test(body));
      if (response.status() >= 500) assert.match(body, /has not been reviewed/);
      else assert.equal(response.status(), 200);
      console.log('  document response', response.status());
    },
  );
  await check('anonymous and limited admins cannot read the detail or the file', async () => {
    for (const token of [undefined, fixture.tokens.limited]) {
      const page = await open(390, token);
      const file = await page.request.get(web + documentHref);
      assert.ok([401, 403, 404].includes(file.status()), `file answered ${file.status()}`);
      await page.goto(`${web}/admin/properties/${id}`, { waitUntil: 'networkidle' });
      assert.equal(await page.getByText(/Status when submitted:/).count(), 0);
    }
  });
  await check('inspection changed nothing', async () => {
    assert.deepEqual(await state(), before);
  });
  await check('a passed site visit for this pass removes the missing-visit statement', async () => {
    // Recorded directly in the disposable fixture after the no-mutation check above.
    await sql`INSERT INTO verification_visit(rentable_id,submission_id,mode,scheduled_at,completed_at,outcome)
      SELECT ${id},s.id,'physical',now(),now(),'passed' FROM listing_submission s
      WHERE s.rentable_id=${id} ORDER BY s.pass_number DESC LIMIT 1`;
    const page = await open(1280, fixture.tokens.admin);
    await page.goto(`${web}/admin/properties/${id}?tab=verification`, {
      waitUntil: 'networkidle',
    });
    await page.getByText(/Site visit · .* · passed/).waitFor();
    await page.getByText(/Pass 1 \(revision shown\)/).waitFor();
    assert.equal(await page.getByText(/No completed site visit/).count(), 0);
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await sql.end();
}
