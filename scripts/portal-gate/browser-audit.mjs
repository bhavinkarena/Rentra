import { readFile } from 'node:fs/promises';

// Reuse the application's pinned axe-core instead of requiring a second QA installation.
const axe = await readFile(
  new URL('../../node_modules/axe-core/axe.min.js', import.meta.url),
  'utf8',
);

export async function auditPage(page, scope) {
  await page.addScriptTag({ content: axe });
  return page.evaluate(
    async (selector) =>
      window.axe.run(selector || document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
      }),
    scope,
  );
}
