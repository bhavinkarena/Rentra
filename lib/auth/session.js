import 'server-only';

import { cookies } from 'next/headers';
import { getEnv } from '@/lib/validation/joi/env';
import {
  encryptSession,
  decryptSession,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
} from './session-crypto';

/**
 * Cookie handling for stateless sessions — the pattern the Next.js
 * authentication guide recommends. The signing itself lives in
 * session-crypto.js, which has no Next dependency.
 *
 * `accountStatus` is duplicated into the token deliberately: it saves a query
 * on every render, at the cost of being up to SESSION_TTL stale. So anything
 * that *changes* status must call `refreshSession`, and every consequential
 * write re-reads the row rather than trusting the cookie — see lib/auth/dal.js.
 */

/**
 * Call only from a Server Action or Route Handler.
 * `cookies()` is readable during render but writable only in those two places.
 */
export async function createSession({ userId, role, accountStatus }) {
  const token = await encryptSession({ userId, role, accountStatus });
  const jar = await cookies();

  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: getEnv().NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Re-issue with fresh claims — e.g. the moment an admin approves the account. */
export async function refreshSession(claims) {
  await createSession(claims);
}

export async function readSession() {
  const jar = await cookies();
  return decryptSession(jar.get(SESSION_COOKIE)?.value);
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };
