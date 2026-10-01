// CP33 vertical tabs and the Entertainment home (entertainment plan, Phase 6).
// Same disposable stack as cp32 (API :4106 on 127.0.0.1:55432/rentra_cp02), with the web app
// as a production build (`next build` + `next start -p 3106`) so ISR caching is real.
//   GATE_MODE=two    (default) Farmhouse and Entertainment public: tabs, homes, docking, axe.
//   GATE_MODE=single Entertainment not public: no tabs anywhere, /entertainment is a 404.
// Env: GATE_WEB, GATE_OUT (screenshots), PLAYWRIGHT_MODULE, CHROME.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const web = process.env.GATE_WEB || 'http://localhost:3106';
const mode = process.env.GATE_MODE || 'two';
const out = process.env.GATE_OUT || null;
if (out) await mkdir(out, { recursive: true });
const axe = await readFile(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const results = [];
const check = (name, pass, detail = '') => {
  results.push({ check: name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${pass || !detail ? '' : ` — ${detail}`}`);
};
const overlap = (a, b) =>
  a &&
  b &&
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height;

async function audit(page, name) {
  for (const [width, height] of [
    [1440, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(200);
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      });
      return r.violations.map((v) => `${v.id}(${v.nodes.length})`);
    });
    check(`${name} @${width} axe 0`, violations.length === 0, violations.join(' '));
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    check(`${name} @${width} no horizontal overflow`, overflow <= 0, `${overflow}px`);
    if (out)
      await page.screenshot({
        path: `${out}/${name}-${width}.png`,
        fullPage: true,
        caret: 'initial',
      });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
}

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || undefined,
});
const consoleErrors = [];
try {
  const context = await browser.newContext({
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  page.on(
    'console',
    (m) => m.type() === 'error' && consoleErrors.push(`${page.url()}: ${m.text().slice(0, 160)}`),
  );
  const header = page.locator('[data-site-header]');
  const headerTabs = header.getByRole('navigation', { name: 'Categories' });
  const tab = (scope, name) => scope.getByRole('link', { name, exact: true });
  const current = async (scope) =>
    scope.locator('a[aria-current="page"]').first().textContent({ timeout: 5000 });

  if (mode === 'single') {
    for (const path of ['/', '/search', '/surat/farmhouse']) {
      await page.goto(`${web}${path}`);
      check(
        `${path}: no tabs with one public vertical`,
        (await page.getByRole('navigation', { name: 'Categories' }).count()) === 0,
      );
    }
    // The (marketing) loading boundary streams first, so this is Next's soft 404:
    // HTTP 200 carrying the not-found page and a noindex tag (docs: loading.js, Status Codes).
    const res = await fetch(`${web}/entertainment`);
    const html = await res.text();
    check(
      '/entertainment is not found (noindex) until the vertical is public',
      res.status === 404 ||
        (html.includes('NEXT_HTTP_ERROR_FALLBACK;404') &&
          /<meta name="robots" content="noindex/.test(html)),
      String(res.status),
    );
  } else {
    // Header tabs on the farmhouse home, and a soft switch to the Entertainment home.
    await page.goto(`${web}/`);
    check('header tabs on /', (await headerTabs.getByRole('link').count()) === 2);
    check('Farmhouse is current on /', (await current(headerTabs))?.trim() === 'Farmhouse');
    for (const width of [768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const box = await headerTabs.boundingBox();
      const links = await header.locator('a[href="/partner/login"]').boundingBox();
      check(
        `@${width} tabs clear of logo and navigation`,
        box &&
          !overlap(box, await header.getByRole('link', { name: 'Rentra home' }).boundingBox()) &&
          !overlap(box, links),
      );
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => (window.__softNavigation = true));
    await tab(headerTabs, 'Entertainment').click();
    await page.waitForURL(/\/entertainment$/);
    await page
      .getByRole('heading', { level: 1, name: 'Book a court, lane or game in minutes.' })
      .waitFor();
    check(
      'switching tabs is a soft navigation',
      await page.evaluate(() => window.__softNavigation === true),
    );
    check(
      'Entertainment is current on /entertainment',
      (await current(headerTabs))?.trim() === 'Entertainment',
    );
    const search = page
      .getByRole('search', { name: 'Find a venue' })
      .or(page.locator('form[aria-label="Find a venue"]'));
    for (const field of ['Where', 'What', 'When', 'Time'])
      check(
        `entertainment search has ${field}`,
        (await search.getByText(field, { exact: true }).count()) > 0,
      );
    check(
      'entertainment search submits "Find venues"',
      await search.getByRole('button', { name: 'Find venues' }).isVisible(),
    );

    // The venue search: What → When → Time, then the URL carries only entertainment parameters.
    await search.locator('[data-search-field="activity"]').click();
    await page
      .getByRole('dialog', { name: 'What' })
      .getByRole('button', { name: 'Box cricket' })
      .click();
    await page
      .getByRole('dialog', { name: 'When' })
      .getByRole('button', { name: 'Tomorrow' })
      .click();
    const time = page.getByRole('dialog', { name: 'Time' });
    await time.getByRole('button', { name: /^Evening/ }).click();
    await time.getByRole('button', { name: 'Longer' }).click();
    await time.getByRole('button', { name: 'Done' }).click();
    await search.getByRole('button', { name: 'Find venues' }).click();
    await page.waitForURL(/\/search\?/);
    const query = new URL(page.url()).searchParams;
    const tomorrow = new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);
    check(
      'venue search submits vertical, activity, date, start and duration',
      query.get('vertical') === 'entertainment' &&
        query.get('category') === 'box-cricket' &&
        query.get('date') === tomorrow &&
        query.get('start') === '17:00' &&
        query.get('duration') === '90' &&
        !query.has('slot') &&
        !query.has('guests'),
      page.url(),
    );
    await page.goto(`${web}/entertainment`);

    // Docked: the tabs fade out and stop taking clicks; the pill takes the centre.
    for (const width of [768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-search-docked'));
      await page.waitForTimeout(300);
      const slot = await headerTabs.evaluate((el) => {
        const s = getComputedStyle(el.parentElement);
        return { opacity: s.opacity, events: s.pointerEvents };
      });
      check(
        `@${width} docked: tabs hidden and inert`,
        slot.opacity === '0' && slot.events === 'none',
        JSON.stringify(slot),
      );
      const pill = header.getByRole('group', { name: 'Search' });
      check(`@${width} docked: pill visible`, await pill.isVisible());
      check(
        `@${width} docked: pill clear of navigation`,
        !overlap(
          await pill.boundingBox(),
          await header
            .locator('a[href="/partner/login"]')
            .boundingBox()
            .catch(() => null),
        ),
      );
      if (width === 1440) {
        check(
          'docked pill names the venue search',
          (await pill.getByRole('button', { name: /^What: / }).count()) === 1,
        );
        if (out)
          await page.screenshot({
            path: `${out}/header-docked-entertainment-${width}.png`,
            caret: 'initial',
          });
        await pill.getByRole('button', { name: /^What: / }).click();
        check(
          'docked pill opens the venue search on What',
          await page.getByRole('dialog', { name: 'What' }).isVisible({ timeout: 5000 }),
        );
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(
        () => !document.documentElement.hasAttribute('data-search-docked'),
      );
    }
    await page.setViewportSize({ width: 1440, height: 900 });

    // Discovery pages: the active tab follows the search; switching keeps the city.
    await page.goto(`${web}/search?vertical=entertainment&city=surat&slot=night&guests=4`);
    check(
      '/search?vertical=entertainment: Entertainment current',
      (await current(headerTabs))?.trim() === 'Entertainment',
    );
    check(
      '/search tab switch keeps the city, drops the other vertical',
      (await tab(headerTabs, 'Farmhouse').getAttribute('href')) === '/search?city=surat',
    );
    for (const [path, name] of [
      ['/surat/box-cricket', 'Entertainment'],
      ['/surat/farmhouse', 'Farmhouse'],
    ]) {
      await page.goto(`${web}${path}`);
      check(`${path}: ${name} current`, (await current(headerTabs))?.trim() === name);
    }
    const listing = await page.locator('a[href^="/listing/"]').first().getAttribute('href');
    await page.goto(`${web}${listing}`);
    check(
      'no tabs on a listing page',
      (await page.getByRole('navigation', { name: 'Categories' }).count()) === 0,
    );

    // Phones: tabs move into the hero; the first viewport holds tabs, search and the first chips.
    for (const path of ['/', '/entertainment']) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`${web}${path}`);
      const hero = page.locator('[data-hero]').getByRole('navigation', { name: 'Categories' });
      check(`${path} @390 tabs in the hero`, await hero.isVisible());
      check(`${path} @390 header tabs hidden`, !(await headerTabs.isVisible()));
      const chip = await page.locator('[data-hero] ul').last().locator('li').first().boundingBox();
      check(
        `${path} @390 tabs, search and first chips in the first viewport`,
        chip && chip.y + chip.height <= 844,
        chip ? `${Math.round(chip.y + chip.height)}px` : 'no chips',
      );
      await audit(page, path === '/' ? 'home-farmhouse' : 'home-entertainment');
    }

    // Both homes are static: the second request is served from the ISR cache.
    for (const path of ['/', '/entertainment']) {
      await fetch(`${web}${path}`);
      const res = await fetch(`${web}${path}`);
      check(
        `${path} served from the static cache`,
        res.headers.get('x-nextjs-cache') === 'HIT',
        res.headers.get('x-nextjs-cache') ?? 'none',
      );
    }
  }
  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
} catch (error) {
  check('gate completed', false, error.message.split('\n')[0]);
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  if (out) await writeFile(`${out}/cp33-${mode}-results.json`, JSON.stringify(results, null, 2));
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}
