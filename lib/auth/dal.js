import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema/index.js';
import { readSession } from './session';

/**
 * Data Access Layer — the one place authorisation is decided.
 *
 * Every Server Component, Server Action and Route Handler that needs an actor
 * goes through here. Wrapped in React's `cache` so a page that checks the
 * session in four components still does one database read per render pass.
 */

/** The signed cookie only. Cheap; no database round trip. */
export const getSession = cache(async () => readSession());

/**
 * The authoritative user row.
 *
 * The session cookie carries `accountStatus` for cheap render-time gating,
 * but it can be up to 30 days stale — so anything consequential reads the
 * row. If an admin suspends a Client mid-session, this is what notices.
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session?.userId) return null;

  const [user] = await db
    .select({
      id: users.id,
      role: users.role,
      name: users.name,
      email: users.email,
      phone: users.phone,
      emailVerifiedAt: users.emailVerifiedAt,
      phoneVerifiedAt: users.phoneVerifiedAt,
      accountStatus: users.accountStatus,
      preferredLocale: users.preferredLocale,
      clientType: users.clientType,
      kycStatus: users.kycStatus,
      payoutUpiId: users.payoutUpiId,
      personId: users.personId,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user ?? null;
});

/** Redirects to the role's login route when there is no valid session. */
export async function requireUser(role) {
  const user = await getCurrentUser();
  const loginPath = role === 'client' ? '/partner/login' : '/login';

  if (!user) redirect(loginPath);
  if (role && user.role !== role) redirect(loginPath);
  if (user.accountStatus === 'blocked') redirect(`${loginPath}?blocked=1`);

  return user;
}

/**
 * A Client who is logged in but not yet approved. Correct for the whole
 * onboarding surface — they are inside the product, working the stepper.
 */
export async function requireClient() {
  return requireUser('client');
}

/**
 * A Client cleared to publish. This is Gate 1, enforced.
 * Callers that merely *display* a locked button should use `requireClient`
 * plus `profileCompletion` instead — see lib/auth/profile.js.
 */
export async function requireActiveClient() {
  const user = await requireUser('client');
  if (user.accountStatus !== 'active') redirect('/partner');
  return user;
}

export async function requireCustomer() {
  return requireUser('customer');
}
