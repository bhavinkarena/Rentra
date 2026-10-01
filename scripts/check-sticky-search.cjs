// playwright-cli run-code --filename=scripts/check-sticky-search.cjs
/* prettier-ignore */
async (page) => {
  await page.goto('http://localhost:3000/search?slot=day&guests=2&min=1000');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo({ top: 650, behavior: 'instant' }));
    const form = page.locator('#discovery-filters');
    await page.waitForFunction(() => document.documentElement.hasAttribute('data-search-docked'));
    if (!(await page.getByRole('group', { name: 'Search' }).isVisible())) throw new Error('Scrolled search must dock into the header');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Toolbar must fit the viewport');
    await page.getByRole('button', { name: /^Filters/ }).click();
    const extra = page.locator('#discovery-more-filters');
    await extra.waitFor({ state: 'visible' });
    const extraBounds = await extra.boundingBox();
    if (extraBounds.y + extraBounds.height > 900) throw new Error('Expanded filters must fit vertically');
    await page.getByRole('textbox', { name: 'Property name or locality' }).fill('Garden');
    await page.keyboard.press('Escape');
    if (await extra.isVisible()) throw new Error('Escape must close filters');
    const fields = await form.evaluate((element) => Object.fromEntries(new FormData(element)));
    if (fields.q !== 'Garden' || fields.min !== '1000' || fields.slot !== 'day' || fields.guests !== '2') throw new Error('Collapsed filters must retain all submitted values');
    await page.getByRole('button', { name: /^When / }).click();
    await page.getByRole('dialog', { name: 'When', exact: true }).waitFor();
    await page.keyboard.press('Escape');
  }
  return 'PASS: desktop/mobile header docking, viewport fit, filter dismissal, retained values and calendar access';
}
