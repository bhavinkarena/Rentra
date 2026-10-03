import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { auditPage } from './browser-audit.mjs';

const { chromium } = await import(pathToFileURL(process.env.PLAYWRIGHT_MODULE).href);
const fixture = JSON.parse(await readFile(process.env.OWNER_EARNINGS_FIXTURE, 'utf8'));
const origin = process.env.GATE_WEB_ORIGIN || 'http://localhost:3148';
const evidence = new URL('../../docs/evidence/owner-phase8/', import.meta.url);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH, headless: true });
const results = { accessibility: {}, widths: {}, errors: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addCookies([{ name: 'rentra_session', value: fixture.tokens.owner, url: origin }]);
  const page = await context.newPage();
  page.on('pageerror', (error) => results.errors.push(error.message));
  const goto = async (path) => page.goto(origin + path, { waitUntil: 'networkidle' });
  if (process.env.OWNER_EARNINGS_LEGACY === '1') {
    await goto('/partner/earnings');
    await page.getByRole('heading', { name: /^Finance statements/ }).waitFor();
    await goto(`/partner/statements/${fixture.money.period}`);
    await page
      .getByRole('heading', { name: `Statement · ${fixture.money.period}`, exact: true })
      .waitFor();
    await goto('/partner/payouts');
    await page.getByRole('heading', { name: 'Payout history', exact: true }).waitFor();
    await writeFile(
      new URL('rollback-checks.json', evidence),
      JSON.stringify(
        {
          flag: 'NEXT_PUBLIC_OWNER_V2_EARNINGS=false',
          legacyOverview: true,
          legacyStatement: true,
          legacyPayouts: true,
        },
        null,
        2,
      ) + '\n',
    );
    console.log('Phase 8 legacy fallback passed');
    process.exitCode = 0;
  } else {
    const audit = async (name) => {
      const report = await auditPage(page);
      assert.equal(
        report.violations.length,
        0,
        JSON.stringify(
          report.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
        ),
      );
      results.accessibility[name] = 0;
    };
    const money = fixture.money;
    await goto('/partner/earnings');
    await page.getByRole('heading', { name: 'Earnings', exact: true }).waitFor();
    const rows = page.getByRole('region', { name: 'Rent by visit' }).locator('tbody > tr');
    assert.equal(await rows.count(), 30);
    assert.match(await page.locator('main').innerText(), /₹35,000/);
    assert.match(await page.locator('main').innerText(), /Test bookings/);
    assert.match(
      await page.locator('main').innerText(),
      /Commission and tax deductions are not applied yet/,
    );
    await audit('earnings');
    await page.screenshot({ path: new URL('earnings-desktop.png', evidence).pathname });
    await page.getByRole('link', { name: 'Next', exact: true }).click();
    await page.getByText('Page 2 of 2', { exact: true }).waitFor();
    assert.equal(await rows.count(), 5);
    assert.match(await page.locator('main').innerText(), /₹35,000/);
    results.pagination = { visits: 35, firstPage: 30, secondPage: 5 };
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await goto(`/partner/earnings?month=${money.period}&environment=live`);
      assert.equal(await rows.count(), 1);
      assert.match(await page.locator('main').innerText(), /₹1,000/);
      assert.match(await page.locator('main').innerText(), /₹200/);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      results.widths[width] = 'no horizontal overflow';
      if (width === 360) {
        await audit('earningsMobile');
        await page.screenshot({
          path: new URL('earnings-mobile.png', evidence).pathname,
          fullPage: true,
        });
      }
    }
    for (const path of [
      '/partner/finance',
      '/partner/earnings/statements',
      `/partner/statements/${money.period}`,
    ]) {
      await goto(path);
      await page.getByRole('region', { name: 'Rent by visit' }).waitFor();
    }
    results.statementAliases = true;
    await goto(`/partner/earnings/print?month=${money.period}&environment=test`);
    assert.equal(await rows.count(), 35);
    await audit('printStatement');
    await page.emulateMedia({ media: 'print' });
    assert.equal(
      await page.getByRole('heading', { name: 'Rentra statement', exact: true }).isVisible(),
      true,
    );
    assert.equal(await page.locator('.portal-ui > aside').isVisible(), false);
    for (const nav of await page.locator('nav').all()) assert.equal(await nav.isVisible(), false);
    assert.equal(
      await page.getByRole('button', { name: 'Print or save as PDF' }).isVisible(),
      false,
    );
    await page.pdf({
      path: new URL('statement.pdf', evidence).pathname,
      format: 'A4',
      printBackground: true,
    });
    await page.emulateMedia({ media: 'screen' });
    results.printVisits = 35;
    const download = await context.request.get(
      `${origin}/partner/statements/${money.period}/download?month=${money.period}&environment=test`,
    );
    assert.equal(download.status(), 200);
    assert.match(
      download.headers()['content-disposition'],
      new RegExp(`rentra-statement-${money.period}\\.csv`),
    );
    const csv = await download.text();
    assert.match(csv, /"35000.00"/);
    assert.doesNotMatch(csv, /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
    await writeFile(new URL('statement.csv', evidence), csv);
    results.csv = { visits: 35, rupees: true, uuidColumns: false };
    await goto(`/partner/allocations/${money.live.allocationId}`);
    await page.getByRole('heading', { name: 'Earning line', exact: true }).waitFor();
    assert.match(await page.locator('main').innerText(), /₹1,000/);
    await audit('earningLine');
    await goto(`/partner/bookings/${money.live.orderId}`);
    await page
      .getByRole('link', { name: /earning line|earning details/i })
      .first()
      .waitFor();
    results.bookingEarningLink = true;
    await goto('/partner/payouts');
    await page.getByRole('heading', { name: 'How payouts will work', exact: true }).waitFor();
    await audit('payoutExplainer');
    await goto('/partner/settings/payout');
    await page.route('https://ifsc.razorpay.com/**', (route) =>
      route.fulfill({ status: 503, body: '{}' }),
    );
    await page.getByRole('radio', { name: 'Bank account', exact: true }).check();
    await page.getByLabel('Account holder name', { exact: true }).fill('');
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await page
      .getByText('Enter the account holder name (3–160 characters)', { exact: true })
      .waitFor();
    assert.equal(await page.locator('input[aria-invalid="true"]').count(), 4);
    await page.getByLabel('Account number', { exact: true }).fill('1234 5678-9000');
    await page.getByLabel('Confirm account number', { exact: true }).fill('123456789000');
    await page.getByLabel('IFSC', { exact: true }).fill('sbin-0001234');
    await page.getByLabel('Account holder name', { exact: true }).fill('Owner Test');
    await page.getByRole('radio', { name: 'UPI', exact: true }).check();
    await page.getByLabel('UPI ID', { exact: true }).fill('owner@bank');
    await page.getByRole('radio', { name: 'Bank account', exact: true }).check();
    assert.equal(
      await page.getByLabel('Account number', { exact: true }).inputValue(),
      '1234 5678-9000',
    );
    assert.equal(await page.getByLabel('IFSC', { exact: true }).inputValue(), 'sbin-0001234');
    await page.getByLabel('IFSC', { exact: true }).focus();
    await page.getByLabel('Account holder name', { exact: true }).focus();
    await page
      .getByText('Check the IFSC on your bank statement. You can still save it.', { exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Preview change', exact: true }).click();
    await page.getByRole('button', { name: 'Save as draft', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Save as draft', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Draft waiting for confirmation', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Send confirmation code', exact: true }).click();
    await page.getByLabel('Confirmation code', { exact: true }).fill('000000');
    await page.getByRole('button', { name: 'Confirm identity', exact: true }).click();
    await page.getByText(/That code did not match/).waitFor();
    await page.getByLabel('Confirmation code', { exact: true }).fill('123456');
    await page.getByRole('button', { name: 'Confirm identity', exact: true }).click();
    await page.getByRole('button', { name: 'Submit draft version 2', exact: true }).waitFor();
    assert.equal(
      (await context.cookies(origin)).find((c) => c.name === 'rentra_session').value,
      fixture.tokens.owner,
    );
    await page.getByRole('button', { name: 'Submit draft version 2', exact: true }).click();
    await page
      .getByRole('heading', { name: 'Draft waiting for confirmation', exact: true })
      .waitFor({ state: 'hidden' });
    await audit('payoutMethod');
    results.payoutMethod = {
      allErrors: true,
      preservedInputs: true,
      normalizedBank: true,
      lookupOutage: true,
      draft: true,
      wrongCode: true,
      sameSession: true,
      submitted: true,
    };
    await page.setViewportSize({ width: 360, height: 900 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: new URL('payout-method-mobile.png', evidence).pathname,
      fullPage: true,
    });
    const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await other.addCookies([{ name: 'rentra_session', value: fixture.tokens.other, url: origin }]);
    const empty = await other.newPage();
    await empty.goto(origin + '/partner/earnings', { waitUntil: 'networkidle' });
    await empty.getByRole('heading', { name: 'No earnings yet this month', exact: true }).waitFor();
    assert.equal(await empty.getByRole('combobox', { name: 'Booking type' }).count(), 0);
    results.emptyOwner = true;
    assert.equal(results.errors.length, 0, results.errors.join('\n'));
    await writeFile(
      new URL('browser-checks.json', evidence),
      JSON.stringify(results, null, 2) + '\n',
    );
    console.log(JSON.stringify(results, null, 2));
  }
} finally {
  await browser.close();
}
