// CP21 browser/API gate. Requires the disposable published fixture on :4106 seeded with
// seed-payout-destinations-gate.mjs, and isolated Next on :3106.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const results = [];
let completed = false;
const check = (name, pass, info) => {
  results.push({ check: name, pass: !!pass });
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${name}${pass || info === undefined ? '' : ' ' + JSON.stringify(info).slice(0, 500)}`,
  );
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const ctx = async (kind) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (kind)
      await c.addCookies([
        {
          name: ['admin', 'limited', 'adminStale'].includes(kind)
            ? 'rentra_admin'
            : 'rentra_session',
          value: fixture.tokens[kind],
          url: web,
        },
      ]);
    return c;
  };
  const owner = await ctx('owner'),
    stale = await ctx('ownerStale'),
    other = await ctx('other'),
    admin = await ctx('admin'),
    adminStale = await ctx('adminStale'),
    limited = await ctx('limited'),
    anon = await ctx();
  const clientId = fixture.ids.owner;
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (label, target) => {
    check(
      `${label} no overflow`,
      await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await target.addScriptTag({ content: axe });
    const violations = await target.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html.slice(0, 120)) })),
    );
    check(`${label} axe clean`, !violations.length, violations);
  };
  const destinations = async (c = owner) =>
    (await (await c.request.get(`${api}/partner/settings/payout`)).json()).data;

  check(
    'anonymous payout page denied',
    (await anon.request.get(`${api}/partner/settings/payout`)).status() === 401,
  );
  check(
    'admin cookie cannot use the owner payout API',
    (await admin.request.get(`${api}/partner/settings/payout`)).status() === 401,
  );
  check(
    'another owner sees only their own (empty) history',
    (await destinations(other)).latestVersion === 0,
  );
  check(
    'records-only admin cannot mark a destination failed',
    (
      await limited.request.post(`${api}/admin/clients/${clientId}/payout-destinations/fail`, {
        data: {
          destinationId: fixture.destinations.v1,
          expectedState: 'submitted',
          reason: 'Read-only attempt here.',
          mode: 'preview',
          requestKey: randomUUID(),
        },
      })
    ).status() === 403,
  );

  // Settings no longer claims a name check verifies anything or that bookings pay to a saved destination.
  const page = await owner.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${web}/partner/settings`, { waitUntil: 'networkidle' });
  check(
    'settings links to versioned destinations without misleading claims',
    (await page.getByRole('link', { name: 'Manage payout destination' }).isVisible()) &&
      !(await page.getByText(/re-runs the name check|pay to the destination saved/).count()),
  );

  // Owner with a fresh sign-in: invalid input keeps typed values; preview then submit version 2.
  await page.goto(`${web}/partner/settings/payout`, { waitUntil: 'networkidle' });
  check(
    'readiness says payouts are disabled because verification is unavailable',
    (await page.getByText(/Payouts disabled\./).isVisible()) &&
      (await page
        .getByText(/not available yet/)
        .first()
        .isVisible()),
  );
  const form = page
    .locator('form')
    .filter({ has: page.getByRole('button', { name: 'Preview change' }) });
  await form.getByRole('radio', { name: /Bank account/ }).check();
  await form.getByLabel('Account number').fill('001234567896789');
  await form.getByLabel('IFSC').fill('BAD');
  await form.getByLabel('Account holder name').fill('Property Owner');
  await form.getByRole('button', { name: 'Preview change' }).click();
  await form.getByText('IFSC looks like SBIN0001234').waitFor();
  check(
    'invalid IFSC refused with typed values kept',
    (await form.getByLabel('Account number').inputValue()) === '001234567896789',
  );
  await form.getByLabel('IFSC').fill('sbin0001234');
  await form.getByRole('button', { name: 'Preview change' }).click();
  const preview = page.getByRole('status', { name: 'Payout change preview' });
  await preview.waitFor();
  check(
    'preview shows the masked destination and the pinned-payout effect',
    (await preview.innerText()).includes('Bank •••• 6789 · SBIN0001234') &&
      /stay pinned to version 1/.test(await preview.innerText()),
  );
  await page.getByRole('button', { name: 'Submit version 2', exact: true }).click();
  // The re-rendered page is the receipt: the current card shows the submitted version.
  await page.getByText('Version 2 · Bank •••• 6789 · SBIN0001234').first().waitFor();
  const afterSubmit = await destinations();
  check(
    'version 2 is current; version 1 kept as history',
    afterSubmit.current.version === 2 &&
      afterSubmit.history.find((d) => d.version === 1).state === 'superseded',
  );
  check(
    'the full account number is never returned',
    !JSON.stringify(afterSubmit).includes('001234567896789') &&
      !JSON.stringify(afterSubmit).includes('1234567896789'),
  );
  check(
    'a stale form is refused',
    (
      await owner.request.post(`${api}/partner/settings/payout`, {
        data: {
          method: 'upi',
          upiId: 'owner@ybl',
          holderName: 'Property Owner',
          expectedLatest: '1',
          mode: 'submit',
          requestKey: randomUUID(),
        },
      })
    ).status() === 409,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await scan('owner payout page mobile', page);
  const radio = page.getByRole('radio', { name: /UPI/ }).first();
  await radio.focus();
  check(
    'method choice keyboard focusable',
    await radio.evaluate((el) => el === document.activeElement),
  );
  await page.setViewportSize({ width: 1280, height: 950 });

  // Stale sign-in: the change becomes a draft; signing in again is offered, not a submit.
  const stalePage = await stale.newPage();
  stalePage.setDefaultTimeout(30000);
  await stalePage.goto(`${web}/partner/settings/payout`, { waitUntil: 'networkidle' });
  const staleForm = stalePage
    .locator('form')
    .filter({ has: stalePage.getByRole('button', { name: 'Preview change' }) });
  await staleForm.getByRole('radio', { name: /UPI/ }).check();
  await staleForm.getByLabel('UPI ID').fill('owner.new@okicici');
  await staleForm.getByLabel('Account holder name').fill('Property Owner');
  await staleForm.getByRole('button', { name: 'Preview change' }).click();
  await stalePage.getByText(/saved as a draft until you sign in again/).waitFor();
  await stalePage.getByRole('button', { name: 'Save as draft', exact: true }).click();
  await stalePage.getByRole('heading', { name: 'Draft waiting for confirmation' }).waitFor();
  check(
    'stale sign-in saves a draft and offers sign-in, not submit',
    (await stalePage.getByRole('button', { name: 'Sign in again to confirm' }).isVisible()) &&
      !(await stalePage.getByRole('button', { name: /Submit draft version/ }).count()),
  );
  check('current destination unchanged by the draft', (await destinations()).current.version === 2);
  await stalePage.getByRole('button', { name: 'Sign in again to confirm' }).click();
  await stalePage.waitForURL(/\/partner\/login\?session=reauth/);
  check(
    'sign-in again ends the session with a clear notice',
    await stalePage.getByText(/Sign in again to confirm your payout change/).isVisible(),
  );

  // A fresh sign-in submits the draft.
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Submit draft version 3' }).click();
  // The draft card itself shows version 3, so wait for it to leave instead.
  await page
    .getByRole('heading', { name: 'Draft waiting for confirmation' })
    .waitFor({ state: 'detached' });
  check('fresh sign-in submits the draft', (await destinations()).current.version === 3);

  // Admin: history with pinning; stale admin sign-in refused; fresh admin marks failed.
  const stalePanel = await adminStale.newPage();
  stalePanel.setDefaultTimeout(30000);
  await stalePanel.goto(`${web}/admin/clients/${clientId}?tab=payout`, {
    waitUntil: 'networkidle',
  });
  check(
    'admin sees every version with the pinned payout on version 1',
    (await stalePanel.getByText(/Version 1 ·/).count()) === 1 &&
      (await stalePanel.getByText(/open payouts pinned: 1/).count()) === 1,
  );
  check(
    'there is no verify control',
    (await stalePanel.getByRole('button', { name: /verif/i }).count()) === 0,
  );
  const staleFail = stalePanel
    .locator('details')
    .filter({ has: stalePanel.locator('summary', { hasText: 'Mark version 3 failed' }) });
  await staleFail.locator('summary').click();
  await staleFail
    .getByLabel('Reason (shown to the owner)')
    .fill('Bank returned the account as closed.');
  await staleFail.getByRole('button', { name: 'Preview impact' }).click();
  await staleFail.getByRole('status', { name: 'Failure impact preview' }).waitFor();
  await staleFail.getByRole('button', { name: 'Confirm: mark failed' }).click();
  await staleFail.getByRole('button', { name: 'Sign in again' }).waitFor();
  check(
    'stale admin sign-in cannot confirm the failure',
    (await destinations()).current?.state === 'submitted',
  );
  const panel = await admin.newPage();
  panel.setDefaultTimeout(30000);
  await panel.goto(`${web}/admin/clients/${clientId}?tab=payout`, { waitUntil: 'networkidle' });
  const fail = panel
    .locator('details')
    .filter({ has: panel.locator('summary', { hasText: 'Mark version 3 failed' }) });
  await fail.locator('summary').click();
  await fail.getByLabel('Reason (shown to the owner)').fill('Bank returned the account as closed.');
  await fail.getByRole('button', { name: 'Preview impact' }).click();
  await fail.getByRole('status', { name: 'Failure impact preview' }).waitFor();
  await panel.setViewportSize({ width: 390, height: 844 });
  await scan('admin payout tab mobile', panel);
  await panel.setViewportSize({ width: 1280, height: 950 });
  await fail.getByRole('button', { name: 'Confirm: mark failed' }).click();
  await panel.getByText(/Failed by .*: Bank returned the account as closed\./).waitFor();
  const failed = await destinations();
  check(
    'failure recorded with its reason; no current destination',
    failed.current === null &&
      failed.history[0].state === 'failed' &&
      failed.history[0].failureReason === 'Bank returned the account as closed.',
  );
  check('owners never see which admin decided', failed.history[0].decidedBy === undefined);

  // The owner gets the recovery path in their inbox and on the page.
  await page.goto(`${web}/partner/updates`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: /^Open\s*:\s*Payout destination failed review/ }).click();
  await page.waitForURL(/\/partner\/settings\/payout$/);
  check('inbox update opens the payout page', true);
  check(
    'page explains the failure and the recovery',
    (await page.getByText(/failed review\. Submit a new destination/).isVisible()) &&
      (await page.getByText('Reason: Bank returned the account as closed.').isVisible()),
  );

  await owner.request.post(`${api}/auth/logout`);
  check(
    'revocation blocks the next payout read',
    (await owner.request.get(`${api}/partner/settings/payout`)).status() === 401,
  );
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part21-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
