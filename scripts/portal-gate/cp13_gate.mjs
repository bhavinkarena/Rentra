// CP13 browser/API gate. Requires the disposable published fixture on :4106 seeded with
// seed-pricing-operations-gate.mjs then seed-visit-evidence-gate.mjs, and isolated Next on :3106.
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
const onePixel = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);
const pngA = onePixel,
  pngB = Buffer.concat([onePixel, Buffer.from('second photo')]);
const indiaNow = (minutesAgo) =>
  new Date(Date.now() + 330 * 60000 - minutesAgo * 60000).toISOString().slice(0, 16);
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
    anon = await ctx();
  const order = fixture.booking.order,
    visitId = fixture.operationalVisit;
  const detail = async (c = owner, scope = 'partner') =>
    (await (await c.request.get(`${api}/${scope}/records/${order}`)).json()).data;
  const visit = async (c, scope) => (await detail(c, scope)).visits.find((v) => v.id === visitId);
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

  check(
    'anonymous attachment request denied',
    (
      await anon.request.get(`${api}/partner/records/${order}/attachments/${randomUUID()}`)
    ).status() === 401,
  );

  // Owner: an unsupported file is refused with the typed evidence kept, then a real upload succeeds.
  const page = await owner.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${web}/partner/bookings/${order}`, { waitUntil: 'networkidle' });
  let handover = disclosure(page, 'Record handover evidence');
  await handover.locator('summary').click();
  const note = 'Guest keys handed over after the arrival inspection with the group leader.';
  await handover.getByLabel('When it occurred (India time)').fill(indiaNow(5));
  await handover.getByLabel('Evidence: what you observed').fill(note);
  await handover
    .getByLabel('Photos (optional)')
    .setInputFiles([
      { name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('GIF89a' + 'x'.repeat(64)) },
    ]);
  await handover.getByRole('checkbox').check();
  await handover.getByRole('button', { name: 'Record handover', exact: true }).click();
  await handover.getByText('Photos must be JPG, PNG or WebP images.').waitFor();
  check(
    'unsupported photo refused, typed evidence kept',
    (await handover.getByLabel('Evidence: what you observed').inputValue()) === note,
  );
  check('refused upload recorded nothing', (await visit(owner, 'partner')).evidence.length === 0);
  await handover.getByLabel('Photos (optional)').setInputFiles([
    { name: 'arrival-1.png', mimeType: 'image/png', buffer: pngA },
    { name: 'arrival-2.png', mimeType: 'image/png', buffer: pngB },
  ]);
  await handover.getByRole('button', { name: 'Record handover', exact: true }).click();
  await page
    .getByRole('link', { name: /Photo 2 ·/ })
    .first()
    .waitFor();
  const recorded = (await visit(owner, 'partner')).evidence.find((e) => e.kind === 'handover');
  check(
    'browser handover with two private photos',
    recorded?.attachments.length === 2 && recorded.nature === 'actual',
  );
  check(
    'no storage key in the record',
    !JSON.stringify(await detail()).match(/storage|visit-evidence\//),
  );
  const evidenceItem = page.locator('li').filter({ hasText: note }).first();
  check(
    'evidence shows actor, visit version and actual badge',
    (await evidenceItem.getByText('You', { exact: false }).count()) > 0 &&
      (await evidenceItem.getByText(/recorded against visit version \d+/).isVisible()) &&
      (await evidenceItem.getByText('Actual', { exact: true }).isVisible()),
  );

  // Photo reads: same-origin, private headers, exact bytes; foreign, guessed and mismatched ids 404.
  const photoId = recorded.attachments[0].id;
  const photoPath = `/partner/bookings/${order}/attachments/${photoId}`;
  const opened = await owner.request.get(web + photoPath);
  const headers = opened.headers();
  check(
    'owner opens photo through the same-origin link',
    opened.status() === 200 &&
      headers['content-type'] === 'image/png' &&
      headers['x-content-type-options'] === 'nosniff' &&
      /sandbox/.test(headers['content-security-policy'] ?? '') &&
      /no-store/.test(headers['cache-control'] ?? '') &&
      Buffer.compare(await opened.body(), pngA) === 0,
    { status: opened.status(), headers },
  );
  check(
    'foreign owner photo link 404',
    (await other.request.get(web + photoPath)).status() === 404,
  );
  check(
    'foreign owner photo API 404',
    (await other.request.get(`${api}/partner/records/${order}/attachments/${photoId}`)).status() ===
      404,
  );
  check(
    'guessed photo id 404',
    (
      await owner.request.get(`${api}/partner/records/${order}/attachments/${randomUUID()}`)
    ).status() === 404,
  );
  check(
    'photo under another order id 404',
    (
      await owner.request.get(`${api}/partner/records/${randomUUID()}/attachments/${photoId}`)
    ).status() === 404,
  );
  check(
    'admin opens photo',
    (await admin.request.get(`${web}/admin/bookings/${order}/attachments/${photoId}`)).status() ===
      200,
  );
  check(
    'read-only admin can view photo',
    (await limited.request.get(`${api}/admin/records/${order}/attachments/${photoId}`)).status() ===
      200,
  );
  const photoLink = page.getByRole('link', { name: /Photo 1 ·/ }).first();
  await photoLink.focus();
  check(
    'photo link keyboard focusable',
    await photoLink.evaluate((el) => el === document.activeElement),
  );

  // Incident with a photo from the owner's browser; replay and foreign reports.
  const report = disclosure(page, 'Report an incident');
  await report.locator('summary').click();
  await report.getByLabel('Type').selectOption('damage');
  await report.getByLabel('When it happened (India time)').fill(indiaNow(3));
  await report.getByLabel('Short summary').fill('Broken garden chair');
  await report
    .getByLabel('What happened')
    .fill('One garden chair was found broken beside the pool during the visit.');
  await report
    .getByLabel('Photos (optional)')
    .setInputFiles([{ name: 'chair.png', mimeType: 'image/png', buffer: pngB }]);
  await report.getByRole('checkbox').check();
  await report.getByRole('button', { name: 'Report incident', exact: true }).click();
  await page
    .getByText(/INC-[0-9A-F]{10}/)
    .first()
    .waitFor();
  const reported = (await visit(owner, 'partner')).incidents;
  check(
    'browser incident with photo is open',
    reported.length === 1 && reported[0].state === 'open' && reported[0].attachments.length === 1,
  );
  const incidentBody = {
    visitId,
    category: 'access',
    summary: 'Gate code confusion',
    description: 'The guest group could not open the side gate at arrival and waited ten minutes.',
    occurredAt: indiaNow(2),
    attested: 'on',
    requestKey: randomUUID(),
  };
  const firstReplay = await owner.request.post(`${api}/partner/records/incident`, {
    data: incidentBody,
  });
  const secondReplay = await owner.request.post(`${api}/partner/records/incident`, {
    data: incidentBody,
  });
  check(
    'incident replay is one effect',
    firstReplay.ok() && secondReplay.ok() && (await visit(owner, 'partner')).incidents.length === 2,
  );
  check(
    'foreign owner cannot report on the visit',
    (
      await other.request.post(`${api}/partner/records/incident`, {
        data: { ...incidentBody, requestKey: randomUUID() },
      })
    ).status() === 404,
  );
  const queue = async (c, scope) =>
    (await (await c.request.get(`${api}/${scope}/records?tab=action_needed`)).json()).data;
  check(
    'open incident is admin work, not owner work',
    (await queue(admin, 'admin')).items.some((i) => i.id === order) &&
      (await queue(owner, 'partner')).total === 0,
  );

  // Admin: read-only is refused; closure and correction from the browser.
  const openIncident = (await visit(admin, 'admin')).incidents.find((i) => i.category === 'damage');
  check(
    'read-only admin cannot close incident',
    (
      await limited.request.post(`${api}/admin/records/incident/close`, {
        data: {
          incidentId: openIncident.id,
          version: '1',
          resolutionNote: 'Read-only attempt to close.',
        },
      })
    ).status() === 403,
  );
  check(
    'read-only admin cannot correct evidence',
    (
      await limited.request.post(`${api}/admin/records/evidence/correct`, {
        data: {
          evidenceId: recorded.id,
          supersedesId: '',
          reason: 'Read-only attempt.',
          correctedNote: 'Read-only attempt to correct the note.',
          requestKey: randomUUID(),
        },
      })
    ).status() === 403,
  );
  check(
    'owner cannot use the admin correction route',
    (
      await owner.request.post(`${api}/admin/records/evidence/correct`, {
        data: { evidenceId: recorded.id },
      })
    ).status() === 401,
  );
  const adminPage = await admin.newPage();
  adminPage.setDefaultTimeout(30000);
  await adminPage.goto(`${web}/admin/bookings/${order}?tab=visits`, { waitUntil: 'networkidle' });
  const close = disclosure(adminPage, `Close ${openIncident.reference}`);
  await close.locator('summary').click();
  await close
    .getByLabel('Resolution note')
    .fill('Owner replaced the chair; no guest charge is raised through this record.');
  await close.getByRole('button', { name: 'Close incident', exact: true }).click();
  await adminPage
    .getByText(/Owner replaced the chair/)
    .first()
    .waitFor();
  check(
    'admin closes incident in the browser',
    (await visit(admin, 'admin')).incidents.find((i) => i.id === openIncident.id).state ===
      'closed',
  );
  check(
    'stale incident close refused',
    (
      await admin.request.post(`${api}/admin/records/incident/close`, {
        data: {
          incidentId: openIncident.id,
          version: '1',
          resolutionNote: 'A second, stale closure attempt.',
        },
      })
    ).status() === 409,
  );
  const correction = disclosure(adminPage, 'Record a correction');
  await correction.locator('summary').click();
  await correction
    .getByLabel('Reason for the correction')
    .fill('Owner clarified who received the keys.');
  await correction
    .getByLabel('Corrected note (optional)')
    .fill('Keys handed to the named guest leader after the arrival walkthrough.');
  await correction.getByRole('button', { name: 'Save correction', exact: true }).click();
  await adminPage.getByText('Original and 1 correction').waitFor();
  const corrected = (await visit(admin, 'admin')).evidence.find((e) => e.id === recorded.id);
  check(
    'admin correction supersedes without erasing the original',
    corrected.corrected &&
      corrected.original.note === note &&
      corrected.note.startsWith('Keys handed to the named'),
  );
  check(
    'stale correction refused',
    (
      await admin.request.post(`${api}/admin/records/evidence/correct`, {
        data: {
          evidenceId: recorded.id,
          supersedesId: '',
          reason: 'Prepared against the original.',
          correctedNote: 'A correction prepared before the first one landed.',
          requestKey: randomUUID(),
        },
      })
    ).status() === 409,
  );
  await adminPage.setViewportSize({ width: 390, height: 844 });
  for (const summary of ['Record a correction', 'Report an incident'])
    await disclosure(adminPage, summary).locator('summary').click();
  await scan('admin evidence mobile', adminPage);

  await page.reload({ waitUntil: 'networkidle' });
  check(
    'owner sees the correction but has no correction form',
    (await page.getByText('Corrected', { exact: true }).count()) > 0 &&
      (await page.locator('summary', { hasText: 'Record a correction' }).count()) === 0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const summary of ['Record return evidence', 'Report an incident'])
    await disclosure(page, summary).locator('summary').click();
  await scan('owner evidence mobile', page);

  await owner.request.post(`${api}/auth/logout`);
  check(
    'revocation blocks the next photo read',
    (await owner.request.get(`${api}/partner/records/${order}/attachments/${photoId}`)).status() ===
      401,
  );
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part13-gate.json', import.meta.url),
    JSON.stringify({ results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
