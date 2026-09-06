/**
 * End-to-end auth verification against the real database.
 *
 * Exercises the actual OTP path — issue, hash, store, expire, attempt-count,
 * consume — plus the rate limits, the dev bypass, and the env guard. Run with:
 *   node --env-file=.env.local scripts/verify-auth.mjs
 */
import postgres from 'postgres';

const pass = [];
const fail = [];
function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
const TEST_EMAIL = `authtest+${Date.now()}@example.com`;
const TEST_PHONE = '9111100001';

// Clean slate for this run.
await sql`DELETE FROM otp_token WHERE identifier IN (${TEST_EMAIL}, ${TEST_PHONE})`;
await sql`DELETE FROM "user" WHERE email LIKE 'authtest+%'`;

const { getEnv, isOtpBypassEnabled } = await import('../lib/validation/joi/env.js');
const { issueOtp, verifyOtp, normalisePhone, normaliseEmail, OTP_RULES, DEV_CODE } =
  await import('../lib/auth/otp.js');

console.log('\n— env guard —');
const env = getEnv();
check('env validates', env.NODE_ENV === 'development');
check('SESSION_SECRET >= 32 chars', env.SESSION_SECRET.length >= 32);
check('bypass enabled in dev', isOtpBypassEnabled() === true);

// The guard that actually matters: production + bypass must refuse to boot.
{
  const saved = { NODE_ENV: process.env.NODE_ENV, DEV_OTP_BYPASS: process.env.DEV_OTP_BYPASS };
  process.env.NODE_ENV = 'production';
  process.env.DEV_OTP_BYPASS = 'true';
  let threw = false;
  let msg = '';
  try {
    // Fresh module instance so the memoised env is not reused.
    const mod = await import(`../lib/validation/joi/env.js?bust=${Date.now()}`);
    mod.getEnv();
  } catch (e) {
    threw = true;
    msg = e.message.split('\n').pop().trim();
  }
  check('production + bypass REFUSES TO BOOT', threw, msg);
  Object.assign(process.env, saved);
}

console.log('\n— normalisation —');
check('phone +91 stripped', normalisePhone('+91 98765 43210') === '9876543210');
check('phone leading 0 stripped', normalisePhone('098765-43210') === '9876543210');
check('email lowercased/trimmed', normaliseEmail('  Foo@BAR.com ') === 'foo@bar.com');

console.log('\n— issue + verify (real code path, no bypass) —');
const issued = await issueOtp({
  identifier: TEST_EMAIL, channel: 'email', purpose: 'login', ip: '127.0.0.1',
  __returnCodeForTests: true,
});
check('otp issued', issued.ok === true);
check('devCode returned in dev', typeof issued.code === 'string' && /^\d{6}$/.test(issued.code));

const [row] = await sql`SELECT * FROM otp_token WHERE identifier = ${TEST_EMAIL}`;
check('row persisted', Boolean(row));
check('code is HASHED not stored', row.code_hash !== issued.code && row.code_hash.length === 64);
// 15s tolerance: this compares local wall clock against a timestamp written
// by Neon over the network, so a tight bound flakes for no useful reason.
check('expiry ~10 min', Math.abs((new Date(row.expires_at) - Date.now()) - OTP_RULES.ttlMs) < 15000);

const wrong = await verifyOtp({ identifier: TEST_EMAIL, purpose: 'login', code: '000000' });
check('wrong code rejected', wrong.ok === false && wrong.reason === 'wrong_code');

const [afterWrong] = await sql`SELECT attempts FROM otp_token WHERE id = ${row.id}`;
check('attempt counted', afterWrong.attempts === 1);

const right = await verifyOtp({ identifier: TEST_EMAIL, purpose: 'login', code: issued.code });
check('real code accepted', right.ok === true && right.viaBypass === false);

const [consumed] = await sql`SELECT consumed_at FROM otp_token WHERE id = ${row.id}`;
check('code consumed', consumed.consumed_at !== null);

const replay = await verifyOtp({ identifier: TEST_EMAIL, purpose: 'login', code: issued.code });
check('replay of consumed code fails', replay.ok === false, replay.reason);

console.log('\n— dev bypass —');
const bypass = await verifyOtp({ identifier: TEST_EMAIL, purpose: 'login', code: DEV_CODE });
check('123456 accepted in dev', bypass.ok === true && bypass.viaBypass === true);

console.log('\n— rate limits —');
const tooSoon = await issueOtp({ identifier: TEST_EMAIL, channel: 'email', purpose: 'login' });
check('60s resend cooldown enforced', tooSoon.ok === false && tooSoon.reason === 'cooldown');

// Backdate so the cooldown passes but the hourly window still counts them.
await sql`UPDATE otp_token SET created_at = now() - interval '5 minutes' WHERE identifier = ${TEST_EMAIL}`;
const second = await issueOtp({ identifier: TEST_EMAIL, channel: 'email', purpose: 'login' });
check('resend allowed after cooldown', second.ok === true);

await sql`UPDATE otp_token SET created_at = now() - interval '5 minutes' WHERE identifier = ${TEST_EMAIL}`;
const third = await issueOtp({ identifier: TEST_EMAIL, channel: 'email', purpose: 'login' });
check('3rd within the hour allowed', third.ok === true);

await sql`UPDATE otp_token SET created_at = now() - interval '5 minutes' WHERE identifier = ${TEST_EMAIL}`;
const fourth = await issueOtp({ identifier: TEST_EMAIL, channel: 'email', purpose: 'login' });
check('4th blocked by hourly limit', fourth.ok === false && fourth.reason === 'hourly_limit');

console.log('\n— expiry + attempt ceiling —');
await sql`DELETE FROM otp_token WHERE identifier = ${TEST_PHONE}`;
const ph = await issueOtp({
  identifier: TEST_PHONE, channel: 'sms', purpose: 'verify_phone', __returnCodeForTests: true,
});
await sql`UPDATE otp_token SET expires_at = now() - interval '1 minute' WHERE identifier = ${TEST_PHONE}`;
const expired = await verifyOtp({ identifier: TEST_PHONE, purpose: 'verify_phone', code: ph.code });
check('expired code rejected', expired.ok === false && expired.reason === 'expired');

await sql`UPDATE otp_token SET expires_at = now() + interval '5 minutes', attempts = ${OTP_RULES.maxAttempts}
          WHERE identifier = ${TEST_PHONE}`;
const locked = await verifyOtp({ identifier: TEST_PHONE, purpose: 'verify_phone', code: ph.code });
check('attempt ceiling enforced', locked.ok === false && locked.reason === 'too_many_attempts');

console.log('\n— session round trip —');
const { encryptSession, decryptSession } = await import('../lib/auth/session-crypto.js');
const token = await encryptSession({ userId: 'u-1', role: 'client', accountStatus: 'pending_application' });
const decoded = await decryptSession(token);
check('session signs + verifies', decoded?.userId === 'u-1' && decoded.role === 'client');
check('tampered token rejected', (await decryptSession(`${token}x`)) === null);
check('garbage token rejected', (await decryptSession('not-a-jwt')) === null);
check('no PII in payload', !JSON.stringify(decoded).includes('@'));

console.log('\n— (email, role) uniqueness —');
try {
  await sql`INSERT INTO "user" (email, role) VALUES (${TEST_EMAIL}, 'client')`;
  await sql`INSERT INTO "user" (email, role) VALUES (${TEST_EMAIL}, 'customer')`;
  check('same email, two roles allowed', true);
} catch (e) {
  check('same email, two roles allowed', false, e.message);
}
try {
  await sql`INSERT INTO "user" (email, role) VALUES (${TEST_EMAIL}, 'client')`;
  check('duplicate (email, role) blocked', false, 'insert unexpectedly succeeded');
} catch {
  check('duplicate (email, role) blocked', true);
}

// Regression guard: a Server Action must never return a plaintext code to the
// browser. Nothing in lib/auth/actions.js may pass __returnCodeForTests, and
// nothing may forward result.code into its response.
{
  const src = await import('node:fs').then((fs) => fs.readFileSync('lib/auth/actions.js', 'utf8'));
  check('actions never request a plaintext code', !src.includes('__returnCodeForTests'));
  check('actions never return result.code', !/result\.code/.test(src));
}

// Cleanup
await sql`DELETE FROM otp_token WHERE identifier IN (${TEST_EMAIL}, ${TEST_PHONE})`;
await sql`DELETE FROM "user" WHERE email LIKE 'authtest+%'`;

console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log('FAILED:', fail.join(' | '));
await sql.end();
process.exit(fail.length ? 1 : 0);
