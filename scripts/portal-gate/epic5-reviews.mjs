// Epic 5 browser QA. Run against rentra-backend test/helpers/serve-epic5.mjs (fresh fixture per run)
// and Next on 127.0.0.1:3115. No hosted requests; fixture identities only.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const actionWidth = Number(process.env.EPIC5_ACTION_WIDTH || 1440);
assert.ok([390, 1440].includes(actionWidth));
const out = new URL(`../../docs/qa/epic-5/${actionWidth}/`, import.meta.url);
await mkdir(out, { recursive: true });
const resultFile = new URL('results.json', out);
const incomplete = { status: 'incomplete', checks: [{ name: 'runner completed', ok: false }] };
await writeFile(resultFile, JSON.stringify(incomplete, null, 2));
const { auditPage } = await import('./browser-audit.mjs');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const web = 'http://127.0.0.1:3115';
const f = JSON.parse(
  await readFile(
    new URL('../../../rentra-backend/tmp/epic5qa/fixture.json', import.meta.url),
    'utf8',
  ),
);
const database = new URL(f.databaseUrl);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '55432');
assert.match(database.pathname, /^\/rentra_test_[a-f0-9]{32}$/);

const checks = [];
const check = (name, ok, detail = '', source = 'browser') => {
  checks.push({ source, name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(detail)}`);
};
const photo = (name) =>
  fileURLToPath(new URL(`../../public/images/occasions/${name}.webp`, import.meta.url));
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const runtimeErrors = [];
const touch = actionWidth === 390;
// Touch keeps the 44px project target; fine pointers use compact density, held to WCAG 2.2 AA 24px.
const minTarget = touch ? 44 : 24;
async function as(role) {
  // 390 runs as a touch phone (coarse pointer); 1440 as a mouse desktop (compact portal density).
  const context = await browser.newContext({
    viewport: { width: actionWidth, height: 900 },
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
  });
  if (role)
    await context.addCookies([
      {
        name: role === 'admin' ? 'rentra_admin' : 'rentra_session',
        value: f.tokens[role],
        url: web,
      },
    ]);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.on('pageerror', (error) => runtimeErrors.push(`${role}: ${error.message}`));
  return page;
}
async function open(page, path) {
  const response = await page.goto(web + path, { timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 180000 });
  await page
    .waitForFunction(
      () => !/^Loading/.test(document.querySelector('main')?.innerText.trim() || ''),
      null,
      { timeout: 60000 },
    )
    .catch(() => {});
  return response;
}
const mainText = (page) => page.locator('main').innerText();
// Reflow at 320/390/1440, axe WCAG 2.1 A/AA on <main>, target size for named actions, one screenshot.
async function audit(
  page,
  name,
  actions = /^(Submit review|Submit report|Save decision|Close report|Preview publication change|Confirm publication change|Mark as read)$/,
) {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${name}: reflow ${width}`, overflow <= 1, `${overflow}px horizontal overflow`);
    const small = await page.locator('button').evaluateAll(
      (buttons, source) =>
        buttons
          .filter((b) => {
            const r = b.getBoundingClientRect();
            return (
              r.width > 0 &&
              new RegExp(source[0]).test(b.textContent.trim()) &&
              (r.width < source[1] || r.height < source[1])
            );
          })
          .map(
            (b) =>
              `${b.textContent.trim()} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}px`,
          ),
      [actions.source, minTarget],
    );
    check(`${name}: action targets ≥${minTarget}px ${width}`, small.length === 0, small);
    const axe = await auditPage(page, 'main');
    check(
      `${name}: axe ${width}`,
      axe.violations.length === 0,
      axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
  }
  await page.setViewportSize({ width: actionWidth, height: 900 });
  await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, out)), fullPage: true });
}
const listingReviews = async (page) => {
  await open(page, f.listingPath);
  return page.locator('#reviews').innerText();
};

const texts = {
  clean:
    'A calm farm with a clean pool, shady lawns and a caretaker who answered every question kindly.',
  flagged:
    'Lovely farm, call the caretaker on 98765 43210 or see www.example-farm.in for directions.',
  low: 'Very disappointing visit. The lawn was overgrown and the pool water looked dirty all day.',
  arrival:
    'We reached on time but the gate stayed locked for an hour and nobody picked up the phone.',
};

try {
  const visitor = await as(null);
  const admin = await as('admin');

  // ---------------- 5.3 invitation in the in-app list (before the review exists)
  const clean = await as('clean');
  await open(clean, '/account/notifications');
  const invite = clean.locator('li', { hasText: 'How was your visit?' });
  check('5.3 invitation listed in Booking updates', (await invite.count()) === 1);
  check(
    '5.3 delivered by fake SMS adapter but still unread',
    /SMS: delivered/.test(await invite.innerText()) &&
      (await invite.getByText('(unread)').count()) === 1,
    await invite.innerText(),
  );
  check(
    '5.3 SMS body links to the reviews page, no case detail (service observation)',
    /How was your visit at Review River Farm\? Review it by .+: http:\/\/127\.0\.0\.1:3115\/bookings\/.+\/reviews/.test(
      f.service.smsBodies[0],
    ),
    f.service.smsBodies[0],
    'service',
  );
  await audit(clean, '53-notifications');
  await invite.getByRole('button', { name: 'Mark as read' }).click();
  await clean.waitForLoadState('networkidle');
  await clean.waitForTimeout(1000);
  await open(clean, '/account/notifications');
  const readRow = await clean.locator('li', { hasText: 'How was your visit?' }).innerText();
  check(
    '5.3 customer Mark as read sets Read',
    /\bRead$/m.test(readRow) && !/unread/.test(readRow),
    readRow,
  );

  // ---------------- 5.1 clean review publishes instantly
  await open(clean, `/bookings/${f.ids.visits.clean.order}/reviews`);
  await audit(clean, '51-review-form');
  await clean.getByLabel('Overall rating').selectOption('4');
  await clean.getByLabel('Your experience').fill(texts.clean);
  await clean.getByRole('button', { name: 'Submit review' }).click();
  // The refreshed page replaces the form with the saved review: Live badge plus the listing link.
  await clean.getByRole('link', { name: 'Your review is live — see it on the listing' }).waitFor();
  check('5.1 clean review shown Live with listing link', /Live/.test(await mainText(clean)));
  check(
    '5.1 clean review on public listing',
    (await listingReviews(visitor)).includes(texts.clean),
  );
  await open(clean, '/account/notifications');
  check(
    '5.3 invitation hidden after the guest reviewed',
    (await clean.locator('li', { hasText: 'How was your visit?' }).count()) === 0,
  );

  // ---------------- 5.1 failed submit keeps values; flagged review waits with checking message
  const flagged = await as('flagged');
  await open(flagged, `/bookings/${f.ids.visits.flagged.order}/reviews`);
  await flagged.getByLabel('Overall rating').selectOption('5');
  // Bypass the browser minimum so the server refusal path runs.
  await flagged.getByLabel('Your experience').evaluate((e) => e.removeAttribute('minlength'));
  await flagged.getByLabel('Your experience').fill('Too short');
  await flagged.getByRole('button', { name: 'Submit review' }).click();
  await flagged.locator('main [role=alert]').first().waitFor();
  check(
    '5.1 failed submit keeps rating and text',
    (await flagged.getByLabel('Overall rating').inputValue()) === '5' &&
      (await flagged.getByLabel('Your experience').inputValue()) === 'Too short',
    await flagged.locator('main [role=alert]').first().innerText(),
  );
  await flagged.getByLabel('Your experience').fill(texts.flagged);
  await flagged.getByRole('button', { name: 'Submit review' }).click();
  await flagged.getByText('your review is being checked').first().waitFor();
  check('5.1 flagged review shows checking message', true);
  await open(flagged, `/bookings/${f.ids.visits.flagged.order}/reviews`);
  check(
    '5.1 flagged review still checking after reload',
    /your review is being checked/.test(await mainText(flagged)),
    await mainText(flagged),
  );
  check('5.1 flagged review not public', !(await listingReviews(visitor)).includes('98765'));

  // ---------------- 5.1 low rating, clean text: never flagged
  const low = await as('low');
  await open(low, `/bookings/${f.ids.visits.low.order}/reviews`);
  await low.getByLabel('Overall rating').selectOption('1');
  await low.getByLabel('Your experience').fill(texts.low);
  await low.getByRole('button', { name: 'Submit review' }).click();
  await low.getByRole('link', { name: 'Your review is live — see it on the listing' }).waitFor();
  check(
    '5.1 1-star clean review published (no rating flag)',
    (await listingReviews(visitor)).includes(texts.low),
  );

  // ---------------- 5.1 admin queue and Auto-published filter
  await open(admin, '/admin/reviews');
  const flaggedRow = admin.locator('tr', { hasText: '98765' });
  check(
    '5.1 admin queue: flagged review pending with reasons',
    /pending/i.test(await flaggedRow.innerText()) &&
      /Auto-flagged: private information, spam/.test(await flaggedRow.innerText()),
    await flaggedRow.innerText(),
  );
  await audit(admin, '51-admin-queue');
  await admin.getByRole('link', { name: 'Auto-published' }).click();
  await admin.waitForURL(/tab=auto_published/);
  await admin.waitForLoadState('networkidle');
  const auto = await mainText(admin);
  check(
    '5.1 Auto-published filter lists clean reviews only',
    auto.includes(texts.clean) && auto.includes(texts.low) && !auto.includes('98765'),
  );
  check(
    '5.1 Auto-published tab marked current',
    (await admin.locator('[aria-current="page"]', { hasText: 'Auto-published' }).count()) === 1,
  );

  // ---------------- 5.2 arrival exception
  const arrival = await as('arrival');
  const arrivalReviews = `/bookings/${f.ids.arrival.visit.order}/reviews`;
  await open(arrival, arrivalReviews);
  check(
    '5.2 no arrival form before a decision',
    (await arrival.getByText('Review your arrival').count()) === 0,
  );
  await open(admin, `/admin/support/${f.ids.arrival.caseId}`);
  const panel = admin.locator('section', {
    has: admin.getByRole('heading', { name: 'Review eligibility' }),
  });
  check(
    '5.2 admin panel: not eligible, no decision',
    /Not eligible — no decision/.test(await panel.innerText()),
  );
  await audit(admin, '52-admin-eligibility');
  await panel.getByLabel('Approve arrival review').check();
  await panel.getByLabel('Scope').selectOption('arrival_access');
  await panel
    .getByLabel('Reason (shown to the guest)')
    .fill('Gate code was never sent; guest waited outside for an hour.');
  await panel.getByRole('button', { name: 'Save decision' }).click();
  await panel.getByText(/Exception approved · Arrival experience only/).waitFor();
  check('5.2 admin approves with scope and reason', true);
  await open(arrival, `/support/${f.ids.arrival.caseId}`);
  const guestCase = await mainText(arrival);
  check(
    '5.2 guest case shows the decision and reason',
    /You can review your arrival until/.test(guestCase) &&
      guestCase.includes('Gate code was never sent'),
    guestCase.slice(0, 400),
  );
  await open(arrival, '/account/notifications');
  check(
    '5.3 arrival exception invitation listed (approved inside 09:00-21:00 IST)',
    (await arrival.locator('li', { hasText: 'How was your visit?' }).count()) === 1,
    new Date().toISOString(),
  );
  await open(arrival, arrivalReviews);
  check(
    '5.2 guest sees "Review your arrival"',
    (await arrival.getByRole('heading', { name: 'Review your arrival' }).count()) === 1,
  );
  check(
    '5.2 scoped form has no sub-scores',
    (await arrival.getByText('Optional ratings').count()) === 0 &&
      (await arrival.getByLabel('Cleanliness').count()) === 0,
  );
  await audit(arrival, '52-arrival-form');
  await arrival.getByLabel('Overall rating').selectOption('2');
  await arrival.getByLabel('Your experience').fill(texts.arrival);
  await arrival.getByRole('button', { name: 'Submit review' }).click();
  await arrival
    .getByRole('link', { name: 'Your review is live — see it on the listing' })
    .waitFor();
  let reviews = await listingReviews(visitor);
  check(
    '5.2 scoped review public with label',
    reviews.includes(texts.arrival) && reviews.includes("Arrival experience only — didn't stay"),
  );
  await open(admin, `/admin/support/${f.ids.arrival.caseId}`);
  check('5.2 admin sees the review is public', /Review is public/.test(await panel.innerText()));
  check(
    '5.2 reviewed visit offers deny only',
    (await panel.getByLabel('Approve arrival review').count()) === 0,
  );
  await panel.getByLabel('Deny').check();
  await panel
    .getByLabel('Reason (shown to the guest)')
    .fill('Later evidence shows the guest never reached the property.');
  await panel.getByRole('button', { name: 'Save decision' }).click();
  await panel.getByText('Denied').first().waitFor();
  reviews = await listingReviews(visitor);
  check('5.2 revoke removes the scoped review from public view', !reviews.includes(texts.arrival));
  await open(arrival, `/support/${f.ids.arrival.caseId}`);
  check(
    '5.2 guest case shows the denial and reason',
    /Not eligible for a review/.test(await mainText(arrival)) &&
      (await mainText(arrival)).includes('never reached'),
  );

  // ---------------- 5.4 reports with evidence
  const reporter = await as('reporter');
  const reportPath = `/reviews/${f.ids.published}/report`;
  await open(reporter, reportPath);
  await reporter
    .getByLabel('Report reason')
    .fill('This reads like a competitor review; the dates do not match any stay.');
  await reporter
    .getByLabel(/Evidence photos/)
    .setInputFiles(['day-picnic', 'bonfire-allowed', 'with-pool', 'corporate-offsite'].map(photo));
  await reporter.getByRole('button', { name: 'Submit report' }).click();
  check(
    '5.4 4 photos refused before upload',
    /Attach up to 3 photos/.test(await reporter.locator('main [role=alert]').first().innerText()),
  );
  await reporter
    .getByLabel(/Evidence photos/)
    .setInputFiles(['day-picnic', 'bonfire-allowed'].map(photo));
  await Promise.all([
    reporter.waitForResponse((r) => r.request().method() === 'POST'),
    reporter.getByRole('button', { name: 'Submit report' }).click(),
  ]);
  await open(reporter, reportPath);
  const mine = reporter.getByRole('region', { name: 'Your report' });
  check(
    '5.4 reporter sees own report, 2 photos, open',
    (await mine.getByRole('link', { name: /Evidence photo/ }).count()) === 2 &&
      /Open — staff will record/.test(await mine.innerText()),
  );
  await audit(reporter, '54-report');
  check(
    '5.4 report does not hide the review',
    (await listingReviews(visitor)).includes('The pool was cloudy'),
  );

  const owner = await as('owner');
  await open(owner, `/partner/reviews/${f.ids.published}`);
  const ownerControls = await owner.locator('main button, main a').allInnerTexts();
  check(
    '5.4 owner has no delete/hide/veto control',
    // "Delete reply" removes the owner's own public reply, not the guest review.
    !ownerControls.some((t) => /delete|hide|remove|veto|approve/i.test(t) && t !== 'Delete reply'),
    ownerControls,
  );
  await owner.getByText('Report a policy violation').click();
  await owner
    .getByLabel('Report reason')
    .fill('Caretaker logs show the handover started on time; the review misstates it.');
  await owner.getByLabel(/Evidence photos/).setInputFiles([photo('pre-wedding-shoot')]);
  await Promise.all([
    owner.waitForResponse((r) => r.request().method() === 'POST'),
    owner.getByRole('button', { name: 'Submit report' }).click(),
  ]);
  await open(owner, `/partner/reviews/${f.ids.published}`);
  check(
    '5.4 owner sees own open report with evidence',
    (await owner.getByRole('img', { name: 'Evidence photo 1' }).count()) === 1,
  );
  await audit(owner, '54-owner-review');

  await open(admin, '/admin/reviews');
  check(
    '5.4 admin open-report total 2',
    /Open reports\s*2/.test(await mainText(admin)),
    (await mainText(admin)).match(/Open reports\s*\d+/)?.[0],
  );
  await open(admin, `/admin/reviews/${f.ids.published}`);
  const imgs = admin.locator('[aria-label="Report evidence"] img');
  await imgs.last().waitFor();
  const loaded = await imgs.evaluateAll((list) =>
    list.map((i) => i.complete && i.naturalWidth > 0),
  );
  check(
    '5.4 admin sees 3 evidence thumbnails that load',
    loaded.length === 3 && loaded.every(Boolean),
    loaded,
  );
  const evidenceHref = await imgs.first().getAttribute('src');
  await audit(admin, '54-admin-detail');
  const ownerReport = admin.locator('article[id^="report-"]', { hasText: 'Caretaker logs show' });
  await ownerReport.getByLabel('Not a violation').check();
  await ownerReport
    .getByLabel('Outcome note (shared with the reporter)')
    .fill('Low scores and timing complaints are allowed; no rule broken.');
  await ownerReport.getByRole('button', { name: 'Close report' }).click();
  await ownerReport.getByText('Not a violation ·').waitFor();
  check(
    '5.4 not_violation closes report, review stays public',
    (await listingReviews(visitor)).includes('The pool was cloudy'),
  );
  await open(admin, `/admin/reviews/${f.ids.published}`);
  const custReport = admin.locator('article[id^="report-"]', { hasText: 'competitor review' });
  await custReport.getByLabel('Upheld').check();
  await custReport.getByLabel('Publication decision').selectOption('hidden');
  const reasons = await custReport.getByLabel('Policy basis').locator('option').allInnerTexts();
  check(
    '5.4 manipulation reason offered, meets_policy not offered for Upheld',
    reasons.includes('Manipulation (fake, incentivised or conflicted review)') &&
      !reasons.some((r) => /meets/i.test(r)),
    reasons,
  );
  await custReport
    .getByLabel('Policy basis')
    .selectOption({ label: 'Manipulation (fake, incentivised or conflicted review)' });
  await custReport
    .getByLabel('Outcome note (shared with the reporter)')
    .fill('Upheld: booking records show this was not a genuine stay.');
  await custReport.getByRole('button', { name: 'Preview publication change' }).click();
  await custReport.getByText('Confirming also closes the report as Upheld.').waitFor();
  await custReport.getByRole('button', { name: 'Confirm publication change' }).click();
  await admin
    .getByText(/Upheld ·/)
    .first()
    .waitFor();
  check('5.4 Upheld with hide closes report', true);
  check(
    '5.4 hidden review left public listing',
    !(await listingReviews(visitor)).includes('The pool was cloudy'),
  );
  await open(reporter, reportPath);
  const reporterView = await mainText(reporter);
  check(
    '5.4 reporter sees Upheld outcome and note',
    /Upheld · Upheld: booking records show/.test(reporterView) &&
      /no longer public/.test(reporterView),
    reporterView.slice(0, 500),
  );
  await open(owner, `/partner/reviews/${f.ids.published}`);
  check(
    '5.4 owner sees Not a violation outcome and note',
    /Not a violation · Low scores and timing/.test(await mainText(owner)),
  );
  // Another customer asks for the reporter's evidence through the customer proxy.
  const attachment = evidenceHref.replace('/admin/', '/');
  const other = await clean.context().request.get(web + attachment);
  check(
    '5.4 other customer gets 404 for evidence',
    other.status() === 404,
    `${other.status()} ${attachment}`,
  );

  check('no runtime page errors', runtimeErrors.length === 0, runtimeErrors);
  check('runner completed', true);
} catch (error) {
  check('runner completed', false, error.stack);
} finally {
  await browser.close();
  const failed = checks.filter((c) => !c.ok).length;
  await writeFile(
    resultFile,
    JSON.stringify(
      {
        status: failed ? 'failed' : 'passed',
        actionWidth,
        ranAt: new Date().toISOString(),
        passed: checks.length - failed,
        failed,
        checks,
      },
      null,
      2,
    ),
  );
  console.log(`${checks.length - failed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
