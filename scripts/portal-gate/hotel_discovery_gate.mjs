// Hotel discovery gate (hotel plan, Phase 6). Same disposable stack as hotel_wizard_gate.mjs, with
// 0066 applied, `seed-hotels --demo` run (landmarks + map pins) and Hotels set public by SQL on the
// disposable DB. Guest: Hotels home, "Where" suggestions, dated results with map, quick filter,
// landmark page, hotel page rooms; checks card total = page price = quote total. Admin: landmarks.
// axe (WCAG 2.1 AA) at 1440 and overflow at 390 on every screen.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const web = process.env.GATE_WEB || 'http://localhost:3106';
const out = process.env.GATE_OUT || 'hotel-discovery-gate-out';
fs.mkdirSync(out, { recursive: true });
const tokens = JSON.parse(fs.readFileSync(process.env.GATE_TOKENS, 'utf8'));
const axe = fs.readFileSync(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);
const checks = [];
const check = (name, ok, detail = '') => {
  checks.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};
const day = (n) => new Date(Date.now() + 5.5 * 3600000 + n * 86400000).toISOString().slice(0, 10);
const checkin = day(12);
const checkout = day(14);
const rupees = (text) => Number(String(text).replace(/[^\d]/g, ''));

const browser = await chromium.launch({
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: 'rentra_admin', value: tokens.admin, url: web }]);
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => {
  // Map tiles come from the internet; an offline machine must not fail the gate.
  if (m.type() === 'error' && !/favicon\.ico$|tile\.openstreetmap/.test(m.location().url ?? ''))
    errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(e.message));

async function audit(name) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(800);
  await page.addScriptTag({ content: axe });
  const result = await page.evaluate(async () =>
    (
      await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })
    ).violations.map((v) => `${v.id}(${v.nodes.length})`),
  );
  check(`axe ${name} (1440)`, result.length === 0, result.join(', '));
  await page.screenshot({ path: `${out}/${name}-1440.png`, fullPage: true });
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(page.url(), { waitUntil: 'networkidle' });
  await phone.waitForTimeout(500);
  const overflow = await phone.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow ${name} (390)`, overflow <= 0, `${overflow}px`);
  await phone.screenshot({ path: `${out}/${name}-390.png`, fullPage: true });
  await phone.close();
}

try {
  // 1. Hotels home with the Hotels tab and "Where" suggestions grouped by kind.
  await page.goto(`${web}/hotels`, { waitUntil: 'networkidle' });
  check(
    'Hotels tab is current',
    (await page.locator('a[aria-current="page"]', { hasText: 'Hotels' }).count()) >= 1,
  );
  await page
    .getByRole('form', { name: 'Find a hotel' })
    .getByRole('button', { name: /^Where/ })
    .click();
  await page.getByLabel('Search city, area, landmark or hotel').fill('rail');
  // "Popular landmarks" shows before typing; the typed answer has a plain "Landmarks" group.
  await page.getByText('Landmarks', { exact: true }).waitFor({ timeout: 15000 });
  check(
    'suggestions list landmarks',
    (await page.getByRole('button', { name: /Surat Railway Station/ }).count()) >= 1,
  );
  await page.keyboard.press('Escape');
  await audit('01-hotels-home');

  // 2. Dated results: totals with taxes, map with price pins.
  await page.goto(
    `${web}/search?vertical=hotel&city=surat&checkin=${checkin}&checkout=${checkout}&adults=2`,
    { waitUntil: 'networkidle' },
  );
  const heading = await page.getByRole('heading', { level: 2, name: /hotels? ·/ }).textContent();
  check('results count for the dates', /\d+ hotels?/.test(heading), heading);
  const card = page.locator('article').filter({ hasText: 'for 2 nights' }).first();
  await card.waitFor({ timeout: 15000 });
  const cardTitle = (await card.locator('a').first().textContent()).trim();
  const cardPrice = rupees(await card.locator('[data-money]').first().textContent());
  check('cards show the stay total', cardPrice > 0, `${cardTitle} ₹${cardPrice}`);
  check('map has a pin per card', (await page.locator('.leaflet-marker-icon').count()) >= 1);
  await audit('02-results');

  // 3. Quick filter: free cancellation keeps only rates that are free to cancel.
  await page.getByRole('link', { name: 'Add Free cancellation filter' }).click();
  await page.waitForURL(/freecancel=1/);
  await page.waitForLoadState('networkidle');
  const free = await page.locator('article').count();
  const freeLines = await page.locator('article', { hasText: 'Free cancellation until' }).count();
  check(
    'free-cancellation filter: every card says until when',
    free > 0 && free === freeLines,
    `${freeLines}/${free}`,
  );

  // 4. Landmark landing.
  await page.goto(`${web}/hotels/near/surat-railway-station?sort=distance`, {
    waitUntil: 'networkidle',
  });
  const h1 = await page.getByRole('heading', { level: 1 }).textContent();
  check('landmark page title', h1 === 'Hotels near Surat Railway Station', h1);
  const km = await page
    .locator('article')
    .evaluateAll((items) =>
      items.map((item) => Number(item.textContent.match(/([\d.]+) km from/)?.[1])),
    );
  check(
    'sorted by distance, all within 5 km',
    km.length > 0 && km.every((v, i) => v <= 5 && (!i || v >= km[i - 1])),
    km.join(', '),
  );
  await audit('03-landmark');

  // 5. Hotel page: card price = cheapest plan on the page = quote total in the rail.
  await page.goto(
    `${web}/search?vertical=hotel&city=surat&checkin=${checkin}&checkout=${checkout}&adults=2`,
    { waitUntil: 'networkidle' },
  );
  await page.locator('article').filter({ hasText: cardTitle }).first().locator('a').first().click();
  await page.waitForURL(/\/listing\//);
  await page.getByRole('heading', { name: 'Rooms', level: 2 }).waitFor();
  await page.locator('ul li [data-money]').first().waitFor({ timeout: 20000 });
  const rows = page
    .locator('li')
    .filter({ has: page.locator('[data-money]') })
    .filter({ has: page.getByRole('button', { name: /^Add a / }) });
  const prices = await rows.evaluateAll((items) =>
    items.map((item) =>
      Number(item.querySelector('[data-money]').textContent.replace(/[^\d]/g, '')),
    ),
  );
  const cheapest = Math.min(...prices);
  check(
    'card total = cheapest rate on the hotel page',
    cheapest === cardPrice,
    `card ₹${cardPrice}, page ₹${cheapest}`,
  );
  await rows
    .nth(prices.indexOf(cheapest))
    .getByRole('button', { name: /^Add a / })
    .click();
  const rail = page.getByRole('complementary', { name: 'Your selection' });
  await rail.getByText(/^Total for 1 room/).waitFor({ timeout: 15000 });
  const quoted = rupees(await rail.locator('[data-money]').textContent());
  check('quote total = card total', quoted === cardPrice, `quote ₹${quoted}`);
  check(
    'JSON-LD Hotel present',
    (await page.locator('script[type="application/ld+json"]').first().textContent()).includes(
      '"Hotel"',
    ) ||
      (await page.locator('script[type="application/ld+json"]').first().textContent()).includes(
        '"Resort"',
      ),
  );
  check('policies in sentences', (await page.getByText(/Check-in from/).count()) >= 1);
  await audit('04-hotel-page');

  // 6. Admin: landmarks catalogue.
  await page.goto(`${web}/admin/catalogues/landmarks`, { waitUntil: 'networkidle' });
  check('admin landmarks list', (await page.getByText('Surat Railway Station').count()) >= 1);
  await audit('05-admin-landmarks');
} catch (error) {
  check('gate ran to the end', false, error.message.split('\n')[0]);
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true }).catch(() => {});
} finally {
  check('no console errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(`\n${checks.filter((c) => c.ok).length}/${checks.length} checks pass`);
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(checks, null, 2));
  await browser.close();
}
