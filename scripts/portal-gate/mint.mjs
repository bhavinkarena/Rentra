// Fixture-only: mint portal sessions in the disposable DB for the browser gate.
import postgres from 'postgres';
import { writeFile } from 'node:fs/promises';
import { SignJWT } from 'jose';
import { encryptSession } from '@/services/auth/session-crypto.js';
import { issuePortalSession } from '@/services/auth/portal-sessions.js';
const url = process.env.DATABASE_URL;
if (!/127\.0\.0\.1:55432\/rentra_cp02$/.test(url))
  throw new Error('refusing non-disposable database');
const sql = postgres(url, { max: 1 });
const key = new TextEncoder().encode(process.env.SESSION_SECRET);
const [client] = await sql`SELECT id FROM "user" WHERE role='client' AND email='client@gmail.com'`;
await sql`INSERT INTO admin_user(email,password_hash,name,permissions) VALUES
  ('full@fixture.invalid','fixture-not-a-hash','Full Admin',NULL),
  ('limited@fixture.invalid','fixture-not-a-hash','Limited Admin','["admin.records.read"]'::jsonb)
  ON CONFLICT (email) DO NOTHING`;
const admins = await sql`SELECT id,email FROM admin_user WHERE email LIKE '%@fixture.invalid'`;
const adminToken = async (id) =>
  new SignJWT({ adminId: id, sessionId: await issuePortalSession(sql, 'admin', id, 3600) })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('rentra:admin')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);
const out = {
  client: await encryptSession({
    userId: client.id,
    role: 'client',
    accountStatus: 'active',
    sessionId: await issuePortalSession(sql, 'client', client.id, 3600),
  }),
};
for (const a of admins) out[a.email.split('@')[0]] = await adminToken(a.id);
const [listing] =
  await sql`SELECT id FROM rentable WHERE client_id=${client.id} AND status='live' LIMIT 1`;
out.listingId = listing?.id;
const [other] = await sql`SELECT id FROM rentable WHERE client_id<>${client.id} LIMIT 1`;
out.otherListingId = other?.id ?? null;
await writeFile(process.argv[2], JSON.stringify(out));
await sql.end();
console.log('minted', Object.keys(out).join(','));
