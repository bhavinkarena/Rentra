// CP19 failure paths. Phase "partial": the fixture runs on 4206 (port-remap.mjs preload) behind
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
const out = new URL('../../docs/rentra-client-admin-part19-outage-gate.json', import.meta.url);
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addCookies([{ name: 'rentra_admin', value: fixture.tokens.admin, url: web }]);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const { paid, unknown } = fixture.payments;
  const pages = [
    [
      'list',
      '/admin/finance/payments?environment=all&attention=needs_review',
      'environment=all',
      () => page.getByRole('region', { name: 'Totals by environment' }),
    ],
    [
      'detail',
      `/admin/finance/payments/${paid.paymentOrderId}`,
      paid.paymentOrderId,
      () => page.getByRole('heading', { name: 'Money' }),
    ],
  ];
  if (phase === 'partial') {
    for (const [label, path, kept, loaded] of pages) {
      await fault('/admin/payments/orders');
      await page.goto(web + path, { waitUntil: 'networkidle' });
      const retry = page.getByRole('button', { name: 'Try again', exact: true });
      check(
        `Payments API outage ${label}: retryable state, context kept`,
        (await page.getByRole('heading', { name: 'This page could not load' }).isVisible()) &&
          (await retry.isVisible()) &&
          page.url().includes(kept) &&
          !(await page
            .getByRole('heading', { name: /No payments match|Record not found/ })
            .count()),
      );
      await fault(null);
      await retry.click();
      await loaded().waitFor();
      check(`Payments API outage ${label}: Try again recovers in place`, page.url().includes(kept));
    }
    // Each click waits for its own server-action response; an earlier alert must not satisfy the wait.
    const submit = () =>
      Promise.all([
        page.waitForResponse(
          (r) => r.request().method() === 'POST' && r.url().includes('/admin/finance/payments/'),
        ),
        page.getByRole('button', { name: 'Re-fetch from provider' }).click(),
      ]);
    // A failed re-fetch changes nothing and says so; a lost response after commit replays on retry.
    await page.goto(`${web}/admin/finance/payments/${unknown.paymentOrderId}`, {
      waitUntil: 'networkidle',
    });
    await fault('/admin/payments/orders/reconcile');
    await submit();
    await page.getByRole('alert').filter({ hasText: 'Submitting again is safe' }).waitFor();
    const state = async () =>
      (
        await (
          await context.request.get(`${api}/admin/payments/orders/${unknown.paymentOrderId}`)
        ).json()
      ).data;
    check(
      'Re-fetch during outage: honest retry message, nothing recorded',
      (await state()).reconciliations.length === 0,
    );
    await fault('/admin/payments/orders/reconcile', 'drop');
    await submit();
    await page.getByRole('alert').filter({ hasText: 'Submitting again is safe' }).waitFor();
    check(
      'Lost re-fetch response: the request did reach the provider once',
      (await state()).reconciliations.length === 1,
    );
    await fault(null);
    await submit();
    await page.getByText(/repeat of an earlier request/).waitFor();
    const after = await state();
    check(
      'Retry with the same form replays: still one audited re-fetch, still pending',
      after.reconciliations.length === 1 && after.state !== 'succeeded',
    );
  } else {
    for (const [label, path, kept] of pages) {
      await page.goto(web + path, { waitUntil: 'networkidle' });
      check(
        `Full API outage ${label}: retryable, no false empty or login`,
        (await page
          .getByRole('button', { name: /^(Try again|Reload)$/ })
          .first()
          .isVisible()) &&
          page.url().includes(kept) &&
          !/login/.test(page.url()) &&
          !(await page
            .getByRole('heading', { name: /No payments match|Record not found/ })
            .count()),
      );
    }
  }
} finally {
  await browser.close();
  await writeFile(out, JSON.stringify({ results }, null, 2) + '\n');
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
