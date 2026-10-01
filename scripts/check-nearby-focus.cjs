// playwright-cli run-code --filename=scripts/check-nearby-focus.cjs
/* prettier-ignore */
async (page) => {
  await page.goto('http://localhost:3000/search');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const price = page.getByRole('spinbutton', { name: 'Minimum price (₹)', exact: true });
  await price.focus();
  const focus = await price.evaluate(el => {
    const s = getComputedStyle(el);
    return { offset: s.outlineOffset, shadow: s.boxShadow, width: s.outlineWidth };
  });
  if (focus.offset !== '-1px' || focus.shadow !== 'none' || focus.width !== '2px') throw new Error('Field focus must use a single border-aligned outline');
  await page.keyboard.press('Escape');
  const context = page.context();
  await context.grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
  await context.setGeolocation({ latitude: 23.0225, longitude: 72.5714 });
  let response = [{ area: 'Bopal, Ahmedabad', distanceKm: 5 }];
  let requests = 0;
  let release;
  await page.route('**/discovery/listings/nearby?*', async route => {
    requests++;
    const url = route.request().url();
    if (!url.includes('lat=23.0225') || !url.includes('km=25')) throw new Error('Nearby must send granted coordinates and bounded radius');
    if (release) await new Promise(resolve => { release = resolve; });
    await route.fulfill({ json: { success: true, data: response } });
  });
  const where = page.locator('main [data-search-field="location"]');
  await where.click();
  if (requests) throw new Error('Opening Where must not request nearby places');
  await page.getByRole('button', { name: /Nearby me/ }).click();
  await page.getByRole('heading', { name: 'Choose your visit dates' }).waitFor();
  const selected = await page.locator('#discovery-filters').evaluate(form => Object.fromEntries(new FormData(form)));
  if (selected.city !== 'ahmedabad' || selected.area !== 'bopal') throw new Error('Nearby must update submitted city and area');
  await page.keyboard.press('Escape');
  await where.click();
  response = [];
  await page.getByRole('button', { name: /Nearby me/ }).click();
  await page.getByRole('status').filter({ hasText: 'No supported places' }).waitFor();
  if (!(await where.innerText()).includes('Bopal')) throw new Error('Empty results must preserve the chosen location');
  await page.evaluate(() => {
    window.originalGeolocation = navigator.geolocation.getCurrentPosition;
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail({ code: 1 });
  });
  await page.getByRole('button', { name: /Nearby me/ }).click();
  await page.getByRole('status').filter({ hasText: 'permission was denied' }).waitFor();
  await page.evaluate(() => { navigator.geolocation.getCurrentPosition = window.originalGeolocation; });
  response = [{ area: 'Bopal, Ahmedabad', distanceKm: 5 }];
  release = true;
  const pendingRequest = page.waitForRequest('**/discovery/listings/nearby?*');
  await page.getByRole('button', { name: /Nearby me/ }).click();
  await pendingRequest;
  await page.getByRole('button', { name: /All locations/ }).click();
  release();
  await page.waitForResponse('**/discovery/listings/nearby?*');
  await page.keyboard.press('Escape');
  const cleared = await page.locator('#discovery-filters input[name="city"]').inputValue();
  if (cleared !== '') throw new Error('Late nearby response must not override a manual selection');
  await page.unroute('**/discovery/listings/nearby?*');
  await context.clearPermissions();
  return { focus, nearby: 'selection, empty results, permission denial and stale response passed' };
}
