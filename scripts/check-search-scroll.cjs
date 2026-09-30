// playwright-cli run-code --filename=scripts/check-search-scroll.cjs
/* prettier-ignore */
async (page) => {
  await page.goto('http://localhost:3000/');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const field of ['location', 'dates', 'slot', 'guests']) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.waitForFunction(() => !document.documentElement.hasAttribute('data-search-docked'));
      const trigger = page.locator(`main [data-search-field="${field}"]`);
      await trigger.evaluate((element) => window.scrollTo({ top: window.scrollY + element.getBoundingClientRect().top - 250, behavior: 'instant' }));
      await trigger.click();
      const panel = page.locator('[data-search-panel]');
      await panel.waitFor();
      if (field === 'location') {
        await panel.evaluate((element) => { element.scrollTop = 100; });
        await page.evaluate(() => new Promise(requestAnimationFrame));
        if (!await panel.isVisible()) throw new Error('Scrolling panel contents must not close it');
        const nestedScrollers = await panel.evaluate((element) => [...element.querySelectorAll('*')].filter((child) => /auto|scroll/.test(getComputedStyle(child).overflowY) && child.scrollHeight > child.clientHeight).length);
        if (nestedScrollers) throw new Error('Location panel must have only one scrollbar');
      }
      const values = await page.locator('main form input[type="hidden"]').evaluateAll((inputs) => inputs.map((input) => [input.name, input.value]));
      await page.evaluate(() => window.scrollTo(0, 900));
      await panel.waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.documentElement.hasAttribute('data-search-docked'));
      await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (await page.evaluate(() => window.scrollY) < 850) throw new Error('Closing must not jump back to the hero');
      const preserved = await page.locator('main form input[type="hidden"]').evaluateAll((inputs) => inputs.map((input) => [input.name, input.value]));
      if (JSON.stringify(values) !== JSON.stringify(preserved)) throw new Error('Scrolling must preserve the search draft');
    }
    await page.getByRole('button', { name: 'Open search', exact: true }).click();
    await page.locator('[data-search-panel]').waitFor();
    await page.evaluate(() => window.scrollBy(0, 100));
    await page.locator('[data-search-panel]').waitFor({ state: 'detached' });
    await page.waitForFunction(() => !document.documentElement.hasAttribute('data-search-open'));
  }
  return 'PASS: all four panels close on page scroll at desktop/mobile widths; internal scrolling, drafts, docking and scroll position preserved';
}
