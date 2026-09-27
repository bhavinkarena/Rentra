import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8')),
  web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  }),
  results = [];
const check = (name, pass) => {
  results.push({ check: name, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
};
let completed = false;
try {
  const context = async (kind) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (kind)
      await c.addCookies([
        {
          name: ['admin', 'limited', 'second'].includes(kind) ? 'rentra_admin' : 'rentra_session',
          value: f.tokens[kind],
          url: web,
        },
      ]);
    return c;
  };
  const owner = await context('owner'),
    other = await context('other'),
    admin = await context('admin'),
    customer = await context('customer'),
    limited = await context('limited'),
    anon = await context();
  check(
    'anonymous support denied',
    (await anon.request.get(`${api}/partner/support`)).status() === 401,
  );
  check(
    'customer audience cannot use client support',
    (await customer.request.get(`${api}/partner/support`)).status() === 403,
  );
  check(
    'owner audience cannot use admin support',
    (await owner.request.get(`${api}/admin/support`)).status() === 401,
  );
  const page = await owner.newPage();
  page.setDefaultTimeout(30000);
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const scan = async (page, label) => {
    check(
      `${label} no overflow`,
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    );
    await page.addScriptTag({ content: axe });
    const violations = await page.evaluate(async () =>
      (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact),
      ),
    );
    if (violations.length)
      console.log(
        JSON.stringify(violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.html) }))),
      );
    check(`${label} axe clean`, !violations.length);
  };
  await page.goto(`${web}/partner/support`, { waitUntil: 'networkidle' });
  check('client empty inbox', await page.getByText('No requests match this view.').isVisible());
  await page.getByRole('link', { name: 'New support request', exact: true }).click();
  await page.getByLabel('Subject', { exact: true }).fill('CP17 private client request');
  await page
    .getByLabel('How can we help?')
    .fill('Please help us review the arrival instructions for our next visit.');
  await page.getByRole('button', { name: 'Send support request' }).click();
  await page.waitForURL(/\/partner\/support\/[a-f0-9-]+$/);
  const id = page.url().split('/').at(-1);
  const root = `${api}/partner/support/${id}`;
  check(
    'client message persisted',
    (await (await owner.request.get(root)).json()).data.messages.length === 1,
  );
  await scan(page, 'client thread desktop');
  await page.setViewportSize({ width: 390, height: 844 });
  await scan(page, 'client thread mobile');
  check('other owner thread denied', (await other.request.get(root)).status() === 404);
  check(
    'customer cannot read client thread',
    (await customer.request.get(`${api}/customer/support/${id}`)).status() === 404,
  );
  const guestInput = {
    category: 'booking',
    subject: 'CP17 private customer request',
    body: 'My private customer conversation must not be shared with the property client.',
    orderId: f.booking.order,
    privacyRequestId: '',
    requestKey: randomUUID(),
  };
  await customer.request.post(`${api}/customer/support`, { data: guestInput });
  const guest = (await (await customer.request.get(`${api}/customer/support`)).json()).data
    .items[0];
  check(
    'owner cannot read customer thread',
    (await owner.request.get(`${api}/partner/support/${guest.id}`)).status() === 404,
  );
  const ap = await admin.newPage();
  await ap.goto(`${web}/admin/support?participant=client&assignment=unassigned`, {
    waitUntil: 'networkidle',
  });
  check(
    'admin participant filter',
    await ap.getByText('CP17 private client request', { exact: true }).isVisible(),
  );
  await scan(ap, 'admin inbox desktop');
  await ap
    .getByRole('link', { name: /Open SUP-/ })
    .first()
    .click();
  await ap.getByLabel('Assigned operator').selectOption(f.ids.admin);
  await ap.getByLabel('Priority').selectOption('urgent');
  await ap.getByLabel('Related support case ID (optional)').fill(guest.id);
  await ap
    .getByLabel('Reason', { exact: true })
    .fill('Coordinate the cases without sharing their messages.');
  await ap.getByRole('button', { name: 'Save assignment', exact: true }).click();
  await ap.getByRole('link', { name: 'Related case (separate thread)' }).waitFor();
  check(
    'assignment and related case persisted',
    (await (await admin.request.get(`${api}/admin/support/${id}`)).json()).data.assignedTo ===
      f.ids.admin,
  );
  const clientRecord = (await (await owner.request.get(root)).json()).data;
  check(
    'admin link and assignment hidden from client',
    !('relatedRequestId' in clientRecord) && !('assignedTo' in clientRecord),
  );
  const raceInput = {
    id,
    version: clientRecord.version,
    assignedTo: f.ids.second,
    priority: 'normal',
    relatedRequestId: guest.id,
    reason: 'Reassign for the next support shift.',
  };
  const race = await Promise.all(
    [1, 2].map(() => admin.request.post(`${api}/admin/support/${id}/manage`, { data: raceInput })),
  );
  check(
    'assignment race one winner',
    race
      .map((r) => r.status())
      .sort()
      .join(',') === '200,409',
  );
  await ap.reload({ waitUntil: 'networkidle' });
  await ap.getByLabel('Visibility').selectOption('true');
  await ap
    .getByLabel('Internal note', { exact: true })
    .fill('ADMIN ONLY: investigate privately without sharing this note.');
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=',
    'base64',
  );
  await ap
    .getByLabel('Private photos', { exact: true })
    .setInputFiles({ name: 'private.png', mimeType: 'image/png', buffer: png });
  await ap.getByRole('button', { name: 'Save internal note', exact: true }).click();
  await ap
    .locator('li')
    .getByText('ADMIN ONLY: investigate privately without sharing this note.', { exact: true })
    .waitFor();
  const internal = (
      await (await admin.request.get(`${api}/admin/support/${id}`)).json()
    ).data.messages.find((m) => m.internal),
    privatePhoto = internal.attachments[0].id;
  await page.reload({ waitUntil: 'networkidle' });
  check('internal note absent from client DOM', !(await page.getByText(/ADMIN ONLY/).count()));
  check(
    'internal photo denied to client',
    (await owner.request.get(`${root}/attachments/${privatePhoto}`)).status() === 404,
  );
  check(
    'internal photo denied to customer',
    (
      await customer.request.get(`${api}/customer/support/${guest.id}/attachments/${privatePhoto}`)
    ).status() === 404,
  );
  const file = await admin.request.get(`${api}/admin/support/${id}/attachments/${privatePhoto}`);
  check(
    'admin private photo proxy',
    file.ok() &&
      file.headers()['cache-control'].includes('no-store') &&
      file.headers()['content-type'].includes('image/png'),
  );
  await ap
    .getByLabel('Your reply', { exact: true })
    .fill('This public reply is visible only to the client participant.');
  await ap
    .getByLabel('Private photos', { exact: true })
    .setInputFiles({ name: 'visible.png', mimeType: 'image/png', buffer: png });
  await ap.getByRole('button', { name: 'Save reply and status' }).click();
  await ap
    .locator('li')
    .getByText('This public reply is visible only to the client participant.', { exact: true })
    .waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  check(
    'admin public reply visible to client',
    await page
      .getByText('This public reply is visible only to the client participant.', { exact: true })
      .isVisible(),
  );
  const photoLink = page.getByRole('link', { name: 'Private photo 1', exact: true });
  const download = await owner.request.get(web + (await photoLink.getAttribute('href')));
  check(
    'same-origin client attachment download',
    download.ok() && download.headers()['content-type'].includes('image/png'),
  );
  const latest = (await (await owner.request.get(root)).json()).data;
  const reply = {
    id,
    version: latest.version,
    body: 'Duplicate reply should persist just once.',
    state: 'open',
    requestKey: randomUUID(),
  };
  const replies = await Promise.all(
    [1, 2].map(() => owner.request.post(`${root}/reply`, { data: reply })),
  );
  check(
    'duplicate reply returns success twice',
    replies.every((r) => r.ok()),
  );
  check(
    'duplicate reply one persisted message',
    (await (await owner.request.get(root)).json()).data.messages.filter(
      (m) => m.body === reply.body,
    ).length === 1,
  );
  await page
    .getByLabel('Your reply', { exact: true })
    .fill('Keep this typed reply on a stale conflict.');
  await page.getByRole('button', { name: 'Save reply and status' }).click();
  await page.getByRole('button', { name: 'Reload conversation' }).waitFor();
  check(
    'stale reply preserves text',
    (await page.getByLabel('Your reply', { exact: true }).inputValue()) ===
      'Keep this typed reply on a stale conflict.',
  );
  check(
    'read-only admin write denied',
    (
      await limited.request.post(`${api}/admin/support/${id}/manage`, { data: raceInput })
    ).status() === 403,
  );
  check(
    'invalid state filter rejected',
    (await owner.request.get(`${api}/partner/support?state=closed`)).status() === 400,
  );
  await ap.setViewportSize({ width: 390, height: 844 });
  await scan(ap, 'admin detail mobile');
  await ap.getByLabel('Assigned operator').focus();
  check(
    'assignment keyboard focus',
    await ap.getByLabel('Assigned operator').evaluate((el) => el === document.activeElement),
  );
  await ap.goto(`${web}/admin/support?state=resolved`, { waitUntil: 'networkidle' });
  check(
    'admin empty filtered queue',
    await ap.getByRole('heading', { name: 'No requests match this view' }).isVisible(),
  );
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part17-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (results.some((r) => !r.pass)) process.exitCode = 1;
