import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { auditPage } from './browser-audit.mjs';

const fixture = JSON.parse(await readFile(process.env.OWNER_COMMUNICATIONS_FIXTURE));
const database = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname.startsWith('/rentra_test_'),
  'Disposable localhost database required',
);
const origin = process.env.GATE_WEB_ORIGIN || 'http://localhost:3149';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(origin).hostname), 'Local frontend required');
const evidence =
  process.env.OWNER_CONTACT_EVIDENCE_DIR || join(tmpdir(), 'rentra-owner-contact-feedback');
await mkdir(evidence, { recursive: true });
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const context = await browser.newContext();
await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: origin }]);
const page = await context.newPage();
page.setDefaultTimeout(20000);
const errors = [],
  results = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  for (const width of [360, 1280]) {
    if (width === 1280) {
      // Exercise the normal OTP throttle rather than disabling it in the fixture.
      console.log('Waiting for the one-minute contact-code cooldown before desktop checks.');
      await new Promise((resolve) => setTimeout(resolve, 61000));
    }
    await page.setViewportSize({ width, height: 900 });
    for (const channel of ['email', 'sms']) {
      const name = `${width}px ${channel} contact success and session rotation`;
      try {
        await page.goto(origin + '/partner/settings/security', { waitUntil: 'networkidle' });
        const section = page
          .getByRole('heading', {
            name: channel === 'email' ? 'Email address' : 'Mobile number',
            exact: true,
          })
          .locator('..');
        const identifier =
          channel === 'email'
            ? `owner-${width}@fixture.invalid`
            : width === 360
              ? '+919876543211'
              : '+919876543212';
        await section
          .getByLabel(channel === 'email' ? 'New email address' : 'New mobile number (+91)', {
            exact: true,
          })
          .fill(identifier);
        await section.getByRole('button', { name: 'Send verification code', exact: true }).click();
        const code = section.getByLabel('Six-digit code');
        await code.fill('000000');
        await section.getByRole('button', { name: 'Verify and save', exact: true }).click();
        await section.getByRole('alert').waitFor();
        assert.equal(
          await page
            .getByRole('status')
            .filter({ hasText: /^Contact detail verified and saved/ })
            .count(),
          0,
          'A wrong code must not announce success',
        );
        const before = (await context.cookies()).find(
          (cookie) => cookie.name === 'rentra_session',
        ).value;
        await code.fill('123456');
        await section.getByRole('button', { name: 'Verify and save', exact: true }).click();
        await page
          .getByRole('status')
          .filter({ hasText: /^Contact detail verified and saved/ })
          .waitFor();
        await section
          .getByText(channel === 'email' ? identifier : identifier.slice(3), { exact: true })
          .waitFor();
        const after = (await context.cookies()).find(
          (cookie) => cookie.name === 'rentra_session',
        ).value;
        assert.notEqual(after, before, 'The current session must rotate');
        assert.equal(
          (
            await context.request.get(origin + '/api/partner-identity', {
              headers: { Cookie: 'rentra_session=' + before },
            })
          ).status(),
          401,
          'The previous session must be revoked',
        );
        assert.equal(await code.count(), 0, 'The old challenge must not remain after saving');
        // Session rotation remounts the shell; audit its settled colors after the sidebar fade.
        await page.evaluate(async () => {
          const animations = document
            .getAnimations()
            .filter((animation) => animation.effect?.target?.closest?.('aside'));
          await Promise.all(animations.map((animation) => animation.finished.catch(() => {})));
        });
        assert.equal(
          await page
            .getByRole('status')
            .filter({ hasText: /^Contact detail verified and saved/ })
            .count(),
          1,
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        assert.deepEqual(
          (await auditPage(page)).violations.map((violation) => violation.id),
          [],
        );
        await page.screenshot({
          path: join(evidence, `${width}-${channel}-saved.png`),
          fullPage: true,
        });
        await page.reload({ waitUntil: 'networkidle' });
        await section
          .getByText(channel === 'email' ? identifier : identifier.slice(3), { exact: true })
          .waitFor();
        await page.getByRole('heading', { name: 'Active sessions', exact: true }).waitFor();
        results.push({ name, ok: true });
        console.log('PASS', name);
      } catch (error) {
        results.push({ name, ok: false, error: error.message });
        console.error('FAIL', name, error.message);
      }
    }
  }
  assert.deepEqual(errors, [], 'No uncaught browser errors');
} finally {
  await writeFile(
    join(evidence, 'results.json'),
    JSON.stringify({ results, errors }, null, 2) + '\n',
  );
  await browser.close();
}
if (results.some((result) => !result.ok) || errors.length) process.exitCode = 1;
