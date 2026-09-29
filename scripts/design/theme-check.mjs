// Uses only an explicitly supplied local disposable fixture. Never writes customer data.
// GATE_TOKENS=/tmp/rentra-theme-fixture.json THEME_ORIGIN=http://localhost:3196 node scripts/design/theme-check.mjs
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const origin = process.env.THEME_ORIGIN || 'http://localhost:3196';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Local fixture required');
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const database = new URL(fixture.databaseUrl);
if (
  !['localhost', '127.0.0.1'].includes(database.hostname) ||
  !database.pathname.startsWith('/rentra_test_')
)
  throw new Error('Disposable database required');
const axe = await readFile(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const results = [];
const cases = [
  ['public', '/'],
  ['public', '/search'],
  ['public', `/listing/${fixture.submission.slug}-${fixture.submission.publicCode}`],
  ['public', '/saved'],
  ['public', '/help'],
  ['public', '/policies/terms'],
  ['public', '/login'],
  ['public', '/partner/login'],
  ['public', '/admin/login'],
  ['public', '/staff/login'],
  ['customer', '/account'],
  ['customer', '/bookings'],
  ['customer', `/bookings/${fixture.booking.order}`],
  ['customer', '/support/new'],
  ['owner', '/partner'],
  ['owner', '/partner/listings'],
  ['owner', `/partner/listings/${fixture.ids.listing}/overview`],
  ['owner', `/partner/listings/${fixture.ids.listing}/calendar`],
  ['owner', '/partner/listings/new'],
  ['owner', '/partner/team'],
  ['owner', '/partner/settings'],
  ['admin', '/admin'],
  ['admin', '/admin/properties'],
  ['admin', `/admin/properties/${fixture.ids.listing}`],
  ['admin', '/admin/clients'],
  ['admin', '/admin/content'],
  ['admin', '/admin/content/terms'],
  ['admin', '/admin/finance/payments'],
  ['admin', '/admin/support'],
  ['admin', '/admin/security'],
  ['staff', '/staff'],
  ['staff', `/staff/visits/${fixture.booking.order}`],
];
const reflowPaths = [
  '/',
  '/search',
  '/login',
  '/account',
  '/bookings',
  '/partner/listings',
  '/partner/listings/new',
  '/admin/content',
  '/staff',
];
const safePath = (path) => path.replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/g, ':id');
try {
  for (const role of ['public', 'customer', 'owner', 'admin', 'staff']) {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    if (role !== 'public')
      await context.addCookies([
        {
          name:
            role === 'admin'
              ? 'rentra_admin'
              : role === 'staff'
                ? 'rentra_staff'
                : 'rentra_session',
          value: fixture.tokens[role],
          url: origin,
        },
      ]);
    const page = await context.newPage();
    for (const [, path] of cases.filter(([r]) => r === role)) {
      const widths = reflowPaths.includes(path) ? [320, 390, 768, 1024, 1440, 1920] : [390, 1440];
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        try {
          const response = await page.goto(origin + path, {
            waitUntil: 'domcontentloaded',
            timeout: 120000,
          });
          await page.locator('main h1').first().waitFor({ timeout: 30000 });
          await page.evaluate(() => document.fonts.ready);
          await page.addScriptTag({ content: axe });
          const state = await Promise.race([
            page.evaluate(async () => ({
              path: location.pathname,
              overflow: document.documentElement.scrollWidth > innerWidth,
              hasHeading: Boolean(document.querySelector('main h1')),
              mainCount: document.querySelectorAll('main').length,
              error: /Application error|This page could not load/.test(document.body.innerText),
              smallInputs: [
                ...document.querySelectorAll(
                  'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea',
                ),
              ].filter(
                (e) =>
                  e.getBoundingClientRect().width &&
                  innerWidth < 768 &&
                  parseFloat(getComputedStyle(e).fontSize) < 16,
              ).length,
              violations: (
                await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })
              ).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
            })),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Accessibility scan timed out')), 30000),
            ),
          ]);
          const pass =
            response.status() === 200 &&
            state.path === path &&
            !state.overflow &&
            state.hasHeading &&
            state.mainCount === 1 &&
            !state.error &&
            !state.smallInputs &&
            !state.violations.length;
          results.push({
            role,
            width,
            status: response.status(),
            ...state,
            path: safePath(path),
            actualPath: safePath(state.path),
            pass,
          });
          console.log(
            `${pass ? 'PASS' : 'FAIL'} ${role} ${safePath(path)} ${width}px${pass ? '' : ' ' + JSON.stringify(state)}`,
          );
        } catch (error) {
          results.push({ role, path: safePath(path), width, pass: false, error: error.message });
          console.log(`FAIL ${role} ${safePath(path)} ${width}px: ${error.message}`);
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(
    process.env.THEME_REPORT || 'docs/rentra-emerald-champagne-browser-results.json',
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        browser: 'Chromium',
        fixture: 'Disposable published property, confirmed booking and caretaker',
        results,
      },
      null,
      2,
    ) + '\n',
  );
}
if (results.some((result) => !result.pass)) process.exitCode = 1;
