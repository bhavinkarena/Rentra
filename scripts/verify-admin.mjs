/**
 * Admin credential + review verification against the real database.
 *
 *   npm run verify:admin
 */
import postgres from 'postgres';

const pass = [];
const fail = [];
function check(name, ok, detail = '') {
  (ok ? pass : fail).push(name);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

const {
  hashPassword, verifyPassword, generateTotpSecret, verifyTotp, currentTotp,
  totpUri, generateStrongPassword, LOCKOUT,
} = await import('../lib/auth/admin-crypto.js');

console.log('\n— password hashing —');
const pw = generateStrongPassword();
check('generated password is 20 chars', pw.length === 20);
check('no ambiguous characters', !/[0O1lI]/.test(pw), pw);

const hash = hashPassword(pw);
check('stored as scrypt with params', hash.startsWith('scrypt$32768$8$1$'));
check('plaintext is NOT in the hash', !hash.includes(pw));
check('correct password verifies', verifyPassword(pw, hash) === true);
check('wrong password rejected', verifyPassword(`${pw}x`, hash) === false);
check('empty password rejected', verifyPassword('', hash) === false);

const hash2 = hashPassword(pw);
check('same password, different hash (salted)', hash !== hash2);
check('both hashes still verify', verifyPassword(pw, hash2) === true);
check('garbage stored value rejected', verifyPassword(pw, 'not-a-hash') === false);
check('legacy placeholder rejected', verifyPassword(pw, 'REPLACE_ME_WITH_ARGON2_HASH') === false);

console.log('\n— TOTP —');
const secret = generateTotpSecret();
check('secret is base32', /^[A-Z2-7]{16,}$/.test(secret), secret.slice(0, 12) + '…');
const token = currentTotp(secret);
check('token is 6 digits', /^\d{6}$/.test(token), token);
check('current token verifies', verifyTotp({ secret, token }) === true);
check('wrong token rejected', verifyTotp({ secret, token: '000000' }) === false);
check('empty token rejected', verifyTotp({ secret, token: '' }) === false);
check('non-numeric token rejected', verifyTotp({ secret, token: 'abcdef' }) === false);
check('no secret means no pass', verifyTotp({ secret: null, token }) === false);
// The bug this guards: verifySync returns {valid,...}, and reading it as truthy
// would accept EVERY wrong code.
check('object result is unwrapped, not truthy-tested', verifyTotp({ secret, token: '111111' }) === false);
check('uri is otpauth', totpUri({ email: 'a@b.com', secret }).startsWith('otpauth://totp/'));

console.log('\n— the provisioned admin —');
const [admin] = await sql`SELECT * FROM admin_user WHERE email = 'admin@gmail.com'`;
check('admin@gmail.com exists', Boolean(admin));
check('is active', admin?.is_active === true);
check('password stored hashed', admin?.password_hash?.startsWith('scrypt$') === true);
check('no plaintext placeholder anywhere', !/REPLACE_ME/.test(admin?.password_hash ?? ''));
check('lockout counters start clean', admin?.failed_attempts === 0 && admin?.locked_until === null);
const [placeholders] = await sql`
  SELECT count(*)::int n FROM admin_user WHERE password_hash NOT LIKE 'scrypt$%'`;
check('no unusable admin rows remain', placeholders.n === 0, `${placeholders.n} found`);

console.log('\n— lockout policy —');
check('locks after 5 attempts', LOCKOUT.maxAttempts === 5);
check('locks for 15 minutes', LOCKOUT.lockMinutes === 15);

console.log('\n— admin session is a SEPARATE token —');
const { encryptSession } = await import('../lib/auth/session-crypto.js');
const clientToken = await encryptSession({ userId: 'u1', role: 'client', accountStatus: 'active' });
const { jwtVerify } = await import('jose');
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
let replayed = false;
try {
  // A client session must NOT validate as an admin session, even though both
  // are signed with the same secret — the audience claim is what stops it.
  await jwtVerify(clientToken, key, { algorithms: ['HS256'], audience: 'rentra:admin' });
  replayed = true;
} catch { /* expected */ }
check('client token cannot be replayed as admin', replayed === false);

console.log('\n— review queue —');
const { getApplicationQueue, getQueueStats, SLA_HOURS } =
  await import('../lib/db/admin-queries.js');
const stats = await getQueueStats();
check('stats query runs', typeof stats.submitted === 'number', JSON.stringify(stats));
const queue = await getApplicationQueue();
check('queue query runs', Array.isArray(queue), `${queue.length} waiting`);
check('SLA is the published 48h', SLA_HOURS === 48);
if (queue.length) {
  const q = queue[0];
  check('queue rows carry age in hours', typeof q.ageHours === 'number');
  check('queue rows carry the CTA-click signal', typeof q.ctaClicks === 'number');
  check('overdue derives from the SLA', q.overdue === (q.ageHours > SLA_HOURS));
} else {
  console.log('  (queue empty — submit an application to exercise the row shape)');
}

console.log('\n— decisions require a written reason —');
const src = await import('node:fs').then((fs) => fs.readFileSync('lib/auth/admin-actions.js', 'utf8'));
check('reject demands a reason', /A rejection must carry a reason/.test(src));
check('more-info demands a reason', /Say what is needed/.test(src));
check('all three outcomes exist', ['approveApplication', 'requestMoreInfo', 'rejectApplication']
  .every((f) => src.includes(`export async function ${f}`)));
check('third strike blocks the account', /strikes >= 3/.test(src));
check('more-info is NOT a strike', !/more_info[\s\S]{0,400}strikeCount:/.test(src));
check('production without TOTP is refused', /no_totp_in_production/.test(src));
check('decisions re-check status server-side', (src.match(/status !== 'submitted'/g) ?? []).length >= 3);

console.log(`\n${pass.length} passed, ${fail.length} failed`);
if (fail.length) console.log('FAILED:', fail.join(' | '));
await sql.end();
process.exit(fail.length ? 1 : 0);
