// Run against the disposable published fixture, never the configured database.
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
const results = [];
let completed = false;
const check = (check, pass) => {
  results.push({ check, pass: !!pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${check}`);
  assert(pass, check);
};
try {
  const contexts = {};
  for (const kind of ['admin', 'limited', 'owner', 'customer', 'anonymous']) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 950 } });
    if (kind !== 'anonymous')
      await c.addCookies([
        {
          name: ['admin', 'limited'].includes(kind) ? 'rentra_admin' : 'rentra_session',
          value: f.tokens[kind],
          url: web,
        },
      ]);
    contexts[kind] = c;
  }
  for (const kind of ['anonymous', 'owner', 'customer'])
    check(
      `${kind} cannot read admin catalogues`,
      (await contexts[kind].request.get(api + '/admin/catalogues/categories')).status() === 401,
    );
  check(
    'catalogue capability required',
    (await contexts.limited.request.get(api + '/admin/catalogues/categories')).status() === 403,
  );
  const admin = contexts.admin,
    p = await admin.newPage();
  const get = async (path) => (await (await admin.request.get(api + path)).json()).data;
  const axe = await readFile(
    new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
    'utf8',
  );
  const audit = async (label) => {
    for (const width of [1280, 390]) {
      await p.setViewportSize({ width, height: 900 });
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
      check(`${label} ${width}px axe`, issues.length === 0);
    }
    await p.setViewportSize({ width: 1280, height: 950 });
  };
  const categories = await get('/admin/catalogues/categories'),
    category = categories.items[0];
  f.catalogueId = category.id;
  await p.goto(web + '/review-city/review-farm/area/review-area', { waitUntil: 'networkidle' });
  await p.goto(web + '/admin/catalogues/categories', { waitUntil: 'networkidle' });
  check(
    'catalogue navigation visible',
    await p.getByRole('link', { name: 'Catalogues', exact: true }).isVisible(),
  );
  await audit('catalogue list');
  await p.getByLabel('Search label or slug').fill('no matching record');
  await p.getByRole('button', { name: 'Search', exact: true }).click();
  await p.getByText('No matching records. Try another label or status.').waitFor();
  check('empty filtered state visible', true);
  for (const type of ['cities', 'areas', 'categories', 'amenities']) {
    await p.goto(web + '/admin/catalogues/' + type, { waitUntil: 'networkidle' });
    check(
      `${type} list loaded`,
      await p
        .getByRole('heading', { name: type[0].toUpperCase() + type.slice(1), exact: true })
        .isVisible(),
    );
  }
  await p.goto(web + '/admin/catalogues/categories/' + category.id, { waitUntil: 'networkidle' });
  await p.getByLabel('Label', { exact: true }).fill('CP24 Farm stays');
  await p.getByLabel('Reason for change').fill('Clarify the public category label');
  await p.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await p.getByRole('heading', { name: 'Review impact' }).waitFor();
  check(
    'preview leaves data unchanged',
    (await get('/admin/catalogues/categories/' + category.id)).record.name === category.name,
  );
  await audit('catalogue preview');
  await p.getByRole('button', { name: 'Confirm and save' }).click();
  await p.getByText('Catalogue record saved.').waitFor();
  await p.getByRole('heading', { name: 'CP24 Farm stays', exact: true }).waitFor();
  check(
    'confirmed label saved',
    (await get('/admin/catalogues/categories/' + category.id)).record.name === 'CP24 Farm stays',
  );
  await p.getByLabel('Active', { exact: true }).uncheck();
  await p.getByLabel('Reason for change').fill('Preview removal of referenced category');
  await p.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await p.getByText(/Referenced records cannot be deactivated here/).waitFor();
  check(
    'referenced archive blocked',
    (await p.getByRole('button', { name: 'Confirm and save' }).count()) === 0,
  );
  const create = async (type, label, fill) => {
    await p.goto(web + `/admin/catalogues/${type}/new`, { waitUntil: 'networkidle' });
    await p.getByLabel('Label', { exact: true }).fill(label);
    await p.getByLabel('Permanent slug').fill('cp24_' + type.replaceAll('-', '_'));
    if (type !== 'amenities') await p.getByLabel('Permanent slug').fill('cp24-' + type);
    if (fill) await fill();
    await p.getByLabel('Reason for change').fill('Create a CP24 browser fixture reference');
    await p.getByRole('button', { name: 'Preview changes', exact: true }).click();
    await p.getByRole('button', { name: 'Confirm and save' }).click();
    await p.waitForURL(new RegExp(`/admin/catalogues/${type}/[0-9a-f-]{36}$`));
    await p.getByRole('heading', { name: label, exact: true }).waitFor();
    check(`create ${type} through preview`, true);
    return p.url().split('/').at(-1);
  };
  const newCategory = await create('categories', 'CP24 New category');
  const city = await create('cities', 'CP24 New city', async () =>
    p.getByLabel('State', { exact: true }).fill('Gujarat'),
  );
  await create('areas', 'CP24 New area', async () =>
    p.getByLabel('City', { exact: true }).selectOption(city),
  );
  await audit('area editor');
  const amenity = await create('amenities', 'CP24 New amenity', async () =>
    p.getByLabel('Value type', { exact: true }).selectOption('count'),
  );
  await audit('amenity editor');
  await p.getByLabel('Active', { exact: true }).uncheck();
  await p.getByLabel('Reason for change').fill('Archive an unused test amenity');
  await p.getByRole('button', { name: 'Preview changes', exact: true }).click();
  await p.getByRole('button', { name: 'Confirm and save' }).click();
  await p.getByText('Catalogue record saved.').waitFor();
  check(
    'unused record can be archived',
    !(await get('/admin/catalogues/amenities/' + amenity)).record.is_active,
  );
  await p.goto(web + '/admin/catalogues/categories/' + category.id, { waitUntil: 'networkidle' });
  await p.getByLabel('Reason for change').fill('Review a possible category replacement');
  await p.getByLabel('Replacement', { exact: true }).selectOption(newCategory);
  await p.getByRole('button', { name: 'Preview replacement' }).click();
  await p.getByText(/Replacement requires an explicit data migration/).waitFor();
  check(
    'replacement preview cannot rewrite references',
    (await p.getByRole('button', { name: 'Confirm and save' }).count()) === 0,
  );
  const limited = await contexts.limited.newPage();
  await limited.goto(web + '/admin/catalogues/categories', { waitUntil: 'networkidle' });
  check(
    'forbidden UI is not an empty catalogue',
    await limited.getByRole('heading', { name: /access|permission/i }).isVisible(),
  );
  await p.goto(web + '/review-city/review-farm/area/review-area', { waitUntil: 'networkidle' });
  check(
    'public route still resolves after label edit',
    await p.getByRole('heading', { name: /CP24 Farm stays in Dumas/ }).isVisible(),
  );
  await writeFile(process.env.GATE_TOKENS, JSON.stringify(f));
  completed = true;
} finally {
  await browser.close();
  await writeFile(
    new URL('../../docs/rentra-client-admin-part24-gate.json', import.meta.url),
    JSON.stringify({ completed, results }, null, 2) + '\n',
  );
}
if (!completed || results.some((r) => !r.pass)) process.exitCode = 1;
