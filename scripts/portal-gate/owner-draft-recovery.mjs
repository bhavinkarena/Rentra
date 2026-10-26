// Story 1.1 browser gate: private draft resume, access denial, stale-tab conflict and session recovery.
// Runs against the same disposable fixture as owner-wizard.mjs (serve-owner-wizard.mjs on 4143).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
const require = createRequire(import.meta.url),
  { chromium } = require(process.env.PLAYWRIGHT_MODULE);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const database = new URL(fixture.databaseUrl);
assert.ok(
  ['localhost', '127.0.0.1'].includes(database.hostname) &&
    database.pathname.startsWith('/rentra_test_'),
);
assert.ok(fixture.tokens.other, 'restart serve-owner-wizard.mjs to mint the second owner');
const web = process.env.GATE_WEB_ORIGIN || 'http://localhost:3143';
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const errors = [];
async function open(width, token) {
  const context = await browser.newContext({
    viewport: { width, height: width < 500 ? 800 : 900 },
    reducedMotion: 'reduce',
  });
  if (token) await context.addCookies([{ name: 'rentra_session', value: token, url: web }]);
  const page = await context.newPage();
  page.setDefaultTimeout(90000);
  page.on('pageerror', (e) => errors.push(e.message));
  return page;
}
async function check(name, work) {
  await work();
  console.log('PASS', name);
}
const fits = async (page) =>
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
let id;
const story = () => `${web}/partner/listings/${id}/setup/story`;
try {
  await check('1280: pending owner creates, saves by keyboard and resumes a draft', async () => {
    const page = await open(1280, fixture.tokens.owner);
    await page.goto(web + '/partner/listings/new');
    await page.getByLabel('Farmhouse or villa').check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.waitForURL(/setup\/location/);
    id = page.url().match(/listings\/([^/]+)\//)[1];
    // Wait for hydration so typed text is not replaced by the server render.
    await page.goto(story(), { waitUntil: 'networkidle' });
    await page.getByLabel('Title').focus();
    await page.keyboard.type('Desktop recovery farmhouse');
    await page.keyboard.press('Tab');
    await page.getByText(/^Saved \d/).waitFor();
    await page.reload();
    assert.equal(await page.getByLabel('Title').inputValue(), 'Desktop recovery farmhouse');
    await fits(page);
    await page.goto(web + '/partner/listings');
    const resume = page.getByRole('link', { name: /Continue setup/ }).first();
    assert.match(await resume.getAttribute('href'), new RegExp(id));
  });
  await check('signed-out visitor is sent to sign in and never sees the draft', async () => {
    const page = await open(390);
    await page.goto(story());
    await page.waitForURL(/partner\/login/);
    assert.ok(!(await page.content()).includes('Desktop recovery farmhouse'));
  });
  await check('another owner gets not-found, not the draft', async () => {
    const page = await open(390, fixture.tokens.other);
    await page.goto(story(), { waitUntil: 'networkidle' });
    await page.getByText('We couldn’t find that page').waitFor();
    assert.ok(!(await page.content()).includes('Desktop recovery farmhouse'));
  });
  const first = await open(360, fixture.tokens.owner),
    second = await open(360, fixture.tokens.owner);
  await check('360: a stale tab is blocked and Load latest shows the newer save', async () => {
    await first.goto(story(), { waitUntil: 'networkidle' });
    await second.goto(story(), { waitUntil: 'networkidle' });
    await first.getByLabel('Title').fill('Saved from the first tab');
    await first.getByText(/^Saved \d/).waitFor();
    await second.getByLabel('Title').fill('Stale edit from the second tab');
    const load = second.getByRole('button', { name: 'Load latest' });
    await load.waitFor();
    await fits(second);
    await load.click();
    await second.waitForLoadState('networkidle');
    assert.equal(await second.getByLabel('Title').inputValue(), 'Saved from the first tab');
  });
  await check('360: an ended session offers sign-in back to the same step', async () => {
    await first.context().clearCookies();
    await first.context().addCookies([{ name: 'rentra_session', value: 'ended', url: web }]);
    await first.getByLabel('Title').fill('Typed after the session ended');
    const link = first.getByRole('link', { name: 'Your session ended. Sign in again' });
    await link.waitFor();
    const next = new URL(await link.getAttribute('href'), web).searchParams.get('next');
    assert.equal(next, `/partner/listings/${id}/setup/story`);
    await first.reload();
    await first.waitForURL(/partner\/login/);
  });
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
