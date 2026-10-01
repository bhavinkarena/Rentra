// Render the actual server-safe skeleton/primitive components with the application's compiled CSS.
import { readFile, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../', import.meta.url));
const require = createRequire(new URL('../../package.json', import.meta.url));
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const origin = process.env.THEME_ORIGIN || 'http://localhost:3196';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Local server required');
const cache = new Map();
function component(file) {
  if (!path.extname(file)) file = ['.jsx', '.js'].map((ext) => file + ext).find(existsSync);
  if (cache.has(file)) return cache.get(file);
  const loadedModule = { exports: {} };
  const localRequire = (id) =>
    id.startsWith('@/')
      ? component(path.join(root, id.slice(2)))
      : id.startsWith('.')
        ? component(path.resolve(path.dirname(file), id))
        : require(id);
  const code = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  new Function('require', 'module', 'exports', code)(
    localRequire,
    loadedModule,
    loadedModule.exports,
  );
  cache.set(file, loadedModule.exports);
  return loadedModule.exports;
}
const Screen = component(path.join(root, 'components/loading/ScreenSkeleton.jsx')).default;
const Partner = component(path.join(root, 'components/partner/PartnerLoading.jsx'));
const { Button } = component(path.join(root, 'components/ui/button.jsx'));
const { Field } = component(path.join(root, 'components/ui/field.jsx'));
const { Input } = component(path.join(root, 'components/ui/input.jsx'));
const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass: Boolean(pass), ...(detail ? { detail } : {}) });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};
const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.locator('main h1').waitFor();
  const sheets = await page
    .locator('link[rel=stylesheet]')
    .evaluateAll((links) => links.map((link) => link.href));
  const render = async (element) => {
    await page.setContent(
      `<html lang="en"><head><title>Rentra component check</title>${sheets.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body>${renderToStaticMarkup(element)}</body></html>`,
      { waitUntil: 'load' },
    );
  };
  const screens = [
    'home',
    'search',
    'saved',
    'listing',
    'bookings',
    'booking-detail',
    'checkout',
    'dashboard',
    'people',
    'finance',
    'payments',
    'table',
    'content',
    'content-editor',
    'profile',
    'account',
    'calendar',
    'updates',
    'reviews',
    'review-detail',
    'support',
    'thread',
    'team',
    'help',
    'document',
    'auth',
    'login',
    'upload',
    'consent',
    'success',
    'form',
  ];
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const screen of screens) {
      await render(React.createElement(Screen, { screen }));
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        statuses: document.querySelectorAll('[role=status]').length,
        bars: document.querySelectorAll('.rentra-skeleton').length,
        motion: [...document.querySelectorAll('.rentra-skeleton')].some(
          (e) => getComputedStyle(e, '::after').animationName !== 'none',
        ),
        pulse: [...document.querySelectorAll('[class]')].some((e) =>
          String(e.className).includes('animate-pulse'),
        ),
      }));
      check(
        `${screen} ${width}px: reflow, single status, static reduced motion`,
        !state.overflow && state.statuses === 1 && state.bars > 0 && !state.motion && !state.pulse,
        state,
      );
    }
    for (const name of [
      'DashboardSkeleton',
      'PropertiesSkeleton',
      'SettingsSkeleton',
      'EditorSkeleton',
      'WizardSkeleton',
    ]) {
      await render(React.createElement(Partner[name]));
      const state = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        statuses: document.querySelectorAll('[role=status]').length,
      }));
      check(
        `${name} ${width}px: reflow and single status`,
        !state.overflow && state.statuses === 1,
        state,
      );
    }
  }
  await render(
    React.createElement(
      'main',
      { className: 'p-6 space-y-5' },
      React.createElement('h1', null, 'Controls'),
      ...['default', 'outline', 'secondary', 'ghost', 'destructive', 'danger-solid', 'link'].map(
        (variant) => React.createElement(Button, { variant, key: variant }, variant),
      ),
      React.createElement(
        'div',
        { 'data-surface': 'inverse', className: 'bg-sidebar p-5' },
        React.createElement(Button, { variant: 'inverse' }, 'Inverse action'),
      ),
      React.createElement(Button, { disabled: true }, 'Disabled action'),
      React.createElement(
        Field,
        { id: 'name', label: 'Name', error: 'Enter your name' },
        React.createElement(Input, { id: 'name', name: 'name' }),
      ),
    ),
  );
  await page.addScriptTag({
    content: await readFile(
      new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
      'utf8',
    ),
  });
  const violations = await page.evaluate(async () =>
    (
      await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })
    ).violations.map((v) => v.id),
  );
  check('Button variants and field errors pass axe', !violations.length, violations);
  check(
    'Field error is associated with its input',
    (await page.locator('#name').getAttribute('aria-describedby')) === 'name-feedback' &&
      (await page.locator('#name').getAttribute('aria-invalid')) === 'true',
  );
  await page.setViewportSize({ width: 390, height: 900 });
  check(
    'Shared field uses 16px mobile text',
    (await page.locator('#name').evaluate((e) => getComputedStyle(e).fontSize)) === '16px',
  );
  await render(React.createElement(Screen, { screen: 'bookings' }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  check(
    'Skeleton animation ends after two transform sweeps',
    (await page
      .locator('.rentra-skeleton')
      .first()
      .evaluate((e) => getComputedStyle(e, '::after').animationIterationCount)) === '2',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  check(
    'Skeleton sheen is removed in forced colors',
    (await page
      .locator('.rentra-skeleton')
      .first()
      .evaluate((e) => getComputedStyle(e, '::after').display)) === 'none',
  );
} finally {
  await browser.close();
  await writeFile(
    'docs/rentra-emerald-champagne-component-results.json',
    JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2) + '\n',
  );
}
if (results.some((result) => !result.pass)) process.exitCode = 1;
