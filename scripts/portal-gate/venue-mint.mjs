// Fixture-only: owner and admin sessions for the venue gate (entertainment plan, Phase 5).
// Copy into rentra-backend (its packages and `@/` alias), then from there:
//   node --import ./loader/register.mjs --env-file=.env venue-mint.mjs out.json
import postgres from 'postgres';
import { writeFile } from 'node:fs/promises';
import { SignJWT } from 'jose';
import { encryptSession } from '@/services/auth/session-crypto.js';
import { issuePortalSession } from '@/services/auth/portal-sessions.js';
const url = process.env.DATABASE_URL;
if (!/127\.0\.0\.1:55432\/rentra_cp02$/.test(url))
  throw new Error('refusing non-disposable database');
const sql = postgres(url, { max: 1 });
const [client] = await sql`SELECT id FROM "user" WHERE role='client' AND email='client@gmail.com'`;
await sql`INSERT INTO admin_user(email,password_hash,name) VALUES ('full@fixture.invalid','fixture-not-a-hash','Full Admin')
  ON CONFLICT (email) DO NOTHING`;
const [admin] = await sql`SELECT id FROM admin_user WHERE email='full@fixture.invalid'`;
// Partner pilot: owners can list venues, guests see nothing yet.
await sql`UPDATE vertical SET status='partners' WHERE code='entertainment'`;
const out = {
  clientId: client.id,
  adminId: admin.id,
  owner: await encryptSession({
    userId: client.id,
    role: 'client',
    accountStatus: 'active',
    sessionId: await issuePortalSession(sql, 'client', client.id, 86400),
  }),
  admin: await new SignJWT({
    adminId: admin.id,
    sessionId: await issuePortalSession(sql, 'admin', admin.id, 86400),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience('rentra:admin')
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(new TextEncoder().encode(process.env.SESSION_SECRET)),
};
await writeFile(process.argv[2], JSON.stringify(out));
await sql.end();
console.log('minted owner, admin');
