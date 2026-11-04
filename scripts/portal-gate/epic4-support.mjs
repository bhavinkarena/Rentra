// Epic 4 browser QA. Run against rentra-backend test/helpers/serve-epic4.mjs and Next on loopback.
// No hosted requests; fixture steps that stand in for jobs/providers are recorded as source 'fixture'.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const actionWidth = Number(process.env.EPIC4_ACTION_WIDTH || 390);
assert.ok([390, 1440].includes(actionWidth));
const out = new URL(`../../docs/qa/epic-4/${actionWidth}/`, import.meta.url);
await mkdir(out, { recursive: true });
const resultFile = new URL('results.json', out);
const incomplete = (detail) =>
  writeFile(
    resultFile,
    JSON.stringify(
      { status: 'incomplete', checks: [{ name: 'runner completed', ok: false, detail }] },
      null,
      2,
    ),
  );
await incomplete('Setup or execution has not completed');
const { auditPage } = await import('./browser-audit.mjs');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const backend = new URL('../../../rentra-backend/', import.meta.url);
const postgres = createRequire(new URL('package.json', backend))('postgres');
const web = 'http://127.0.0.1:3114';
const fixture = JSON.parse(await readFile(new URL('tmp/epic4qa/fixture.json', backend), 'utf8'));
const database = new URL(fixture.databaseUrl);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '55432');
assert.match(database.pathname, /^\/rentra_test_[a-f0-9]{32}$/);
const sql = postgres(fixture.databaseUrl, { max: 1, onnotice: () => {} });
const order = fixture.ids.orders[actionWidth];
const checks = [];
const check = (name, ok, detail = '', source = 'browser') => {
  checks.push({ source, name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ' ' + JSON.stringify(detail)}`);
};
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {},
);
const runtimeErrors = [];
async function as(role) {
  const context = await browser.newContext({
    viewport: { width: actionWidth, height: 900 },
    timezoneId: 'Asia/Kolkata',
    // The phone run is a touch device (pointer: coarse): portals keep 44px targets only there.
    ...(actionWidth === 390 ? { hasTouch: true, isMobile: true } : {}),
  });
  await context.addCookies([
    {
      name: ['admin', 'supportReader'].includes(role) ? 'rentra_admin' : 'rentra_session',
      value: fixture.tokens[role],
      url: web,
    },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', (error) => runtimeErrors.push(`${role}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error' && /Each child|[Hh]ydrat/.test(message.text()))
      runtimeErrors.push(`${role}: ${message.text()}`);
  });
  return page;
}
const PRIMARY =
  /^(Report problem|Send support request|Send to guest|Save private note|Save decision|Execute award \(Test\)|Confirm and execute|Create repayment link)$/;
async function audit(name, page) {
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check(`${name}: reflow ${width}`, overflow <= 1, `${overflow}px horizontal overflow`);
    const small = await page.locator('button, [role="tab"]').evaluateAll(
      (buttons, source) =>
        buttons
          .filter((button) => {
            const rect = button.getBoundingClientRect();
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              (new RegExp(source).test(button.textContent.trim()) ||
                button.getAttribute('role') === 'tab') &&
              (rect.width < 44 || rect.height < 44)
            );
          })
          .map((button) => button.textContent.trim()),
      PRIMARY.source,
    );
    // Mouse/trackpad portals use a compact density by design (globals.css `pointer: fine`).
    if (await page.evaluate(() => matchMedia('(pointer: coarse)').matches))
      check(`${name}: primary targets ${width}`, small.length === 0, small);
    const axe = await auditPage(page);
    check(
      `${name}: axe ${width}`,
      axe.violations.length === 0,
      axe.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    );
    if ([390, 1440].includes(width))
      await page.screenshot({
        path: fileURLToPath(new URL(`${name}-${width}.png`, out)),
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: actionWidth, height: 900 });
}
const istLocal = (ms) => new Date(Date.now() - ms + 330 * 60000).toISOString().slice(0, 16);
const text = (page) => page.locator('main').innerText();
const NOTE = `PRIVATE-NOTE-${actionWidth} owner said the lock was replaced`;
const REPLY = `Support reply ${actionWidth}: we are calling the caretaker now.`;
const REASON = `Guest could not enter for hours (${actionWidth}).`;
const DETAILS = `GUEST-DETAILS-${actionWidth}: the gate code did not work on arrival.`;
const photos = ['day-picnic.webp', 'bonfire-allowed.webp'].map((f) =>
  fileURLToPath(new URL(`../../public/images/occasions/${f}`, import.meta.url)),
);
let caseId, caseRef, refundId;
try {
  // ---- 4.1 / 4.2 guest: urgent stay issue from the booking ----
  const guest = await as('customer');
  await guest.goto(`${web}/bookings/${order.orderId}`, { waitUntil: 'networkidle' });
  await guest.getByRole('link', { name: 'Report a problem' }).click();
  await guest.waitForURL(/\/support\/new\?order=.*topic=stay_issue/);
  check('4.1 booking detail opens intake with order preselected', true, guest.url());
  await guest.getByRole('combobox', { name: /what went wrong/i }).waitFor();
  const issueTypes = await guest
    .getByRole('combobox', { name: /what went wrong/i })
    .locator('option')
    .allTextContents();
  check(
    '4.2 intake lists stranded type',
    issueTypes.includes('I have nowhere to stay right now'),
    issueTypes,
  );
  await audit('report-form', guest);
  await guest.getByRole('button', { name: 'Report problem' }).click();
  const focused = await guest.evaluate(() => document.activeElement?.getAttribute('name'));
  check('4.1 empty submit focuses first error', focused === 'issueType', focused);
  check(
    '4.1 empty submit shows field errors, nothing saved',
    (await guest.getByText('Choose what went wrong.').count()) === 1 &&
      /\/support\/new/.test(guest.url()),
  );
  // Late without a reason: refused client-side, entered values retained.
  await guest.getByRole('combobox', { name: /what went wrong/i }).selectOption('access');
  await guest.locator('input[name="discoveredAt"]').fill(istLocal(80 * 3600000));
  await guest.locator('input[name="affected"]').first().check();
  await guest.locator('select[name="remedy"]').selectOption('fix_during_stay');
  await guest.locator('textarea[name="body"]').fill(DETAILS);
  await guest.getByRole('button', { name: 'Report problem' }).click();
  check(
    '4.1 late report without reason refused, values kept',
    (await guest.locator('#issue-lateReason-error').count()) === 1 &&
      (await guest.locator('textarea[name="body"]').inputValue()) === DETAILS &&
      (await guest.locator('select[name="remedy"]').inputValue()) === 'fix_during_stay',
  );
  await guest.locator('input[name="discoveredAt"]').fill(istLocal(2 * 3600000));
  await guest.locator('input[name="photos"]').setInputFiles(photos);
  await guest.getByRole('button', { name: 'Report problem' }).click();
  await guest.waitForURL(/\/support\/[0-9a-f-]{36}$/);
  caseId = guest.url().split('/').pop();
  await guest.getByText("We've received your report").waitFor();
  const ack = await text(guest);
  caseRef = (await sql`SELECT reference FROM support_request WHERE id=${caseId}`)[0].reference;
  check(
    '4.1 acknowledgement with durable reference',
    ack.includes("We've received your report") && ack.includes(caseRef),
    caseRef,
  );
  check(
    '4.2 urgent guest text, configured contacts and 112, no 24/7',
    ack.includes('Marked urgent. A person will reply within 12 hours.') &&
      ack.includes('Call +919000000111') &&
      ack.includes('support@fixture.invalid') &&
      (await guest.locator('a[href="tel:112"]').count()) === 1 &&
      !/24\s*\/\s*7/.test(ack),
  );
  const [saved] =
    await sql`SELECT priority,late,(SELECT count(*)::int FROM support_attachment a JOIN support_message m ON m.id=a.message_id WHERE m.request_id=s.id) photos,
      (SELECT count(*)::int FROM admin_alert WHERE support_request_id=s.id AND kind='support_urgent') alerts,
      (SELECT state::text FROM booking_order WHERE id=s.order_id) order_state,
      (SELECT count(*)::int FROM refund r JOIN payment_transaction t ON t.id=r.transaction_id WHERE t.id=${order.transactionId}) refunds
      FROM support_request s WHERE id=${caseId}`;
  check(
    '4.1/4.2 saved urgent, 2 photos, alert raised, no refund or order change',
    saved.priority === 'urgent' &&
      saved.photos === 2 &&
      saved.alerts >= 1 &&
      saved.order_state === 'completed' &&
      saved.refunds === 0,
    saved,
    'sql',
  );
  await audit('guest-urgent-case', guest);
  // Plain booking-help request, no photos.
  await guest.goto(`${web}/support/new?order=${order.orderId}`, { waitUntil: 'networkidle' });
  await guest.locator('select[name="category"]').selectOption('booking');
  await guest.locator('input[name="subject"]').fill(`Arrival question ${actionWidth}`);
  await guest
    .locator('textarea[name="body"]')
    .fill('What time can we arrive on our next visit to this property please?');
  await guest.getByRole('button', { name: 'Send support request' }).click();
  await guest.waitForURL(/\/support\/[0-9a-f-]{36}$/);
  await guest.getByRole('heading', { name: `Arrival question ${actionWidth}` }).waitFor();
  const plain = await text(guest);
  check(
    '4.1 plain request saved without urgent block',
    !plain.includes('Marked urgent') && plain.includes(`Arrival question ${actionWidth}`),
  );

  // ---- 4.2 admin queue views ----
  const admin = await as('admin');
  const view = async (name) => {
    await admin.goto(`${web}/admin/support?view=${name}&state=all`, { waitUntil: 'networkidle' });
    return text(admin);
  };
  const urgent = await view('urgent');
  check(
    '4.2 urgent view lists case with badge and no reply yet',
    urgent.includes(caseRef) && urgent.includes('Urgent') && urgent.includes('No reply yet'),
  );
  await audit('admin-urgent-view', admin);
  const aged = await view('aged');
  check('4.2 aged view lists 13h case', /Aged 1[34]h/.test(aged) && aged.includes('SUP-AGED-'));
  check('4.2 unassigned view lists new case', (await view('unassigned')).includes(caseRef));
  await sql`UPDATE admin_alert SET email_state='failed' WHERE support_request_id=${caseId}`;
  check('fixture: alert email marked failed', true, '', 'fixture');
  const failed = await view('failed_delivery');
  check(
    '4.2 failed-delivery view lists case with badge',
    failed.includes(caseRef) && failed.includes('Alert email failed'),
  );

  // ---- 4.3 private note vs guest reply ----
  await admin.goto(`${web}/admin/support/${caseId}`, { waitUntil: 'networkidle' });
  let detail = await text(admin);
  check(
    '4.1 admin sees structured issue, photos and alert delivery',
    detail.includes("Can't get in") &&
      detail.includes('Fix it during my stay') &&
      (await admin.getByRole('link', { name: /Private photo/ }).count()) === 2 &&
      detail.includes('Email failed'),
  );
  check('4.2 first reply shows none yet', detail.includes('No reply yet'));
  await admin.getByRole('tab', { name: 'Private note' }).click();
  check(
    '4.3 note tab states admin-only audience',
    await admin.getByText('Only Rentra admins can see this.').isVisible(),
  );
  await admin.getByRole('textbox', { name: 'Private note' }).fill(NOTE);
  await admin.getByRole('button', { name: 'Save private note' }).click();
  await admin.locator('ol > li', { hasText: NOTE }).waitFor();
  detail = await text(admin);
  check(
    '4.3 note saved, labelled private, first reply untouched',
    detail.includes('· Private note') && detail.includes('No reply yet'),
  );
  await admin.getByRole('tab', { name: 'Reply to guest' }).click();
  await admin.getByRole('textbox', { name: 'Your reply' }).fill(REPLY);
  await admin.getByRole('button', { name: 'Send to guest' }).click();
  await admin.locator('ol > li', { hasText: REPLY }).waitFor();
  const [firstResponse] =
    await sql`SELECT first_response_at FROM support_request WHERE id=${caseId}`;
  check(
    '4.2/4.3 guest reply sets first response',
    firstResponse.first_response_at != null,
    '',
    'sql',
  );
  await guest.goto(`${web}/support/${caseId}`, { waitUntil: 'networkidle' });
  const guestThread = await text(guest);
  check(
    '4.3 guest sees reply, never the private note',
    guestThread.includes(REPLY) &&
      !guestThread.includes('PRIVATE-NOTE') &&
      !guestThread.includes('Private note'),
  );
  const reader = await as('supportReader');
  await reader.goto(`${web}/admin/support/${caseId}`, { waitUntil: 'networkidle' });
  const tabs = await reader.getByRole('tab').allTextContents();
  check(
    '4.3 support-read admin gets only the note tab, no remedy controls',
    tabs.length === 1 &&
      tabs[0] === 'Private note' &&
      (await reader.getByRole('button', { name: /Save decision|Execute award/ }).count()) === 0,
    tabs,
  );

  // ---- 4.4 remedy preview and decision ----
  await admin.goto(`${web}/admin/support/${caseId}`, { waitUntil: 'networkidle' });
  const remedy = admin.locator('section', { has: admin.getByRole('heading', { name: 'Remedy' }) });
  const decide = async (kind, pct) => {
    await remedy
      .getByRole('radio', {
        name: kind === 'deny' ? 'Decline with a reason' : 'Award a cumulative refund target',
      })
      .check();
    if (kind === 'award') {
      await remedy.getByRole('spinbutton').fill(String(pct));
      await remedy.getByRole('radio', { name: 'Owner-funded' }).check();
      await remedy
        .getByText('Owner-funded fee treatment is a projection pending owner terms')
        .waitFor();
      await remedy.locator('[aria-label="Remedy preview"][aria-busy="false"]').waitFor();
    }
    await remedy
      .locator('textarea')
      .first()
      .fill(kind === 'deny' ? `Declined first: ${REASON}` : REASON);
    const save = remedy.getByRole('button', { name: 'Save decision' });
    await admin.waitForFunction((el) => !el.disabled, await save.elementHandle());
    await save.click();
    await admin
      .locator('section[aria-label="Active decision"]', {
        hasText: kind === 'deny' ? 'Declined' : `Award ${pct}% · Owner-funded`,
      })
      .waitFor();
  };
  check(
    '4.4 Test-mode label shown',
    (await remedy.innerText()).includes('Test mode — saving moves no money'),
  );
  if (actionWidth === 390) {
    await decide('deny');
    await guest.goto(`${web}/support/${caseId}`, { waitUntil: 'networkidle' });
    const declined = await text(guest);
    check(
      '4.6 guest sees Declined with reason, no refund block',
      declined.includes(`Declined. Declined first: ${REASON}`) &&
        (await guest.locator('#case-refund').count()) === 0,
    );
    await admin.reload({ waitUntil: 'networkidle' });
  }
  await remedy.getByRole('radio', { name: 'Award a cumulative refund target' }).check();
  await remedy.getByRole('spinbutton').fill('100');
  await remedy.getByRole('radio', { name: 'Owner-funded' }).check();
  await remedy.locator('[aria-label="Remedy preview"][aria-busy="false"]').waitFor();
  await admin.waitForTimeout(800);
  const preview = await remedy.locator('[aria-label="Remedy preview"]').innerText();
  check(
    '4.4 preview: paid ₹1,080, additional ₹1,080, provider call at execution',
    preview.includes('₹1,080') &&
      /Additional guest refund due\s*₹1,080/.test(preview) &&
      preview.includes('Yes, at execution'),
    preview,
  );
  await decide('award', 100);
  const [decision] =
    await sql`SELECT kind,target_pct,responsibility,(SELECT count(*)::int FROM incident_remedy_decision WHERE support_request_id=${caseId}) total,
      (SELECT count(*)::int FROM refund WHERE transaction_id=${order.transactionId}) refunds
      FROM incident_remedy_decision WHERE support_request_id=${caseId} AND superseded_at IS NULL`;
  check(
    '4.4 active owner-funded 100% decision saved, history kept, no money moved',
    decision?.kind === 'award' &&
      decision.target_pct === 100 &&
      decision.responsibility === 'owner_funded' &&
      decision.total === (actionWidth === 390 ? 2 : 1) &&
      decision.refunds === 0,
    decision,
    'sql',
  );
  await guest.goto(`${web}/support/${caseId}`, { waitUntil: 'networkidle' });
  check(
    '4.6 guest sees approved award before execution, no refund line',
    (await text(guest)).includes('100% refund approved — refund being prepared.') &&
      (await guest.locator('#case-refund').count()) === 0,
  );

  // ---- 4.5 execute award (Test) and repayment link ----
  await admin.reload({ waitUntil: 'networkidle' });
  await remedy.getByRole('button', { name: 'Execute award (Test)' }).click();
  const confirm = await remedy.getByRole('group', { name: 'Confirm execution' }).innerText();
  check(
    '4.5 confirm states refund and owner obligation',
    confirm.includes('₹1,080') && confirm.includes('₹80'),
    confirm,
  );
  await remedy.getByRole('button', { name: 'Confirm and execute' }).click();
  const executed = admin.getByRole('region', { name: 'Executed awards' });
  await executed.waitFor();
  const rows = await executed.innerText();
  check(
    '4.5 execution rows: queued Test refund ₹1,080, owner obligation ₹80 due',
    /Guest refund .* \(Test\)\s*₹1,080 · Queued/.test(rows) && rows.includes('₹80 · Due'),
    rows,
  );
  [{ id: refundId }] =
    await sql`SELECT id FROM refund WHERE transaction_id=${order.transactionId} AND reason LIKE ${'Rentra support case ' + caseRef + '%'}`;
  check('4.5 refund reason carries case prefix', Boolean(refundId), '', 'sql');
  await executed.getByRole('button', { name: 'Create repayment link' }).click();
  await executed.getByText(/Repayment link: Open — waiting for owner payment · ₹80/).waitFor();
  check('4.5 admin created ₹80 incident repayment link', true);
  await audit('admin-case-executed', admin);

  // ---- 4.6 guest, owner and admin tracking ----
  await guest.goto(`${web}/support/${caseId}`, { waitUntil: 'networkidle' });
  let g = await text(guest);
  check(
    '4.6 guest Decision and separate Refund block: Queued',
    g.includes('100% refund approved.') &&
      (await guest.locator('#case-refund').count()) === 1 &&
      /₹1,080[\s\S]*Queued/.test(
        await guest.locator('section[aria-labelledby="case-refund"]').innerText(),
      ),
  );
  check(
    '4.6 guest sees no owner responsibility or note',
    !/owner[- ]funded|obligation|PRIVATE-NOTE/i.test(g),
  );
  await audit('guest-case-decision', guest);
  const owner = await as('owner');
  await owner.goto(`${web}/partner/earnings`, { waitUntil: 'networkidle' });
  const earnings = await owner.locator('body').innerText();
  check(
    '4.6 owner sees incident case row with reference, outcome and reason',
    earnings.includes(`Incident case ${caseRef}`) &&
      earnings.includes('100% refund, owner funded') &&
      earnings.includes(REASON),
  );
  check(
    '4.6 owner sees no guest details, photos or note',
    !earnings.includes('GUEST-DETAILS') &&
      !earnings.includes('PRIVATE-NOTE') &&
      !earnings.includes('Private photo'),
  );
  await audit('owner-earnings', owner);
  if (actionWidth === 1440) {
    await sql`UPDATE refund SET state='unknown' WHERE id=${refundId}`;
    check(
      'fixture: refund outcome set unknown (as the dispatcher does on provider error)',
      true,
      '',
      'fixture',
    );
    await guest.reload({ waitUntil: 'networkidle' });
    g = await guest.locator('section[aria-labelledby="case-refund"]').innerText();
    check(
      '4.6 guest unknown refund reads Needs attention with reference',
      g.includes('Needs attention — Rentra is checking'),
      g,
    );
    await admin.reload({ waitUntil: 'networkidle' });
    const link = executed.getByRole('link', { name: /needs investigation/ });
    check(
      '4.6 admin needs-investigation link to refund operations, no retry on case',
      (await link.getAttribute('href')) === `/admin/finance/refunds/${refundId}` &&
        (await remedy.getByRole('button', { name: /retry/i }).count()) === 0,
    );
    await link.click();
    await admin.waitForURL(new RegExp(`/admin/finance/refunds/${refundId}`));
    check('4.6 refund operations page opens', (await text(admin)).length > 0, admin.url());
  } else {
    // One transaction: the deferred ledger trigger checks refund and allocation totals together.
    await sql.begin(async (tx) => {
      await tx`UPDATE refund SET state='succeeded',actual_minor=expected_minor,provider_refund_id='rfnd_EPIC4QA',verified_at=now(),evidence_hash=${'e'.repeat(64)} WHERE id=${refundId}`;
      await tx`UPDATE refund_allocation SET actual_minor=expected_minor WHERE refund_id=${refundId}`;
    });
    check(
      'fixture: refund verified succeeded (stands in for provider verification)',
      true,
      '',
      'fixture',
    );
    await guest.reload({ waitUntil: 'networkidle' });
    g = await guest.locator('section[aria-labelledby="case-refund"]').innerText();
    check('4.6 guest verified refund reads Refunded', g.includes('Refunded'), g);
  }
  check('no runtime or hydration errors', runtimeErrors.length === 0, runtimeErrors);
} catch (error) {
  check('runner completed', false, error.stack || String(error));
}
await browser.close();
await sql.end();
const failedChecks = checks.filter((c) => !c.ok);
await writeFile(
  resultFile,
  JSON.stringify(
    {
      status: failedChecks.length ? 'failed' : 'passed',
      actionWidth,
      ranAt: new Date().toISOString(),
      caseReference: caseRef,
      passed: checks.length - failedChecks.length,
      failed: failedChecks.length,
      checks,
    },
    null,
    2,
  ),
);
console.log(`${checks.length - failedChecks.length}/${checks.length} passed`);
process.exitCode = failedChecks.length ? 1 : 0;
