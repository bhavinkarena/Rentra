// CP14 browser/API gate. Requires the disposable published fixture on :4106 seeded with
// seed-pricing-operations-gate.mjs then seed-booking-cases-gate.mjs, and isolated Next on :3106.
// This gate has not passed until its output says so.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const results = [];
const check = (name, pass, info) => {
  results.push({ check: name, pass: !!pass });
  console.log(
    `${pass ? 'PASS' : 'FAIL'} ${name}${pass || info === undefined ? '' : ' ' + JSON.stringify(info)}`,
  );
};
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const ctx = async (kind) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (kind)
      await c.addCookies([
        {
          name: ['admin', 'limited'].includes(kind) ? 'rentra_admin' : 'rentra_session',
          value: fixture.tokens[kind],
          url: web,
        },
      ]);
    return c;
  };
  const owner = await ctx('owner'),
    other = await ctx('other'),
    admin = await ctx('admin'),
    limited = await ctx('limited'),
    customer = await ctx('customer'),
    anon = await ctx();
  const { order, visits, changeDate } = fixture.paid;
  const [v1, v2] = visits;
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (label, target) => {
    check(
      `${label} no overflow`,
      await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await target.addScriptTag({ content: axe });
    const violations = await target.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html.slice(0, 120)) })),
    );
    check(`${label} axe clean`, !violations.length, violations);
  };
  const disclosure = (page, summary) =>
    page
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: summary }) })
      .first();
  const record = async (c, scope) =>
    (await (await c.request.get(`${api}/${scope}/records/${order}`)).json()).data;
  const caseBody = {
    orderId: order,
    type: 'owner_cancellation',
    visitId: v1.id,
    reason: 'Probe request from the wrong account.',
    requestKey: randomUUID(),
  };

  check(
    'anonymous case request denied',
    (await anon.request.post(`${api}/partner/records/cases`, { data: caseBody })).status() === 401,
  );
  check(
    'foreign owner cannot open a case on the booking',
    (await other.request.post(`${api}/partner/records/cases`, { data: caseBody })).status() === 404,
  );
  check(
    'owner cookie cannot read the admin case queue',
    (await owner.request.get(`${api}/admin/records/cases`)).status() === 401,
  );

  // Owner asks Rentra to cancel visit 1 from the booking page, then messages Rentra.
  const page = await owner.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${web}/partner/bookings/${order}`, { waitUntil: 'networkidle' });
  const create = disclosure(page, 'Ask Rentra to cancel or report a problem');
  await create.locator('summary').click();
  await create.getByLabel('Request type').selectOption('owner_cancellation');
  await create.getByRole('checkbox', { name: new RegExp(v1.reference) }).check();
  await create
    .getByLabel('Reason')
    .fill('Water pump failure; the farmhouse cannot host guests that day.');
  await create.getByRole('button', { name: 'Send request to Rentra', exact: true }).click();
  await page
    .getByText(/CASE-[0-9A-F]{10}/)
    .first()
    .waitFor();
  const ownerCase = (await record(owner, 'partner')).cases.find((c) => c.requestedByYou);
  check(
    'owner request opens an open case for exactly one visit',
    ownerCase?.state === 'open' &&
      ownerCase.visitIds.length === 1 &&
      ownerCase.visitIds[0] === v1.id,
  );
  check(
    'owner sees Rentra acknowledge without any booking change',
    await page.getByText(/nothing about the booking has changed yet/).isVisible(),
  );
  const message = page
    .locator('form')
    .filter({ has: page.getByLabel('Message Rentra about this request') });
  await message
    .getByLabel('Message Rentra about this request')
    .fill('The repair is booked for the following week.');
  await message.getByRole('button', { name: 'Add update', exact: true }).click();
  await page.getByText('The repair is booked for the following week.').waitFor();
  check(
    'owner message recorded',
    (await record(owner, 'partner')).cases[0].updates.some((u) => u.author === 'You'),
  );
  check(
    'booking unchanged while the case is open',
    (await record(owner, 'partner')).visits.every((v) => v.state === 'confirmed'),
  );

  // Read-only admin can look, not act.
  check(
    'read-only admin can read the case queue',
    (await limited.request.get(`${api}/admin/records/cases`)).status() === 200,
  );
  check(
    'read-only admin cannot preview or resolve',
    (
      await limited.request.post(`${api}/admin/records/cases/preview`, {
        data: { caseId: ownerCase.id, basis: 'full' },
      })
    ).status() === 403 &&
      (
        await limited.request.post(`${api}/admin/records/cases/resolve`, {
          data: {
            caseId: ownerCase.id,
            version: '1',
            outcome: 'declined',
            note: 'Read-only attempt to decline.',
            audience: 'internal',
            requestKey: randomUUID(),
          },
        })
      ).status() === 403,
  );

  // Admin: queue → case → assign → preview → confirm.
  const adminPage = await admin.newPage();
  adminPage.setDefaultTimeout(30000);
  await adminPage.goto(`${web}/admin/booking-cases?state=open&assigned=unassigned`, {
    waitUntil: 'networkidle',
  });
  const caseLink = adminPage.getByRole('link', { name: `Open case ${ownerCase.reference}` });
  await caseLink.focus();
  check(
    'case queue link keyboard focusable',
    await caseLink.evaluate((el) => el === document.activeElement),
  );
  await caseLink.click();
  await adminPage.getByRole('heading', { name: 'Visits in this case' }).waitFor();
  await adminPage.getByLabel('Assigned to').selectOption({ label: 'Reviewer' });
  await adminPage.getByRole('button', { name: 'Save assignment', exact: true }).click();
  await adminPage.getByText('Assigned to Reviewer.').waitFor();
  check('admin assigns the case', true);
  await adminPage.getByRole('radio', { name: 'Cancel the listed visits (previewed)' }).check();
  check(
    'owner cancellation defaults to a full refund',
    await adminPage.getByRole('radio', { name: /Full refund of rent and fee/ }).isChecked(),
  );
  await adminPage.getByRole('button', { name: 'Preview effects', exact: true }).click();
  const preview = adminPage.getByRole('status', { name: 'Resolution preview' });
  await preview.waitFor();
  const previewText = await preview.innerText();
  check(
    'preview names the exact visit, release, refund and unaffected visit',
    previewText.includes(v1.reference) &&
      /cancel, release/.test(previewText) &&
      /1 other visit\(s\) stay booked/.test(previewText) &&
      !previewText.includes(v2.reference),
    previewText,
  );
  const version = (
    await (await admin.request.get(`${api}/admin/records/cases/${ownerCase.id}`)).json()
  ).data.version;
  const apiPreview = (
    await (
      await admin.request.post(`${api}/admin/records/cases/preview`, {
        data: { caseId: ownerCase.id, basis: 'full' },
      })
    ).json()
  ).data;
  check(
    'preview refund equals rent plus fee of visit 1 only',
    apiPreview.preview.refundMinor === v1.refundMinor && apiPreview.preview.cancelCount === 1,
    apiPreview.preview,
  );
  check(
    'stale preview refused',
    (
      await admin.request.post(`${api}/admin/records/cases/resolve`, {
        data: {
          caseId: ownerCase.id,
          version: String(version),
          outcome: 'visits_cancelled',
          basis: 'full',
          hash: 'f'.repeat(64),
          note: 'Stale confirmation attempt.',
          audience: 'internal',
          requestKey: randomUUID(),
        },
      })
    ).status() === 409,
  );
  check(
    'previews wrote nothing',
    (await record(admin, 'admin')).payments.every((p) => !p.refunds.length),
  );
  await adminPage
    .getByLabel('Resolution note')
    .fill('Owner cannot host; the guest receives a full Test refund.');
  await adminPage.getByLabel('Who can read the resolution').selectOption('everyone');
  await adminPage.getByRole('button', { name: /^Confirm: cancel 1 visit\(s\)/ }).click();
  await adminPage.getByText('Visits cancelled').first().waitFor();
  const after = await record(admin, 'admin');
  check(
    'confirmation cancels visit 1 only; the booking stays confirmed',
    after.visits.find((v) => v.id === v1.id).state === 'cancelled' &&
      after.visits.find((v) => v.id === v2.id).state === 'confirmed' &&
      after.state === 'confirmed',
  );
  const refunds = after.payments.flatMap((p) => p.refunds);
  check(
    'exactly one Test refund obligation for the previewed amount',
    refunds.length === 1 && Number(refunds[0].expectedMinor) === v1.refundMinor,
    refunds,
  );
  check(
    'repeat resolution refused without a second refund',
    (
      await admin.request.post(`${api}/admin/records/cases/resolve`, {
        data: {
          caseId: ownerCase.id,
          version: String(version),
          outcome: 'visits_cancelled',
          basis: 'full',
          hash: apiPreview.hash,
          note: 'Double submission attempt.',
          audience: 'internal',
          requestKey: randomUUID(),
        },
      })
    ).status() === 409 &&
      (await record(admin, 'admin')).payments.flatMap((p) => p.refunds).length === 1,
  );
  await page.reload({ waitUntil: 'networkidle' });
  check(
    'owner sees the resolution',
    await page.getByText(/Visits cancelled\. Owner cannot host/).isVisible(),
  );

  // Customer page: existing booking view still renders, with only customer-visible updates.
  const customerPage = await customer.newPage();
  customerPage.setDefaultTimeout(30000);
  await customerPage.goto(`${web}/bookings/${order}`, { waitUntil: 'networkidle' });
  check(
    'customer booking page still renders',
    await customerPage.getByRole('heading', { name: 'Your visits', exact: true }).isVisible(),
  );
  check(
    'customer sees the shared resolution',
    (await customerPage.getByRole('heading', { name: 'Updates from Rentra' }).isVisible()) &&
      (await customerPage.getByText(/Owner cannot host/).count()) > 0,
  );
  check(
    'customer never sees owner-only messages',
    (await customerPage.getByText('The repair is booked for the following week.').count()) === 0,
  );
  const customerData = (
    await (await customer.request.get(`${api}/customer/records/${order}`)).json()
  ).data;
  check(
    'customer record carries no case internals',
    customerData.cases.every((c) => Object.keys(c).sort().join() === 'reference,state,updates'),
  );

  // Admin change request on behalf of the customer: availability checked, never reserved; declined.
  await adminPage.goto(`${web}/admin/bookings/${order}?tab=cases`, { waitUntil: 'networkidle' });
  const open = disclosure(adminPage, 'Open a booking case');
  await open.locator('summary').click();
  await open.getByLabel('Request type').selectOption('change_request');
  await open.getByRole('checkbox', { name: new RegExp(v2.reference) }).check();
  await open.getByLabel('Received through').selectOption('email');
  await open.getByLabel('New date').fill(changeDate);
  await open
    .getByLabel('Reason')
    .fill('Customer emailed asking to move the second visit one day later.');
  await open.getByRole('button', { name: 'Open case', exact: true }).click();
  await adminPage.getByRole('link', { name: /CASE-/ }).nth(1).waitFor();
  const changeCase = (await record(admin, 'admin')).cases.find((c) => c.type === 'change_request');
  await adminPage.goto(`${web}/admin/booking-cases/${changeCase.id}`, { waitUntil: 'networkidle' });
  await adminPage.getByRole('radio', { name: 'Cancel the listed visits (previewed)' }).check();
  await adminPage.getByRole('button', { name: 'Preview effects', exact: true }).click();
  await adminPage.getByRole('status', { name: 'Resolution preview' }).waitFor();
  check(
    'change preview checks new dates and says nothing is reserved',
    await adminPage.getByText(/Nothing is reserved/).isVisible(),
  );
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await scan('admin case resolve mobile', adminPage);
  await adminPage.setViewportSize({ width: 1280, height: 950 });
  await adminPage.getByRole('radio', { name: 'Decline the request' }).check();
  await adminPage
    .getByLabel('Resolution note')
    .fill('Please book the new date through Book again; nothing was held.');
  await adminPage.getByLabel('Who can read the resolution').selectOption('customer');
  await adminPage.getByRole('button', { name: 'Resolve case', exact: true }).click();
  await adminPage.getByText('Declined').first().waitFor();
  const stillBooked = await record(admin, 'admin');
  check(
    'declined change leaves visit 2 booked with no new refund',
    stillBooked.visits.find((v) => v.id === v2.id).state === 'confirmed' &&
      stillBooked.payments.flatMap((p) => p.refunds).length === 1,
  );
  check(
    'owner does not see the customer-only change request',
    !(await record(owner, 'partner')).cases.some((c) => c.id === changeCase.id),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  await disclosure(page, 'Ask Rentra to cancel or report a problem').locator('summary').click();
  await scan('owner requests mobile', page);
  await adminPage.goto(`${web}/admin/booking-cases?state=all`, { waitUntil: 'networkidle' });
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await scan('admin case queue mobile', adminPage);

  await owner.request.post(`${api}/auth/logout`);
  check(
    'revocation blocks the next owner request',
    (
      await owner.request.post(`${api}/partner/records/cases`, {
        data: { ...caseBody, requestKey: randomUUID() },
      })
    ).status() === 401,
  );
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part14-gate.json', import.meta.url),
    JSON.stringify({ results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
