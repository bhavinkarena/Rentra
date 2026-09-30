// playwright-cli run-code --filename=scripts/check-themed-controls.cjs
/* prettier-ignore */
async (page) => {
  await page.goto('http://localhost:3000/');
  const city = page.getByRole('combobox', { name: 'Explore around' });
  const appearance = await city.evaluate((element) => {
    element.classList.add('appearance-none');
    const value = getComputedStyle(element).appearance;
    element.classList.remove('appearance-none');
    return value;
  });
  if (appearance !== 'base-select') throw new Error('Legacy utilities must not disable themed dropdowns');
  const cityValue = await city.locator('option').last().getAttribute('value');
  await city.selectOption(cityValue);
  if (!(await page.locator('#occasion-panel a').first().getAttribute('href')).includes(cityValue)) throw new Error('City selection must update the occasion destination');
  await page.goto('http://localhost:3000/search');
  await page.getByRole('button', { name: /^Filters/ }).click();
  const amenity = page.locator('input[name="amenities"]').first();
  await amenity.check();
  const chosen = await amenity.inputValue();
  await page.keyboard.press('Escape');
  const request = page.waitForRequest((request) => request.url().includes('sort=price_asc') && request.url().includes('amenities='));
  await page.getByRole('combobox', { name: 'Sort', exact: true }).selectOption('price_asc');
  await request;
  await page.waitForURL((url) => url.searchParams.get('sort') === 'price_asc', { timeout: 90000 });
  const persisted = await page.locator('#discovery-filters').evaluate((form) => new FormData(form).getAll('amenities'));
  if (!persisted.includes(chosen)) throw new Error('Sorting must preserve selected amenities');

  // Temporary fixture exercises the same global CSS used by authenticated forms.
  await page.evaluate(() => {
    const form = document.createElement('form');
    form.id = 'control-check';
    form.style = 'position:fixed;inset:80px 16px auto;z-index:100;background:var(--card);padding:24px';
    form.innerHTML = '<label>Required choice<select name="choice" required><option value="">Choose</option><optgroup label="Visits"><option value="day">Day picnic</option><option value="night">Overnight</option><option value="disabled" disabled>Unavailable</option></optgroup></select></label><label><input type="checkbox" name="consent" required>Consent</label><label><input type="radio" name="visit" value="day" checked>Day</label><label><input type="radio" name="visit" value="night">Night</label><input type="file" aria-label="Upload evidence"><select aria-label="Disabled choice" disabled><option>Disabled</option></select><button type="reset">Reset controls</button>';
    document.body.append(form);
  });
  const fixture = page.locator('#control-check');
  if (await fixture.evaluate((form) => form.checkValidity())) throw new Error('Required validation must remain active');
  await fixture.getByRole('combobox', { name: 'Required choice' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await fixture.getByRole('checkbox', { name: 'Consent' }).check();
  await fixture.getByRole('radio', { name: 'Night', exact: true }).check();
  if (!await fixture.evaluate((form) => form.checkValidity())) throw new Error('Valid choices must pass validation');
  if (!await fixture.getByRole('combobox', { name: 'Disabled choice' }).isDisabled()) throw new Error('Disabled controls must stay disabled');
  await fixture.getByRole('button', { name: 'Reset controls' }).click();
  if (await fixture.getByRole('checkbox', { name: 'Consent' }).isChecked()) throw new Error('Reset must restore checkbox state');
  if (!await fixture.getByRole('radio', { name: 'Day', exact: true }).isChecked()) throw new Error('Reset must restore radio state');
  await page.emulateMedia({ forcedColors: 'active' });
  if (await fixture.getByRole('checkbox').evaluate((el) => getComputedStyle(el).appearance) !== 'auto') throw new Error('Forced colors must retain system controls');
  await page.emulateMedia({ forcedColors: 'none' });
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture.getByRole('combobox', { name: 'Required choice' }).click();
  if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)) throw new Error('Mobile controls must not overflow');
  await page.keyboard.press('Escape');
  await fixture.evaluate((form) => form.remove());
  return 'PASS: sort/filter submission, keyboard selection, validation, disabled states, form reset, forced colors and mobile width';
}
