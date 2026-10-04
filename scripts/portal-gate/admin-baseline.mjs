import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
assert.ok(process.env.PLAYWRIGHT_MODULE, 'Set PLAYWRIGHT_MODULE');
const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
import { currentTotp } from '../../../rentra-backend/src/services/auth/admin-crypto.js';
const root = process.env.ADMIN_BASELINE_EVIDENCE_DIR;
assert.ok(root, 'Set ADMIN_BASELINE_EVIDENCE_DIR');
assert.ok(process.env.ADMIN_BASELINE_FIXTURE, 'Set ADMIN_BASELINE_FIXTURE');
const f = JSON.parse(await readFile(process.env.ADMIN_BASELINE_FIXTURE, 'utf8'));
assert.match(new URL(f.databaseUrl).pathname, /^\/rentra_test_/);
assert.ok(['localhost', '127.0.0.1'].includes(new URL(f.databaseUrl).hostname));
const origin = process.env.GATE_WEB_ORIGIN || 'http://127.0.0.1:3161',
  api = process.env.GATE_API_ORIGIN || 'http://127.0.0.1:4161/api/v1';
for (const value of [origin, api])
  assert.ok(['localhost', '127.0.0.1'].includes(new URL(value).hostname), 'Local origins required');
await mkdir(root, { recursive: true });
const axe = await readFile(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const results = {
  scope: 'Disposable local fixture only; captured existing behavior, not release approval',
  screens: [],
  checks: [],
  errors: [],
};
const roles = process.env.ADMIN_BASELINE_ROLES?.split(',') || [
  'full',
  'readonly',
  'restricted',
  'customerReader',
];
assert.ok(
  roles.every((role) => ['full', 'readonly', 'restricted', 'customerReader'].includes(role)),
  'Choose supported baseline roles',
);
const main = [
  '/admin',
  '/admin/help',
  '/admin/content',
  '/admin/catalogues',
  '/admin/properties',
  '/admin/clients',
  '/admin/customers',
  '/admin/bookings',
  '/admin/booking-cases',
  '/admin/support',
  '/admin/reviews',
  '/admin/disputes',
  '/admin/finance/statements',
  '/admin/finance/payouts',
  '/admin/finance/payments',
  '/admin/finance/refunds',
  '/admin/payments',
  '/admin/audit',
  '/admin/security',
  '/admin/privacy',
  '/admin/operations',
  '/admin/notifications',
  '/admin/search?q=Owner',
];
const details = [
  `/admin/applications/${f.application}`,
  `/admin/properties/${f.ids.listing}`,
  `/admin/bookings/${f.booking.order}`,
  `/admin/clients/${f.ids.owner}`,
  `/admin/customers/${f.booking.customer}`,
  `/admin/support/${f.support}`,
  `/admin/security/${f.ids.admin}`,
];
async function check(name, run) {
  try {
    await run();
    results.checks.push({ name, pass: true });
    console.log('PASS', name);
  } catch (e) {
    results.checks.push({ name, pass: false, error: e.message });
    console.log('FAIL', name, e.message);
  }
  await writeFile(root + '/browser-checks.json', JSON.stringify(results, null, 2) + '\n');
}
try {
  for (const role of roles) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route('**/*', (route) => {
      const u = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(u.hostname) ? route.continue() : route.abort();
    });
    await context.addCookies([{ name: 'rentra_admin', value: f.tokens[role], url: origin }]);
    const page = await context.newPage();
    page.setDefaultTimeout(20000);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const routes =
      role === 'full'
        ? [...main, ...details]
        : role === 'readonly'
          ? [
              '/admin',
              '/admin/properties',
              `/admin/applications/${f.application}?tab=decision`,
              '/admin/finance/refunds',
              '/admin/security',
            ]
          : role === 'restricted'
            ? ['/admin/bookings', `/admin/bookings/${f.booking.order}`, '/admin/support', '/admin']
            : ['/admin/customers', '/admin/search?q=Guest', '/admin'];
    for (const width of [360, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      for (let i = 0; i < routes.length; i++) {
        const route = routes[i];
        const before = errors.length;
        try {
          const response = await page.goto(origin + route, {
            waitUntil: 'networkidle',
            timeout: 60000,
          });
          await page.addScriptTag({ content: axe });
          const audit = await page.evaluate(async () => ({
            heading:
              document.querySelector('main h1')?.textContent ||
              document.querySelector('h1')?.textContent ||
              null,
            overflow: document.documentElement.scrollWidth > innerWidth,
            violations: (
              await axe.run(document, {
                runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
              })
            ).violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              targets: v.nodes.map((n) => n.target),
            })),
            nav: [...document.querySelectorAll('nav[aria-label="Admin navigation"] a')]
              .filter((a) => a.getClientRects().length)
              .map((a) => ({ text: a.textContent.trim(), href: a.getAttribute('href') })),
          }));
          const name = `${role}-${width}-${String(i + 1).padStart(2, '0')}.png`;
          await page.screenshot({ path: root + '/' + name, fullPage: true });
          results.screens.push({
            role,
            width,
            route,
            status: response.status(),
            ...audit,
            errors: errors.slice(before),
            screenshot: name,
          });
          console.log(
            'SCREEN',
            role,
            width,
            route,
            audit.heading,
            audit.overflow ? 'OVERFLOW' : '',
            audit.violations.length + ' axe',
          );
        } catch (e) {
          results.screens.push({
            role,
            width,
            route,
            error: e.message,
            errors: errors.slice(before),
          });
          console.log('SCREEN ERROR', role, width, route, e.message);
        }
        await writeFile(root + '/browser-checks.json', JSON.stringify(results, null, 2) + '\n');
      }
    }
    if (role === 'restricted') {
      await check('restricted records reader sidebar excludes finance/support/people', async () => {
        await page.goto(origin + '/admin/bookings');
        const links = await page
          .locator('nav[aria-label="Admin navigation"] a')
          .evaluateAll((nodes) => [...new Set(nodes.map((n) => n.getAttribute('href')))]);
        assert.deepEqual(
          links.sort(),
          ['/admin/booking-cases', '/admin/bookings', '/admin/help'].sort(),
        );
      });
    }
    if (role === 'full') {
      await check('booking detail retains tabs and filtered return context', async () => {
        await page.goto(
          origin +
            `/admin/bookings/${f.booking.order}?from=${encodeURIComponent('/admin/bookings?tab=upcoming&q=ORD')}`,
        );
        assert.ok(
          (await page.locator('a').evaluateAll((ns) => ns.map((n) => n.getAttribute('href')))).some(
            (x) => x === '/admin/bookings?tab=upcoming&q=ORD',
          ),
        );
        for (const tab of ['visits', 'payments', 'guest', 'cases', 'records']) {
          await page.goto(origin + `/admin/bookings/${f.booking.order}?tab=${tab}`);
          assert.equal(
            await page.getByRole('heading', { name: 'Record not found', exact: true }).count(),
            0,
          );
        }
      });
      await check('application tabs retain old queue context', async () => {
        for (const tab of ['overview', 'documents', 'decision', 'history']) {
          await page.goto(
            origin +
              `/admin/applications/${f.application}?tab=${tab}&from=${encodeURIComponent('/admin?status=submitted&assignee=unassigned')}`,
          );
          assert.ok(
            (
              await page.locator('a').evaluateAll((ns) => ns.map((n) => n.getAttribute('href')))
            ).some((x) => x === '/admin?status=submitted&assignee=unassigned'),
          );
        }
      });
    }
    const domains = [
      'content',
      'security',
      'catalogues/cities',
      'applications',
      'properties',
      'clients',
      'customers',
      'users/' + f.ids.owner + '/documents',
      'payments/orders',
      'records',
      'reviews',
      'support',
      'notifications',
      'privacy/requests',
      'audit/events',
      'operations',
    ];
    if (role === 'restricted')
      for (const path of domains.filter((x) => x !== 'records'))
        await check('restricted API denies GET ' + path, async () => {
          const r = await context.request.get(api + '/admin/' + path);
          assert.equal(r.status(), 403);
        });
    if (role === 'readonly')
      for (const path of [
        'content/owner_help',
        'security',
        'catalogues/cities/' + f.ids.listing,
        'applications/approve',
        'properties/' + f.ids.listing + '/decision',
        'clients/' + f.ids.owner + '/suspend',
        'customers/' + f.booking.customer + '/restrict',
        'documents/review',
        'payments/orders/reconcile',
        'records/cases',
        'reviews/moderate',
        'support/' + f.support + '/reply',
        'notifications/manage',
        'privacy/requests/' + f.ids.listing,
        'audit/exports',
        'operations/incidents/fixture',
      ])
        await check('read-only API denies POST ' + path, async () => {
          const r = await context.request.post(api + '/admin/' + path, { data: {} });
          assert.equal(r.status(), 403);
        });
    await context.close();
  }
  const anonymous = await browser.newContext();
  const page = await anonymous.newPage();
  for (const width of [360, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(origin + '/admin/login');
    await page.screenshot({ path: root + `/login-${width}.png`, fullPage: true });
  }
  await check('unsigned admin API returns 401', async () =>
    assert.equal((await anonymous.request.get(api + '/admin/records')).status(), 401),
  );
  await check('2FA requires a code and valid TOTP signs in', async () => {
    let r = await anonymous.request.post(api + '/admin/auth/login', {
      form: { email: f.totp.email, password: f.password, totp: '' },
    });
    const data = await r.json();
    assert.ok(
      !data.success || data.errors || data.data?.errors || r.status() >= 400,
      'missing TOTP must fail',
    );
    r = await anonymous.request.post(api + '/admin/auth/login', {
      form: { email: f.totp.email, password: f.password, totp: currentTotp(f.totp.secret) },
    });
    assert.equal(r.status(), 200);
    assert.ok((await anonymous.cookies()).some((x) => x.name === 'rentra_admin'));
  });
  await anonymous.close();
} finally {
  await browser.close();
  await writeFile(root + '/browser-checks.json', JSON.stringify(results, null, 2) + '\n');
  console.log('Recorded', results.screens.length, 'screens and', results.checks.length, 'checks');
}

if (results.checks.some((x) => !x.pass) || results.screens.some((x) => x.error))
  process.exitCode = 1;
