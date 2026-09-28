// Local CP30 evidence only. These fixtures never certify hosted Razorpay acceptance.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const fixture = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106';
const api = 'http://localhost:4106/api/v1';
const results = [];
const check = (check, pass) => {
  results.push({ check, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${check}`);
  assert(pass, check);
};
let completed = false;
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
try {
  const contexts = {};
  for (const role of [
    'admin',
    'limited',
    'owner',
    'other',
    'customer',
    'foreignCustomer',
    'staff',
    'anonymous',
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (role !== 'anonymous')
      await context.addCookies([
        {
          name: ['admin', 'limited'].includes(role)
            ? 'rentra_admin'
            : role === 'staff'
              ? 'rentra_staff'
              : 'rentra_session',
          value: fixture.tokens[role],
          url: web,
        },
      ]);
    contexts[role] = context;
  }
  const paths = {
    admin: '/admin/records/',
    owner: '/partner/records/',
    customer: '/customer/records/',
    staff: '/staff/visits/',
  };
  const record = async (role) => {
    const response = await contexts[role].request.get(api + paths[role] + fixture.booking.order);
    check(`${role} shared record authorized`, response.status() === 200);
    return (await response.json()).data;
  };
  for (const role of Object.keys(paths)) {
    const data = await record(role);
    check(
      `${role} mixed visit states`,
      data.visits.some((v) => v.state === 'confirmed') &&
        data.visits.some((v) => v.state === 'cancelled'),
    );
    if (role === 'staff')
      check(
        'caretaker excludes financial and guest identity fields',
        !/rentMinor|feeMinor|depositMinor|payments|refunds|booked-guest@fixture.invalid/.test(
          JSON.stringify(data),
        ),
      );
  }
  for (const role of ['owner', 'customer', 'staff', 'anonymous'])
    check(
      `${role} cannot use admin cookie boundary`,
      (await contexts[role].request.get(api + '/admin/payments/orders')).status() === 401,
    );
  check(
    'limited operator cannot read payments',
    (await contexts.limited.request.get(api + '/admin/payments/orders')).status() === 403,
  );
  for (const [role, scope] of [
    ['other', 'partner'],
    ['foreignCustomer', 'customer'],
  ]) {
    for (const suffix of ['', '/summary', '/attachments/' + randomUUID()])
      check(
        `${role} foreign ${suffix || 'record'} excluded`,
        (
          await contexts[role].request.get(
            `${api}/${scope}/records/${fixture.booking.order}${suffix}?kind=admin`,
          )
        ).status() === 404,
      );
  }
  for (const path of ['/partner/finance', '/partner/team', '/partner/documents', '/admin/clients'])
    check(
      `caretaker denied ${path}`,
      [401, 403].includes((await contexts.staff.request.get(api + path)).status()),
    );
  const preflight = await contexts.anonymous.request.fetch(api + '/staff/visits/transition', {
    method: 'OPTIONS',
    headers: {
      Origin: web,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  });
  check(
    'split origin credentialed preflight',
    preflight.status() === 204 &&
      preflight.headers()['access-control-allow-origin'] === web &&
      preflight.headers()['access-control-allow-credentials'] === 'true',
  );
  const evil = await contexts.owner.request.get(api + '/partner/records', {
    headers: { Origin: 'https://untrusted.invalid' },
  });
  check(
    'untrusted origin denied with structured error',
    evil.status() === 403 && (await evil.json()).code === 'ORIGIN_DENIED',
  );
  const csrf = await contexts.staff.request.post(api + '/staff/visits/transition', {
    headers: { 'Sec-Fetch-Site': 'cross-site' },
    data: {},
  });
  check(
    'cross-site cookie write without origin denied',
    csrf.status() === 403 && (await csrf.json()).code === 'CSRF_ORIGIN_REQUIRED',
  );
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const pages = {};
  for (const [role, path] of [
    ['admin', '/admin/bookings/'],
    ['owner', '/partner/bookings/'],
    ['customer', '/bookings/'],
    ['staff', '/staff/visits/'],
  ]) {
    const page = await contexts[role].newPage();
    pages[role] = page;
    await page.goto(web + path + fixture.booking.order, { waitUntil: 'networkidle' });
    check(
      `${role} production page loads shared booking`,
      (await page.locator('main').innerText()).includes('ORD-CP08'),
    );
    await page.keyboard.press('Tab');
    check(
      `${role} keyboard reaches visible interactive control`,
      await page.evaluate(() => {
        const element = document.activeElement;
        return (
          element?.matches('a,button,input,select,textarea') &&
          element.getBoundingClientRect().width > 0
        );
      }),
    );
    const split = await page.evaluate(
      async (url) => {
        const response = await fetch(url, { credentials: 'include' });
        return { status: response.status, data: (await response.json()).data };
      },
      api + paths[role] + fixture.booking.order,
    );
    check(
      `${role} real browser credentialed API request`,
      split.status === 200 && split.data.reference === 'ORD-CP08',
    );
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 950 });
      check(
        `${role} ${width}px no horizontal overflow`,
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      );
      await page.addScriptTag({ content: axe });
      const violations = await page.evaluate(async () =>
        (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
          .filter((v) => ['critical', 'serious'].includes(v.impact))
          .map((v) => v.id),
      );
      if (violations.length) console.log(violations);
      check(`${role} ${width}px axe serious/critical clear`, !violations.length);
    }
  }
  // Race two fresh commands against the same version, then replay the winner.
  const before = await record('owner');
  const visit = before.visits.find((v) => v.id === fixture.operationalVisit);
  const at = new Date(Date.now() - 120000)
    .toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' })
    .replace(' ', 'T')
    .slice(0, 16);
  const commands = [0, 1].map(() => ({
    visitId: visit.id,
    phase: 'handover',
    occurredAt: at,
    note: 'The guest group received the keys at the main gate.',
    attested: 'on',
    version: String(visit.version),
    requestKey: randomUUID(),
  }));
  const responses = await Promise.all(
    commands.map((data) => contexts.staff.request.post(api + '/staff/visits/transition', { data })),
  );
  check(
    'concurrent caretaker handover has one winner and one conflict',
    responses
      .map((r) => r.status())
      .sort()
      .join(',') === '200,409',
  );
  const winner = responses.findIndex((r) => r.status() === 200);
  check(
    'handover replay succeeds',
    (
      await contexts.staff.request.post(api + '/staff/visits/transition', {
        data: commands[winner],
      })
    ).status() === 200,
  );
  for (const role of Object.keys(paths)) {
    const data = await record(role);
    const changed = data.visits.find((v) => v.id === visit.id);
    check(`${role} sees committed caretaker handover`, changed.state === 'handed_over');
    if (role !== 'customer')
      check(
        `${role} one handover evidence record`,
        changed.evidence.filter((e) => e.kind === 'handover').length === 1,
      );
    await pages[role].reload({ waitUntil: 'networkidle' });
    check(
      `${role} refreshed page shows handover`,
      /handed[ _]over/i.test(await pages[role].locator('main').innerText()),
    );
  }
  const webhook = await contexts.anonymous.request.post('http://localhost:4106/webhooks/razorpay', {
    headers: { 'X-Razorpay-Signature': '0'.repeat(64) },
    data: { event: 'payment.captured', payload: {} },
  });
  check('forged provider webhook cannot succeed', [400, 401, 403, 503].includes(webhook.status()));
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part30-gate.json', import.meta.url),
    JSON.stringify(
      { completed, evidence: 'local disposable fixtures; no hosted provider', results },
      null,
      2,
    ) + '\n',
  );
}
