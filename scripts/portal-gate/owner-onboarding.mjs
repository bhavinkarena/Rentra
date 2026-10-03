import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { auditPage } from './browser-audit.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const postgres = require('../../../rentra-backend/node_modules/postgres');
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const url = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.pathname.startsWith('/rentra_test_'),
);
const sql = postgres(fixture.databaseUrl, { max: 1 });
const web = process.env.GATE_WEB_ORIGIN || 'http://127.0.0.1:3143';
const output = new URL('../../docs/evidence/owner-phase3/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const context = await browser.newContext({
  viewport: { width: 360, height: 800 },
  reducedMotion: 'reduce',
});
await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.pending, url: web }]);
const page = await context.newPage();
page.setDefaultTimeout(60000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
const results = [];
async function check(name, work) {
  await work();
  results.push(name);
  console.log('PASS', name);
}
async function audit() {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'no horizontal overflow',
  );
  const result = await auditPage(page);
  assert.deepEqual(
    result.violations.filter((v) => ['critical', 'serious'].includes(v.impact)).map((v) => v.id),
    [],
  );
}
try {
  await page.goto(web + '/partner/welcome');
  await page.getByRole('heading', { name: 'Welcome to Rentra, New' }).waitFor();
  await check('welcome persists on refresh and saves property kind', async () => {
    await page.getByLabel('Venue (turf, court, alley…)').check();
    await page.getByRole('button', { name: 'Get started', exact: true }).click();
    await page.waitForURL('**/partner/onboarding/details');
    assert.equal(
      (await sql`SELECT owner_guide FROM "user" WHERE id=${fixture.ids.other}`)[0].owner_guide
        .intendedVertical,
      'entertainment',
    );
    await page.goto(web + '/partner/welcome');
    await page.waitForURL(web + '/partner');
  });
  await check('tour traps keyboard focus, completes and restarts from Help', async () => {
    await page.goto(web + '/partner?tour=1');
    const dialog = page.getByRole('dialog', { name: 'Dashboard', exact: true });
    await dialog.waitFor();
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate((el) => el.contains(document.activeElement)), true);
    }
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Finish tour' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.goto(web + '/partner/help');
    await page.getByRole('link', { name: 'Show me around again' }).click();
    await page.getByRole('dialog', { name: 'Dashboard', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Skip tour' }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await check('unfinished tour resumes once and Escape skips it', async () => {
    await page.goto(web + '/partner?tour=1');
    await page.getByRole('dialog').waitFor();
    await page.waitForURL(web + '/partner');
    await page.reload();
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => !document.querySelector('dialog button').disabled);
    for (let attempt = 0; attempt < 50; attempt++) {
      if (
        (await sql`SELECT owner_guide FROM "user" WHERE id=${fixture.ids.other}`)[0].owner_guide
          .tourResumedAt
      )
        break;
      await page.waitForTimeout(100);
    }
    assert.ok(
      (await sql`SELECT owner_guide FROM "user" WHERE id=${fixture.ids.other}`)[0].owner_guide
        .tourResumedAt,
    );
    await page.reload();
    await page.getByRole('heading', { name: 'Get verified' }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.goto(web + '/partner?tour=1');
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await page.goto(web + '/partner/onboarding/details');
  await page.getByRole('heading', { name: 'Your details', exact: true }).waitFor();
  await check('four-step progress and mobile pages fit 360, 390, 768, 1440px', async () => {
    assert.equal(
      await page.getByRole('list', { name: 'Verification progress' }).getByRole('listitem').count(),
      4,
    );
    for (const width of [360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await audit();
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({
      path: new URL('details-360.png', output).pathname.replace(/^\/([A-Z]:)/, '$1'),
      fullPage: true,
    });
  });
  await check('phone verification auto-advances to identity', async () => {
    await page.locator('input[name="phone"]').fill('9876543299');
    await page.getByRole('button', { name: 'Send code by SMS' }).click();
    await page.locator('input[name="code"]').fill('111111');
    await page.getByRole('button', { name: 'Verify mobile' }).click();
    await page
      .getByText('That code is not right. Check it and try again.', { exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Verify mobile' }).waitFor();
    await page.waitForFunction(
      () =>
        !document.querySelector('form input[name=code]').closest('form').querySelector('button')
          .disabled,
    );
    await page.locator('input[name="code"]').fill('123456');
    await page.getByRole('button', { name: 'Verify mobile' }).click();
    await page.waitForURL('**/partner/onboarding/kyc');
  });
  await check('6MB JPEG compresses locally, previews and uploads privately', async () => {
    const data = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 2400;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 2400, 2400);
      ctx.fillStyle = '#222';
      ctx.font = '90px sans-serif';
      ctx.fillText('Private fixture identity', 100, 300);
      return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
    });
    const raw = Buffer.from(data, 'base64');
    const large = Buffer.concat([raw, Buffer.alloc(Math.max(0, 6 * 1024 * 1024 - raw.length))]);
    await page
      .locator('input[name="front"]')
      .setInputFiles({ name: 'phone-id.jpg', mimeType: 'image/jpeg', buffer: large });
    await page.getByAltText(/Front of the ID preview/).waitFor();
    await page.locator('input[name="kycNameOnDoc"]').fill('New Owner');
    await audit();
    await page.getByRole('button', { name: 'Upload and continue' }).click();
    await page.waitForURL('**/partner/onboarding/payout');
    const [doc] =
      await sql`SELECT bytes,mime_type FROM document WHERE owner_id=${fixture.app} AND status='uploaded'`;
    assert.ok(doc.bytes < 5 * 1024 * 1024);
    assert.equal(doc.mime_type, 'image/jpeg');
  });
  await check('3MB PDF passes through without image conversion', async () => {
    await page.goto(web + '/partner/onboarding/kyc');
    const pdf = Buffer.alloc(3 * 1024 * 1024, 32);
    pdf.write('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');
    await page
      .locator('input[name="front"]')
      .setInputFiles({ name: 'identity.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Upload and continue' }).click();
    await page.waitForURL('**/partner/onboarding/payout');
    const [doc] =
      await sql`SELECT bytes,mime_type FROM document WHERE owner_id=${fixture.app} AND status='uploaded'`;
    assert.equal(doc.bytes, pdf.length);
    assert.equal(doc.mime_type, 'application/pdf');
  });
  await check(
    'bank confirmation shows inline errors, normalizes numbers and retains bank selection',
    async () => {
      await page.route('https://ifsc.razorpay.com/**', (route) =>
        route.fulfill({ json: { BANK: 'Fixture Bank', BRANCH: 'Surat Branch' } }),
      );
      await page.getByLabel('Bank account').check();
      await page.getByLabel('Account number', { exact: true }).fill('1234-5678 9012');
      await page.getByLabel('Confirm account number', { exact: true }).fill('123456789013');
      await page.getByLabel('IFSC', { exact: true }).fill('SBIN0001234');
      await page.getByLabel('Account holder name', { exact: true }).fill('New Owner');
      await page.getByRole('button', { name: 'Save and continue' }).click();
      await page.getByText('Account numbers do not match', { exact: true }).waitFor();
      await page.getByLabel('Confirm account number', { exact: true }).fill('123456789012');
      await page.getByRole('button', { name: 'Save and continue' }).click();
      await page.waitForURL('**/partner/onboarding/consent');
      await page.goto(web + '/partner/onboarding/payout');
      assert.equal(await page.getByLabel('Bank account').isChecked(), true);
      await page.goto(web + '/partner/onboarding/consent');
    },
  );
  await check('consent links, review summary, submission banner and read-only steps', async () => {
    for (const name of ['Owner terms', 'Privacy policy', 'Cancellation policy'])
      assert.ok(await page.getByRole('link', { name, exact: true }).getAttribute('href'));
    await page.locator('input[name="acceptTerms"]').check();
    await page.locator('input[name="declareEntitled"]').check();
    await page.getByRole('button', { name: 'Agree and continue' }).click();
    await page.waitForURL('**/partner/onboarding/review');
    await page.getByRole('heading', { name: 'Review and submit', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
    await page.waitForURL('**/partner?submitted=1');
    await page
      .getByText('Verification submitted. Check back here for the decision.', { exact: true })
      .waitFor();
    await page.goto(web + '/partner/onboarding/details');
    await page.getByRole('heading', { name: 'With Rentra for review', exact: true }).waitFor();
    assert.equal(await page.locator('input:not([type="hidden"])').count(), 0);
    await audit();
  });
  await check('rejection reason and remaining attempts appear on Today', async () => {
    await sql`UPDATE client_application SET status='rejected',decision_reason='Please upload a clearer identity document',strike_count=1 WHERE id=${fixture.app}`;
    await page.goto(web + '/partner');
    await page.getByRole('heading', { name: 'We couldn’t approve this application' }).waitFor();
    await page.getByText(/Please upload a clearer identity document.*2 more times/).waitFor();
    await audit();
  });
  await check('pending owners reach draft wizard review but cannot submit', async () => {
    const [draft] =
      await sql`INSERT INTO rentable(client_id,slug,title,description,category_id,city_id,area_id,public_code) SELECT ${fixture.ids.other},'pending-fixture','Pending fixture property','A property draft for an applicant.',category_id,city_id,area_id,'draftp03' FROM rentable WHERE id=${fixture.ids.listing} RETURNING id`;
    await page.goto(web + `/partner/listings/${draft.id}/setup/review`);
    await page.getByRole('heading', { name: 'Almost there' }).waitFor();
    assert.equal(
      await page.getByRole('button', { name: 'Submit for review', exact: true }).isDisabled(),
      true,
    );
    await page
      .getByText('You can submit once your account is approved.', { exact: true })
      .waitFor();
    // A completed property still cannot submit before account approval.
    await page.goto(web + '/partner/listings');
    await page
      .getByRole('listitem')
      .getByText('Pending fixture property', { exact: true })
      .waitFor();
  });
  await check('approved owner sees setup guide and onboarding redirects to settings', async () => {
    await context.clearCookies();
    await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
    await page.goto(web + '/partner');
    await page.getByText('Get ready for bookings', { exact: false }).first().waitFor();
    await audit();
    await page.goto(web + '/partner/onboarding/kyc');
    await page.waitForURL('**/partner/settings?notice=verified');
    await page
      .getByText('You’re already verified. Update your account details here.', { exact: true })
      .waitFor();
  });
  assert.deepEqual(errors, [], 'no browser runtime errors');
  await writeFile(
    new URL('browser-checks.json', output),
    JSON.stringify(
      { results, errors, privateStorage: 'local fixture substitute; no real provider upload' },
      null,
      2,
    ) + '\n',
  );
} catch (error) {
  console.log('FAILED PAGE', page.url(), (await page.locator('body').innerText()).slice(-4500));
  throw error;
} finally {
  await context.close();
  await browser.close();
  await sql.end();
}
