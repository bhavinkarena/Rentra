// CP21 failure paths. Phase "partial": the fixture runs on 4206 (port-remap.mjs preload) behind
// fault-proxy.mjs on 4106. Phase "full": run after stopping both, with Next still on :3106.
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const phase = process.argv[2];
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const out = new URL('../../docs/rentra-client-admin-part21-outage-gate.json', import.meta.url);
const prior =
  phase === 'full' && existsSync(out) ? JSON.parse(await readFile(out, 'utf8')).results : [];
const results = prior.filter((r) => !r.check.startsWith('Full API outage'));
const check = (name, pass, info) => {
  results.push({ check: name, pass: !!pass });
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${name}${pass || info === undefined ? '' : ' ' + JSON.stringify(info)}`,
  );
};
const fault = (re, mode = 'fail') =>
  fetch(
    `http://localhost:4106/__fault/set${re ? `?re=${encodeURIComponent(re)}&mode=${mode}` : ''}`,
  );
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const owner = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await owner.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: web }]);
  const admin = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await admin.addCookies([{ name: 'rentra_admin', value: fixture.tokens.admin, url: web }]);
  const pages = [
    [
      'owner payout page',
      owner,
      '/partner/settings/payout',
      '/partner/settings/payout',
      (p) => p.getByRole('heading', { name: 'Payout destination', exact: true }),
    ],
    [
      'admin payout tab',
      admin,
      `/admin/clients/${fixture.ids.owner}?tab=payout`,
      'tab=payout',
      (p) => p.getByRole('heading', { name: 'Payout destinations' }),
    ],
  ];
  if (phase === 'partial') {
    for (const [label, context, path, kept, loaded] of pages) {
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      await fault(
        label.startsWith('owner')
          ? '/partner/settings/payout'
          : `/admin/clients/${fixture.ids.owner}`,
      );
      await page.goto(web + path, { waitUntil: 'networkidle' });
      const retry = page.getByRole('button', { name: 'Try again', exact: true });
      check(
        `Payout API outage ${label}: retryable state, context kept`,
        (await page.getByRole('heading', { name: 'This page could not load' }).isVisible()) &&
          (await retry.isVisible()) &&
          page.url().includes(kept),
      );
      await fault(null);
      await retry.click();
      await loaded(page).waitFor();
      check(`Payout API outage ${label}: Try again recovers in place`, page.url().includes(kept));
    }
    // A submit that fails keeps the typed values and preview; a lost response after commit replays.
    const page = await owner.newPage();
    page.setDefaultTimeout(60000);
    const latest = async () =>
      (await (await owner.request.get(`${api}/partner/settings/payout`)).json()).data.latestVersion;
    await page.goto(`${web}/partner/settings/payout`, { waitUntil: 'networkidle' });
    const before = await latest();
    const form = page
      .locator('form')
      .filter({ has: page.getByRole('button', { name: /Preview change|Submit version/ }) });
    await form.getByRole('radio', { name: /UPI/ }).check();
    await form.getByLabel('UPI ID').fill('outage.owner@okaxis');
    await form.getByLabel('Account holder name').fill('Property Owner');
    await form.getByRole('button', { name: 'Preview change' }).click();
    await page.getByRole('status', { name: 'Payout change preview' }).waitFor();
    const submit = () =>
      Promise.all([
        page.waitForResponse(
          (r) => r.request().method() === 'POST' && r.url().includes('/partner/settings/payout'),
        ),
        form.getByRole('button', { name: `Submit version ${before + 1}` }).click(),
      ]);
    await fault('/partner/settings/payout');
    await submit();
    await page.getByRole('alert').filter({ hasText: 'Submitting again is safe' }).waitFor();
    check(
      'Submit during outage: honest retry message, input and preview kept',
      (await form.getByLabel('UPI ID').inputValue()) === 'outage.owner@okaxis' &&
        (await page.getByRole('status', { name: 'Payout change preview' }).isVisible()),
    );
    await fault(null);
    check('Submit during outage: nothing recorded', (await latest()) === before);
    await fault('/partner/settings/payout', 'drop');
    await submit();
    await page.getByRole('alert').filter({ hasText: 'Submitting again is safe' }).waitFor();
    await fault(null);
    check('Lost response after commit: one version recorded', (await latest()) === before + 1);
    await submit();
    await page
      .getByRole('heading', { name: 'Payout change preview' })
      .waitFor({ state: 'detached' })
      .catch(() => null);
    check(
      'Retry with the same form replays: still exactly one new version',
      (await latest()) === before + 1,
    );
  } else {
    for (const [label, context, path, kept] of pages) {
      const page = await context.newPage();
      await page.goto(web + path, { waitUntil: 'networkidle' });
      check(
        `Full API outage ${label}: retryable, no false empty or login`,
        (await page
          .getByRole('button', { name: /^(Try again|Reload)$/ })
          .first()
          .isVisible()) &&
          page.url().includes(kept) &&
          !/login/.test(page.url()) &&
          !(await page.getByText(/No current destination|No payout destination submitted/).count()),
      );
    }
  }
} finally {
  await browser.close();
  await writeFile(out, JSON.stringify({ results }, null, 2) + '\n');
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
