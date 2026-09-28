// CP31 production lab audit. Requires disposable quality fixture and Next :3106.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106';
const api = 'http://localhost:4106/api/v1';
const results = [],
  routes = [],
  measurements = [];
const check = (check, pass) => {
  results.push({ check, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${check}`);
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
let completed = false;
try {
  const contexts = {};
  for (const role of ['admin', 'owner', 'limited']) {
    contexts[role] = await browser.newContext({ reducedMotion: 'reduce' });
    await contexts[role].addCookies([
      {
        name: role === 'owner' ? 'rentra_session' : 'rentra_admin',
        value: f.tokens[role],
        url: web,
      },
    ]);
  }
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const cases = [
    ['admin', '/admin/clients'],
    ['admin', `/admin/clients/${f.ids.owner}`],
    ['admin', '/admin'],
    ['admin', `/admin/applications/${f.quality.application}`],
    ['admin', '/admin/properties'],
    ['admin', `/admin/properties/${f.ids.listing}`],
    ['admin', '/admin/bookings?tab=past'],
    ['admin', `/admin/bookings/${f.booking.order}`],
    ['admin', '/admin/finance/payments'],
    ['admin', '/admin/finance/payments/' + f.payments.paid.paymentOrderId],
    ['admin', '/admin/finance/refunds'],
    ['admin', '/admin/finance/refunds/' + f.quality.refund],
    ['admin', '/admin/finance/statements'],
    ['admin', '/admin/support'],
    ['admin', '/admin/privacy'],
    ['admin', '/admin/privacy/' + f.quality.privacy],
    ['admin', '/admin/audit'],
    ['admin', '/admin/security'],
    ['admin', '/admin/content/terms'],
    ['admin', '/admin/operations'],
    ['admin', '/admin/operations/incidents/payments_worker_unhealthy'],
    ['owner', '/partner/listings'],
    ['owner', `/partner/listings/${f.ids.listing}/overview`],
    ['owner', `/partner/listings/${f.ids.listing}/calendar`],
    ['owner', '/partner/bookings?tab=past'],
    ['owner', `/partner/bookings/${f.booking.order}`],
    ['owner', '/partner/finance'],
    ['owner', '/partner/support/new'],
    ['owner', '/partner/team'],
    ['owner', '/partner/updates'],
    ['admin', '/admin/help'],
    ['owner', '/partner/help'],
  ];
  // Resolve the payment-order ID through its authorized read model, not a guessed schema field.
  const payments = (await (await contexts.admin.request.get(api + '/admin/payments/orders')).json())
    .data;
  const paid = payments.items.find(
    (item) =>
      item.orderId === f.payments.paid.orderId || item.bookingOrderId === f.payments.paid.orderId,
  );
  const detailCase = cases.find((item) => item[1].includes('/finance/payments/'));
  detailCase[1] = '/admin/finance/payments/' + (paid?.id || payments.items[0].id);
  for (const [role, path] of cases) {
    const page = await contexts[role].newPage();
    for (const width of [1280, 360]) {
      await page.setViewportSize({ width, height: 950 });
      const started = performance.now();
      const response = await page.goto(web + path, { waitUntil: 'networkidle' });
      const readyMs = Math.round(performance.now() - started);
      const label = `${role} ${path.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/g, ':id')} ${width}px`;
      const structure = await page.evaluate(() => ({
        main: document.querySelectorAll('main').length,
        h1: document.querySelectorAll('main h1').length,
        title: document.title,
        overflow: document.documentElement.scrollWidth > innerWidth,
        unavailable: /This page could not load|Application error|Record not found|404:/.test(
          document.title + (document.querySelector('main')?.innerText || ''),
        ),
        tableRows: [...document.querySelectorAll('main table tbody')].map((t) => t.rows.length),
      }));
      check(
        `${label} successful meaningful render`,
        response.status() === 200 &&
          structure.main === 1 &&
          structure.h1 >= 1 &&
          !structure.unavailable,
      );
      check(`${label} no horizontal overflow`, !structure.overflow);
      check(`${label} lab ready below 4000ms`, readyMs < 4000);
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () =>
        (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(
          (v) => ({ id: v.id, impact: v.impact, targets: v.nodes.flatMap((n) => n.target) }),
        ),
      );
      check(
        `${label} no serious/critical accessibility violations`,
        !violations.some((v) => ['serious', 'critical'].includes(v.impact)),
      );
      const cdp = await contextSession(page);
      const ax = await cdp.send('Accessibility.getFullAXTree');
      check(
        `${label} accessibility tree exposes main and heading`,
        ax.nodes.some((n) => n.role?.value === 'main') &&
          ax.nodes.some((n) => n.role?.value === 'heading' && n.name?.value),
      );
      await cdp.detach();
      routes.push({
        role,
        path: path.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/g, ':id'),
        width,
        readyMs,
        structure,
        violations,
      });
    }
    await page.close();
  }
  for (const role of ['admin', 'owner']) {
    const p = await contexts[role].newPage();
    await p.setViewportSize({ width: 360, height: 950 });
    await p.goto(web + (role === 'admin' ? '/admin/clients' : '/partner/listings'), {
      waitUntil: 'networkidle',
    });
    const skip = p.getByRole('link', { name: 'Skip to main content', exact: true });
    check(`${role} skip link exists`, (await skip.count()) === 1);
    if (await skip.count()) {
      await p.keyboard.press('Tab');
      check(
        `${role} skip is first keyboard control`,
        await skip.evaluate((e) => e === document.activeElement),
      );
      await p.keyboard.press('Enter');
      check(
        `${role} skip moves focus to main`,
        await p.evaluate(() => document.activeElement.tagName === 'MAIN'),
      );
    }
    const menu = p.getByRole('button', { name: 'Open navigation', exact: true });
    await menu.focus();
    await p.keyboard.press('Enter');
    const dialog = p.getByRole('dialog');
    await dialog.waitFor();
    check(
      `${role} drawer focus enters dialog`,
      await dialog.evaluate((e) => e.contains(document.activeElement)),
    );
    for (let i = 0; i < 35; i++) await p.keyboard.press('Tab');
    check(
      `${role} drawer excludes background forward focus`,
      await dialog.evaluate(
        (e) => e.contains(document.activeElement) || document.activeElement === document.body,
      ),
    );
    for (let i = 0; i < 35; i++) await p.keyboard.press('Shift+Tab');
    check(
      `${role} drawer excludes background backward focus`,
      await dialog.evaluate(
        (e) => e.contains(document.activeElement) || document.activeElement === document.body,
      ),
    );
    check(
      `${role} drawer honors reduced motion`,
      await dialog.evaluate((e) =>
        getComputedStyle(e)
          .transitionDuration.split(',')
          .every((t) => parseFloat(t) <= 0.00001),
      ),
    );
    await p.keyboard.press('Escape');
    check(
      `${role} Escape closes drawer and restores trigger focus`,
      !(await dialog.isVisible()) && (await menu.evaluate((e) => e === document.activeElement)),
    );
    await menu.click();
    await p.setViewportSize({ width: 1280, height: 950 });
    await p.waitForTimeout(250);
    check(
      `${role} desktop resize releases modal`,
      await p.evaluate(() => !document.querySelector('dialog').open),
    );
    await p.close();
  }
  const forms = await contexts.admin.newPage();
  await forms.goto(web + '/admin/applications/' + f.quality.application + '?tab=decision', {
    waitUntil: 'domcontentloaded',
  });
  for (const [button, label] of [
    ['Approve', 'Approval note (optional)'],
    ['Need more info', 'Reason for requesting more information'],
    ['Reject', 'Reason for rejection'],
  ]) {
    await forms.getByRole('button', { name: button, exact: true }).click();
    check(
      `${button} reason has accessible label`,
      (await forms.getByLabel(label, { exact: true }).count()) === 1,
    );
    await forms.addScriptTag({ content: axe });
    const issues = await forms.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => v.id),
    );
    check(`${button} expanded form axe clear`, !issues.length);
    await forms.getByRole('button', { name: 'Cancel', exact: true }).click();
  }
  await forms.getByRole('button', { name: 'Need more info', exact: true }).click();
  await forms.getByLabel('Reason for requesting more information', { exact: true }).fill('x');
  await forms.getByLabel('Name / address', { exact: true }).check();
  await forms.getByRole('button', { name: 'Send back with questions', exact: true }).focus();
  await forms.keyboard.press('Enter');
  const summary = forms.getByRole('alert').filter({ hasText: 'Fix' });
  await summary.waitFor();
  check(
    'server validation summary receives focus',
    await summary.evaluate((e) => e === document.activeElement),
  );
  check(
    'failed decision preserves reason input',
    (await forms
      .getByLabel('Reason for requesting more information', { exact: true })
      .inputValue()) === 'x',
  );
  check(
    'failed decision preserves correction selection',
    await forms.getByLabel('Name / address', { exact: true }).isChecked(),
  );
  await summary.getByRole('button').last().click();
  check(
    'validation summary links to an invalid field',
    await forms.evaluate(() => ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)),
  );
  await forms.close();
  const keyboard = await contexts.admin.newPage();
  await keyboard.setViewportSize({ width: 360, height: 950 });
  await keyboard.goto(web + '/admin/operations', { waitUntil: 'networkidle' });
  const tableRegion = keyboard.getByRole('region', { name: 'Payment namespaces table' });
  await tableRegion.focus();
  await keyboard.keyboard.press('ArrowRight');
  await keyboard.waitForTimeout(250);
  check(
    'mobile financial table scrolls with keyboard',
    await tableRegion.evaluate((e) => e.scrollLeft > 0),
  );
  await keyboard.close();
  const denied = await contexts.limited.newPage();
  await denied.goto(web + '/admin/help', { waitUntil: 'networkidle' });
  check(
    'limited operator guide excludes financial links',
    (await denied.locator('main a[href="/admin/finance/refunds"]').count()) === 0,
  );
  check(
    'limited operator guide includes authorized booking link',
    (await denied.locator('main a[href="/admin/bookings"]').count()) === 1,
  );
  await denied.close();
  const states = await contexts.admin.newPage();
  await states.goto(web + '/admin/clients?q=CP31-NO-MATCH', { waitUntil: 'domcontentloaded' });
  await states
    .getByRole('heading', { name: 'No clients match this search', exact: true })
    .waitFor();
  const empty = (
    await (await contexts.admin.request.get(api + '/admin/clients?q=CP31-NO-MATCH')).json()
  ).data;
  check(
    'empty client view has authoritative zero count',
    empty.total === 0 && empty.items.length === 0,
  );
  check(
    'empty client view offers filter recovery',
    /No clients match|No clients found|No matching clients/.test(
      await states.locator('main').innerText(),
    ) && (await states.getByRole('button', { name: 'Search', exact: true }).count()) === 1,
  );
  await states.close();
  const loading = await contexts.admin.newPage();
  try {
    await fetch(
      'http://localhost:4106/__fault/set?re=' +
        encodeURIComponent('/api/v1/admin/records') +
        '&mode=delay&ms=2000',
    );
    await loading.goto(web + '/admin/bookings?tab=past', { waitUntil: 'commit' });
    const status = loading.getByRole('status', { name: 'Loading admin bookings', exact: true });
    await status.waitFor();
    check('slow record list exposes named loading status', await status.isVisible());
    await loading.getByRole('heading', { name: 'Booking records', exact: true }).waitFor();
    check(
      'loading resolves to authoritative list',
      await loading
        .locator('main')
        .innerText()
        .then((text) => text.includes('CP31-ORDER-')),
    );
  } finally {
    await fetch('http://localhost:4106/__fault/set');
    await loading.close();
  }
  // Authenticated API lab: one warm-up + 12 sequential samples per bounded endpoint.
  const endpoints = [
    ['admin', '/admin/clients?page=1', 20],
    ['admin', '/admin/clients?page=40', 20],
    ['admin', '/admin/records?tab=past&page=1', 20],
    ['owner', '/partner/records?tab=past&page=50', 20],
    ['admin', '/admin/audit/events?entity=rentable&action=cp31_fixture_event&page=100', 25],
    ['admin', '/admin/clients/' + f.ids.owner, null],
    ['owner', '/partner/records/' + f.booking.order, null],
  ];
  for (const [role, path, limit] of endpoints) {
    const samples = [];
    let data, bytes;
    for (let i = 0; i < 13; i++) {
      const started = performance.now();
      const response = await contexts[role].request.get(api + path);
      const body = await response.body();
      if (response.status() !== 200)
        throw new Error(`API lab failed: ${path} ${response.status()}`);
      data = JSON.parse(body).data;
      bytes = body.length;
      if (i) samples.push(Math.round((performance.now() - started) * 100) / 100);
    }
    const sorted = [...samples].sort((a, b) => a - b);
    const p95Ms = sorted[Math.ceil(sorted.length * 0.95) - 1];
    check(`${role} ${path.split('?')[0]} lab p95 below 1000ms`, p95Ms < 1000);
    if (limit)
      check(
        `${role} ${path} bounded populated page`,
        data.items.length > 0 && data.items.length <= limit && data.page > 0,
      );
    measurements.push({
      role,
      path: path.replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/g, ':id'),
      samplesMs: samples,
      p95Ms,
      responseBytes: bytes,
      items: data.items?.length,
      total: data.total,
      page: data.page,
      pages: data.pages,
    });
  }
  completed = results.every((r) => r.pass);
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part31-gate.json', import.meta.url),
    JSON.stringify(
      {
        completed,
        environment: 'Local production Next + disposable PostgreSQL; no network/CPU throttling',
        dataVolume: f.quality.counts,
        screenReaderEvidence:
          'Chromium accessibility tree only; no human speech-output certification',
        results,
        routes,
        measurements,
      },
      null,
      2,
    ) + '\n',
  );
}
if (!completed) process.exitCode = 1;
async function contextSession(page) {
  return page.context().newCDPSession(page);
}
