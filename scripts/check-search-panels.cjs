// Run with a local dev server:
// playwright-cli open http://localhost:3000/search
// playwright-cli run-code --filename=scripts/check-search-panels.cjs
/* prettier-ignore */
async (page) => {
  page.setDefaultTimeout(60000);
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  await page.goto('http://localhost:3000/search');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: /^Where / }).click();
  await page.getByRole('textbox', { name: 'Search locations' }).fill('Surat');
  await page.getByRole('button', { name: 'Surat Explore places in Surat' }).click();
  const calendar = page.getByRole('dialog', { name: 'When', exact: true });
  await calendar.waitFor();
  await calendar.getByRole('button', { name: 'Consecutive visits', exact: true }).click();
  const dayButtons = calendar.locator('button[aria-pressed][aria-label]:not([disabled])');
  await dayButtons.nth(0).click();
  await dayButtons.nth(2).click();
  const start = await page.locator('input[name="date"]').inputValue();
  const end = await page.locator('input[name="end"]').inputValue();
  assert(start < end, 'Consecutive visits must keep ordered endpoints');
  await calendar.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: /^Who / }).click();
  assert(await page.getByRole('button', { name: 'Remove guest' }).isDisabled(), 'Guest minimum must be one');
  await page.getByRole('button', { name: 'Add guest' }).click();
  await page.keyboard.press('Escape');
  assert(await page.getByRole('button', { name: 'Who 2 guests' }).evaluate((element) => element === document.activeElement), 'Escape must restore trigger focus');
  await page.getByRole('button', { name: 'Show places', exact: true }).click();
  await page.waitForURL((url) => url.searchParams.get('guests') === '2');
  const params = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)));
  assert(params.city === 'surat' && params.date === start && params.end === end && params.mode === 'consecutive', 'Search must submit location, guests and date range');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^When / }).click();
  await calendar.getByRole('button', { name: 'Separate dates', exact: true }).click();
  await dayButtons.nth(0).click();
  await dayButtons.nth(2).click();
  assert((await page.locator('input[name="dates"]').inputValue()).split(',').length === 2, 'Separate dates must submit both selections');
  const bounds = await calendar.boundingBox();
  assert(bounds.x >= 0 && bounds.x + bounds.width <= 390, 'Mobile panel must fit viewport');
  await calendar.getByRole('button', { name: 'Clear dates', exact: true }).click();
  assert(await page.locator('input[name="dates"]').inputValue() === '', 'Clear dates must clear submitted values');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile search must not overflow');

  await page.goto('http://localhost:3000/');
  await page.getByRole('button', { name: /^Visit type / }).click();
  await page.getByRole('button', { name: /Full day 24 hours/ }).click();
  await page.getByRole('dialog', { name: 'Who', exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.getByRole('button', { name: 'Open search', exact: true }).click();
  await page.getByRole('dialog', { name: 'Where', exact: true }).waitFor();
  await page.getByRole('button', { name: 'All locations Find your next day out' }).click();
  await page.getByRole('dialog', { name: 'When', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  assert(await page.locator('#header-search-panel input[name="slot"]').inputValue() === 'full_day', 'Docked header must preserve the hero draft');
  await page.locator('#header-search-panel').getByRole('button', { name: 'Search', exact: true }).click();
  await page.waitForURL((url) => url.pathname === '/search' && url.searchParams.get('slot') === 'full_day');
  console.log('PASS: desktop and mobile panels, focus restoration, date modes, guest bounds, and home/results search submission');
}
