// CP34 venue search, filters, results and landings (entertainment plan, Phase 7).
// Same disposable stack as cp33, with Farmhouse and Entertainment public and live venues
// in Surat (cp32 creates them). Env: GATE_WEB, GATE_OUT, PLAYWRIGHT_MODULE, CHROME.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const web = process.env.GATE_WEB || 'http://localhost:3106';
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
/** Visible within the timeout (pages stream; a one-off isVisible() can sample the skeleton). */
const visible = (locator, timeout = 30000) =>
  locator
    .first()
    .waitFor({ timeout })
    .then(
      () => true,
      () => false,
    );
const tomorrow = new Date(Date.now() + 86400000 + 5.5 * 3600000).toISOString().slice(0, 10);

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
  const form = page.locator('#discovery-filters');

  // Undated venue search: venue fields, venue cards, venue filters.
  await page.goto(`${web}/search?vertical=entertainment&city=surat`);
  await visible(page.getByRole('heading', { level: 2, name: /^\d+ venues?/ }));
  check(
    'results count in venues',
    /^\d+ venues?$/.test(
      (await page.getByRole('heading', { level: 2 }).first().textContent()).trim(),
    ),
  );
  for (const field of ['Where', 'What', 'When', 'Time'])
    check(`discovery bar has ${field}`, (await form.getByText(field, { exact: true }).count()) > 0);
  check('venue card facts', (await page.getByText(/· \d+ courts? ·/).count()) > 0);
  check('venue card price per hour', (await page.getByText('/ hr').count()) > 0);
  await form.getByRole('button', { name: /^Filters/ }).click();
  const panel = page.locator('#discovery-more-filters');
  for (const label of [
    'Venue name or locality',
    'Players',
    'Indoor or outdoor',
    'Minimum price per hour (₹)',
  ])
    check(`filters panel has ${label}`, await panel.getByLabel(label).isVisible());
  check(
    'no farmhouse property type in venue filters',
    (await panel.getByLabel('Property type').count()) === 0,
  );
  await panel.getByLabel('Players').fill('8');
  await panel.getByLabel('Indoor or outdoor').selectOption('false');
  await panel.getByRole('button', { name: 'Apply filters' }).click();
  await page.waitForURL(/players=8/);
  const applied = new URL(page.url()).searchParams;
  check(
    'filters submit players and indoor, never slot or guests',
    applied.get('players') === '8' &&
      applied.get('indoor') === 'false' &&
      !applied.has('slot') &&
      !applied.has('guests'),
    page.url(),
  );
  check(
    'active chips for players and outdoor',
    (await page.getByRole('link', { name: 'Remove 8 players' }).count()) === 1 &&
      (await page.getByRole('link', { name: 'Remove Outdoor' }).count()) === 1,
  );
  await audit(page, 'search-venues');

  // Dated search: free start times on cards, priced for the duration.
  await page.goto(
    `${web}/search?vertical=entertainment&city=surat&category=box-cricket&date=${tomorrow}&start=18:00&duration=60`,
  );
  check(
    'dated heading names the date',
    await visible(
      page.getByRole('heading', { level: 2, name: /^\d+ venues? with free times on / }),
    ),
  );
  const times = page.getByRole('list', { name: 'Free start times' }).first();
  const firstTime = times.getByRole('link').first();
  check('cards show free start times', (await times.getByRole('link').count()) > 0);
  check(
    'time chip names time and price',
    /^Book \d{1,2}:\d{2} [AP]M, ₹[\d,]+/.test(await firstTime.getAttribute('aria-label')),
  );
  check(
    'time chip opens the venue at that time',
    /[?&]start=\d{2}:\d{2}/.test(await firstTime.getAttribute('href')) &&
      /activity=box-cricket/.test(await firstTime.getAttribute('href')),
  );
  check('dated price is for the duration', (await page.getByText('for 1 hr').count()) > 0);
  await audit(page, 'search-venues-dated');

  // Nothing free after the last start: the booked-out state with its ways out.
  await page.goto(
    `${web}/search?vertical=entertainment&city=surat&category=box-cricket&date=${tomorrow}&start=23:30&duration=120`,
  );
  check(
    'booked-out title',
    await visible(
      page.getByRole('heading', { name: /^Every court is booked on .* from 11:30 PM$/ }),
    ),
  );
  for (const name of ['Any time that day', 'Next day', 'Try 1 hour'])
    check(`booked-out offers ${name}`, await visible(page.getByRole('link', { name })));

  // No venue for the activity: honest empty state with the owner CTA.
  await page.goto(`${web}/search?vertical=entertainment&city=surat&category=bowling&players=2`);
  check(
    'no-venues title',
    await visible(page.getByRole('heading', { name: 'No bowling venues in Surat yet' })),
  );
  check('no-venues owner CTA', await visible(page.getByRole('link', { name: 'List your venue' })));

  // Landings.
  for (const [path, title] of [
    ['/surat/box-cricket', 'Box cricket in Surat'],
    ['/surat/entertainment', 'Sports and play venues in Surat'],
  ]) {
    await page.goto(`${web}${path}`);
    check(
      `${path} titled "${title}"`,
      await visible(page.getByRole('heading', { level: 1, name: title })),
    );
    await visible(page.getByText(/· \d+ courts? ·/));
    check(`${path} lists venues`, (await page.getByText(/· \d+ courts? ·/).count()) > 0);
    check(
      `${path} explore chips stay in the vertical`,
      (await page.getByRole('link', { name: /Farmhouse in /i }).count()) === 0,
    );
    await audit(page, path.slice(1).replace('/', '-'));
  }

  // Canonical URLs. The (marketing) loading boundary streams first, so Next sends these
  // as a streamed redirect (meta refresh + RSC 308) that the browser follows.
  await page.goto(`${web}/search?category=box-cricket&city=surat`);
  check(
    'a venue category implies its vertical',
    await page.waitForURL(/vertical=entertainment/, { timeout: 30000 }).then(
      () => true,
      () => false,
    ),
    page.url(),
  );
  await page.goto(
    `${web}/search?vertical=entertainment&city=surat&area=&category=box-cricket&date=&start=&duration=60`,
  );
  check(
    'city and activity alone open the landing page',
    await page.waitForURL(/\/surat\/box-cricket$/, { timeout: 30000 }).then(
      () => true,
      () => false,
    ),
    page.url(),
  );
  await page.goto(`${web}/search?city=surat&category=farmhouse`);
  await visible(page.getByRole('heading', { level: 2, name: /places?/ }));
  check(
    'farmhouse searches are not redirected',
    new URL(page.url()).pathname === '/search',
    page.url(),
  );

  // Keyboard only: choose an activity and search from the Entertainment home.
  await page.goto(`${web}/entertainment`, { waitUntil: 'networkidle' });
  const bar = page.locator('form[aria-label="Find a venue"]');
  await bar.locator('[data-search-field="activity"]').focus();
  await page.keyboard.press('Enter');
  const what = page.getByRole('dialog', { name: 'What' });
  await what.waitFor();
  await what.getByRole('button', { name: 'Box cricket' }).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await bar.getByRole('button', { name: 'Find venues' }).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(/\/surat\/box-cricket$|category=box-cricket/);
  check(
    'keyboard-only venue search reaches box-cricket results',
    /box-cricket/.test(page.url()),
    page.url(),
  );

  check('no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
} catch (error) {
  check('gate completed', false, error.message.split('\n')[0]);
} finally {
  await browser.close();
  const failed = results.filter((r) => !r.pass);
  if (out) await writeFile(`${out}/cp34-results.json`, JSON.stringify(results, null, 2));
  console.log(`${results.length - failed.length}/${results.length} checks passed`);
  process.exitCode = failed.length ? 1 : 0;
}
