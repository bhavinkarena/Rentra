import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { openSync, closeSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import { pathToFileURL } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { SignJWT } from 'jose';

export async function verifyReviewBrowser({ databaseUrl, actor, owner, admin, target, sql, listing }) {
  const { chromium } = await import(pathToFileURL(process.env.CUSTOMER_BROWSER_DRIVER).href);
  const origin = 'http://localhost:3202', secret = 'part16-only-fixture-session-secret-long-enough';
  const log = openSync(join(tmpdir(), 'rentra-part16-browser.log'), 'w');
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '--port', '3202'], {
    env: { ...process.env, NODE_ENV: 'development', RENTRA_BROWSER_FIXTURE: '1', DATABASE_URL: databaseUrl, NEXT_PUBLIC_SITE_URL: origin, SESSION_SECRET: secret, CUSTOMER_NOTIFICATION_DELIVERY: 'disabled' }, stdio: ['ignore', log, log],
  });
  closeSync(log);
  let browser;
  try {
    for (let i = 0; i < 120; i++) { if (server.exitCode !== null) throw new Error('Browser fixture server exited'); try { if ((await fetch(origin + '/login')).ok) break; } catch {} await delay(500); }
    browser = await chromium.launch({ headless: true, ...(process.env.CUSTOMER_BROWSER_EXECUTABLE ? { executablePath: process.env.CUSTOMER_BROWSER_EXECUTABLE } : {}) });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles' });
    const page = await context.newPage(); page.setDefaultTimeout(90000);
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    async function login(payload, isAdmin = false) {
      await context.clearCookies();
      let token = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('1h');
      if (isAdmin) token = token.setAudience('rentra:admin');
      await context.addCookies([{ name: isAdmin ? 'rentra_admin' : 'rentra_session', value: await token.sign(new TextEncoder().encode(secret)), url: origin, httpOnly: true, sameSite: 'Lax' }]);
    }
    const path = '/bookings/' + target.id + '/reviews';
    await login(actor.session);
    await page.goto(origin + path);
    await page.getByLabel('Overall rating').selectOption('1');
    await page.getByLabel('Your experience').fill('Our visit was disappointing. This honest low score should receive the same moderation.');
    await page.getByRole('button',{name:'Submit review',exact:true}).click();
    await page.getByText('Status: pending',{exact:true}).waitFor();
    await page.reload();await page.getByText('Status: pending',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    const [review]=await sql`SELECT id FROM review WHERE booking_id=${target.visitId}`;
    await login({adminId:admin.id},true);
    await page.goto(origin+'/admin/reviews');
    const card=page.locator('li').filter({hasText:'Our visit was disappointing.'});
    await card.getByLabel('Policy reason (shared with author)').fill('Meets the content rules. A low score is not a policy violation.');
    await card.getByRole('button',{name:'Save moderation decision',exact:true}).click();
    await card.getByText('Status: published',{exact:true}).waitFor();
    await login({role:'client',userId:owner.id,accountStatus:'active'});
    await page.goto(origin+'/partner/reviews');
    const ownerCard=page.locator('li').filter({hasText:'Our visit was disappointing.'});
    await ownerCard.getByLabel('Owner reply',{exact:true}).fill('Thank you for your feedback. We are improving the property.');
    await ownerCard.getByRole('button',{name:'Save owner reply',exact:true}).click();
    await ownerCard.getByText('Owner reply: Thank you for your feedback. We are improving the property.',{exact:true}).waitFor();
    await login(actor.session);
    await page.goto(origin+'/reviews/'+review.id+'/report');
    await page.getByLabel('Report reason',{exact:true}).fill('Please review the owner reply for relevance to my visit.');
    await page.getByRole('button',{name:'Submit report',exact:true}).click();
    await page.getByRole('status').waitFor();
    assert.equal((await sql`SELECT count(*)::int n FROM review_report WHERE review_id=${review.id}`)[0].n,1);
    await context.clearCookies();
    const [l]=await sql`SELECT slug,public_code FROM rentable WHERE id=${listing.id}`;
    await page.goto(origin+'/listing/'+l.slug+'-'+l.public_code);
    await page.getByText('Our visit was disappointing. This honest low score should receive the same moderation.',{exact:true}).waitFor();
    await page.getByText('Thank you for your feedback. We are improving the property.',{exact:true}).waitFor();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:join(tmpdir(),'rentra-part16-public-review.png'),fullPage:true});
    await login({adminId:admin.id},true);
    await page.goto(origin+'/admin/reviews');
    const moderated=page.locator('li').filter({hasText:'Our visit was disappointing.'});
    await moderated.getByLabel('Publication decision').selectOption('hidden');
    await moderated.getByLabel('Policy reason (shared with author)').fill('Fixture privacy violation confirmed during report investigation.');
    await moderated.getByRole('button',{name:'Save moderation decision',exact:true}).click();
    await moderated.getByText('Status: hidden',{exact:true}).waitFor();
    await context.clearCookies();
    await page.goto(origin+'/listing/'+l.slug+'-'+l.public_code);
    await page.getByRole('heading',{name:'Current lifecycle property',exact:true}).waitFor();
    assert.ok(!(await page.locator('main').innerText()).includes('Our visit was disappointing.'));
    assert.equal((await sql`SELECT count(*)::int n FROM public_customer_review WHERE id=${review.id}`)[0].n,0);
    assert.deepEqual(errors, []);
  } finally {
    await browser?.close();
    if (server.exitCode === null) { server.kill('SIGTERM'); await Promise.race([once(server, 'exit'), delay(10000)]); if (server.exitCode === null) server.kill('SIGKILL'); }
  }
}
