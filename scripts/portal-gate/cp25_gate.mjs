// CP25 acceptance: run with a fresh disposable published property fixture.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE || '/tmp/rentra-ux-tools/node_modules/playwright',
);
const f = JSON.parse(await readFile(process.env.GATE_TOKENS, 'utf8'));
const web = 'http://localhost:3106',
  api = 'http://localhost:4106/api/v1';
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
let completed = false;
const results = [];
const check = (check, pass) => {
  results.push({ check, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${check}`);
  assert(pass, check);
};
try {
  const contexts = {};
  for (const kind of ['admin', 'limited', 'owner', 'anonymous']) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (kind !== 'anonymous')
      await c.addCookies([
        {
          name: kind === 'owner' ? 'rentra_session' : 'rentra_admin',
          value: f.tokens[kind],
          url: web,
        },
      ]);
    contexts[kind] = c;
  }
  for (const kind of ['owner', 'anonymous'])
    check(
      `${kind} cannot read drafts`,
      (await contexts[kind].request.get(api + '/admin/content')).status() === 401,
    );
  check(
    'content permission required',
    (await contexts.limited.request.get(api + '/admin/content')).status() === 403,
  );
  const admin = contexts.admin,
    p = await admin.newPage();
  const get = async (path) => (await (await admin.request.get(api + path)).json()).data;
  const original = await get('/discovery/content/terms/2026-09-21');
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  async function audit(label) {
    for (const width of [1280, 390]) {
      await p.setViewportSize({ width, height: 950 });
      check(
        `${label} ${width}px no overflow`,
        await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      );
      await p.addScriptTag({ content: axe });
      const issues = await p.evaluate(async () =>
        (await window.axe.run({ runOnly: ['wcag2a', 'wcag2aa'] })).violations
          .filter((v) => ['serious', 'critical'].includes(v.impact))
          .map((v) => v.id),
      );
      if (issues.length) console.log(issues);
      check(`${label} ${width}px axe`, !issues.length);
    }
    await p.setViewportSize({ width: 1280, height: 950 });
  }
  await p.goto(web + '/admin/content', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'Public content', exact: true }).waitFor();
  await audit('content directory');
  async function revision(n, state) {
    await p.getByText(`Draft revision ${n} · ${state}`, { exact: true }).waitFor();
  }
  async function publish(kind) {
    await p.getByLabel(/I reviewed the exact saved copy/).check();
    await p.getByRole('button', { name: 'Record review', exact: true }).click();
    await p
      .getByRole('button', { name: 'Preview publication', exact: true })
      .waitFor({ state: 'visible' });
    await p.getByRole('button', { name: 'Preview publication', exact: true }).click();
    await p.getByRole('heading', { name: 'Publication preview', exact: true }).waitFor();
    const before = await get('/discovery/content/' + kind);
    await p.getByRole('button', { name: 'Confirm publication', exact: true }).click();
    await p.getByText(/Draft revision \d+ · published/).waitFor();
    const after = await get('/discovery/content/' + kind);
    check(`${kind} publication created a new version`, before.version !== after.version);
    return after;
  }
  await p.goto(web + '/admin/content/terms', { waitUntil: 'networkidle' });
  await p.getByLabel('Title', { exact: true }).fill('CP25 reviewed Test booking terms');
  await p
    .getByLabel('Reason for change', { exact: true })
    .fill('Clarify the public Test booking title');
  await p.getByRole('button', { name: 'Save draft', exact: true }).click();
  await revision(1, 'draft');
  check(
    'draft stays private',
    (await get('/discovery/content/terms')).body.title === original.body.title,
  );
  check(
    'draft is not a public version',
    (await contexts.anonymous.request.get(api + '/discovery/content/terms/1')).status() === 404,
  );
  await audit('policy editor');
  const published = await publish('terms');
  f.contentVersion = published.version;
  await p.goto(web + '/policies/terms', { waitUntil: 'networkidle' });
  await p.getByRole('heading', { name: 'CP25 reviewed Test booking terms', exact: true }).waitFor();
  check('public page shows new publication', true);
  await audit('public policy');
  await p.goto(web + '/policies/terms/2026-09-21', { waitUntil: 'networkidle' });
  check(
    'original policy URL unchanged',
    await p.getByRole('heading', { name: original.body.title, exact: true }).isVisible(),
  );
  await p.goto(web + '/admin/content/terms', { waitUntil: 'networkidle' });
  await p.getByRole('button', { name: 'Restore 2026-09-21 as draft', exact: true }).click();
  await revision(4, 'draft');
  check(
    'restore is not publication',
    (await get('/discovery/content/terms')).version === published.version,
  );
  const restored = await publish('terms');
  check(
    'rollback creates a fresh version',
    restored.version !== '2026-09-21' && restored.version !== published.version,
  );
  check('rollback restores original copy', restored.body.title === original.body.title);
  check(
    'previous publication still addressable',
    (await get('/discovery/content/terms/' + published.version)).body.title ===
      'CP25 reviewed Test booking terms',
  );
  await p.goto(web + '/admin/content/help', { waitUntil: 'networkidle' });
  await p.getByLabel('Title', { exact: true }).fill('CP25 help and support');
  await p
    .getByLabel('Reason for change', { exact: true })
    .fill('Review the help title for this fixture');
  await p.getByRole('button', { name: 'Save draft', exact: true }).click();
  await revision(1, 'draft');
  await publish('help');
  await p.goto(web + '/help', { waitUntil: 'networkidle' });
  check(
    'help shows published title',
    await p.getByRole('heading', { name: 'CP25 help and support', exact: true }).isVisible(),
  );
  await p.getByLabel('Search help', { exact: true }).fill('no matching question fixture');
  await p.getByRole('button', { name: 'Search help', exact: true }).click();
  await p.getByText('No answer matched. Try another word or send a support request.').waitFor();
  check('help filtered empty state', true);
  await p.goto(web + '/admin/content/contact', { waitUntil: 'networkidle' });
  await p.getByLabel('Support email', { exact: true }).fill('support@fixture.invalid');
  await p.getByLabel('WhatsApp number (country code and digits)', { exact: true }).fill('');
  await p.getByLabel('Staffed hours', { exact: true }).fill('Monday 09:00–17:00');
  await p
    .getByLabel('Reason for change', { exact: true })
    .fill('Review fixture channels and staffed hours');
  await p.getByRole('button', { name: 'Save draft', exact: true }).click();
  await revision(1, 'draft');
  await audit('contact editor');
  const contact = await publish('contact');
  await p.goto(web + '/help', { waitUntil: 'networkidle' });
  check(
    'reviewed email rendered',
    await p.getByRole('link', { name: 'support@fixture.invalid', exact: true }).isVisible(),
  );
  check(
    'removed WhatsApp absent',
    (await p.getByRole('link', { name: 'Message Rentra on WhatsApp', exact: true }).count()) === 0,
  );
  check(
    'hours include timezone',
    await p
      .getByText('Support hours: Monday 09:00–17:00 (Asia/Kolkata)', { exact: true })
      .isVisible(),
  );
  await audit('public help');
  await p.goto(web + '/help/history/contact/' + contact.version, { waitUntil: 'networkidle' });
  check(
    'contact history readable',
    await p.getByRole('link', { name: 'support@fixture.invalid', exact: true }).isVisible(),
  );
  // A second operator changes the draft while this editor is open.
  await p.goto(web + '/admin/content/privacy', { waitUntil: 'networkidle' });
  const privacy = await get('/admin/content/privacy');
  await admin.request.post(api + '/admin/content/privacy', {
    data: {
      command: 'save',
      version: privacy.draft.version,
      body: privacy.draft.body,
      reason: 'Concurrent fixture update',
    },
  });
  await p.getByLabel('Title', { exact: true }).fill('Stale editor text stays here');
  await p
    .getByLabel('Reason for change', { exact: true })
    .fill('Do not overwrite another saved revision');
  await p.getByRole('button', { name: 'Save draft', exact: true }).click();
  await p.getByRole('alert').filter({ hasText: 'The draft changed.' }).waitFor();
  check(
    'stale save preserves input',
    (await p.getByLabel('Title', { exact: true }).inputValue()) === 'Stale editor text stays here',
  );
  await p.getByRole('button', { name: 'Reload latest draft' }).click();
  await revision(1, 'draft');
  const limited = await contexts.limited.newPage();
  await limited.goto(web + '/admin/content', { waitUntil: 'networkidle' });
  check(
    'forbidden page visible',
    await limited
      .getByRole('heading', { name: 'You do not have access to this', exact: true })
      .isVisible(),
  );
  await writeFile(process.env.GATE_TOKENS, JSON.stringify(f));
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part25-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
