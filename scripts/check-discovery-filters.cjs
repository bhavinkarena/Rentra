// playwright-cli run-code --filename=scripts/check-discovery-filters.cjs
/* prettier-ignore */
async page => {
  await page.goto('http://localhost:3000/search');
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('spinbutton', { name: 'Minimum price', exact: false }).fill('12000');
  await page.getByRole('spinbutton', { name: 'Maximum price', exact: false }).fill('10000');
  if (!(await page.getByRole('button', { name: 'Apply filters', exact: true }).isDisabled())) throw new Error('Invalid budget must block apply');
  await page.getByRole('button', { name: 'Any budget', exact: true }).click();
  await page.getByRole('combobox', { name: 'Minimum bedrooms', exact: true }).selectOption('3');
  await page.getByRole('checkbox', { name: /Physically verified places/ }).check();
  await page.getByRole('checkbox', { name: 'Swimming pool', exact: true }).check();
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await page.waitForURL(url => url.searchParams.get('bedrooms') === '3' && url.searchParams.get('verified') === '1');
  await page.getByRole('link', { name: 'Remove 3+ bedrooms', exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Sort', exact: true }).selectOption('price_asc');
  await page.waitForURL(url => url.searchParams.get('sort') === 'price_asc');
  const params = await page.evaluate(() => Object.fromEntries(new URLSearchParams(location.search)));
  if (params.bedrooms !== '3' || params.verified !== '1' || params.amenities !== 'swimming_pool') throw new Error('Sorting dropped filters');
  for (const height of [844, 667]) {
    await page.setViewportSize({ width: 390, height });
    await page.getByRole('button', { name: /^Filters/ }).click();
    const apply = await page.getByRole('button', { name: 'Apply filters', exact: true }).boundingBox();
    if (!apply || apply.y < 0 || apply.y + apply.height > height) throw new Error('Mobile Apply must stay in viewport');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Horizontal overflow');
    await page.getByRole('button', { name: 'Close filters', exact: true }).click();
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForFunction(() => document.documentElement.hasAttribute('data-search-docked'));
  if (!(await page.getByRole('group', { name: 'Search', exact: true }).isVisible())) throw new Error('Search must dock into the header');
  return { filters: params, checks: 'budget validation, submission, sort preservation, mobile sizes, sticky position' };
}
