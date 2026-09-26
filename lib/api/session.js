import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { authApi, adminAuthApi } from './endpoints.js';
import { ApiError } from './client.js';

/**
 * Who the current request belongs to, and the guards pages use to insist.
 *
 * This replaces the old `lib/auth/dal.js`, which read the database directly.
 * The database now lives behind the API, so the shape is the same but the
 * source is `/auth/me` and `/admin/auth/me`. Everything else about how pages
 * use it is unchanged — deliberately, so the guards below read the same at
 * every call site they already had.
 *
 * Wrapped in React's `cache` so a page that checks the session in four
 * components still makes one request per render pass. Without it, a layout
 * plus three components is four round trips to the API for one answer.
 */

/**
 * The current user, or null. Never throws.
 *
 * A 401 is the ordinary signed-out answer, not a failure — the marketing
 * pages call this and render fine without a user. Any other error is also
 * swallowed to null: a page that cannot reach the API should render signed
 * out rather than show an error screen to a visitor who is just browsing.
 */
export const getCurrentUser = cache(async () => {
  try {
    const result = await authApi.me();
    return result?.user ?? null;
  } catch (error) {
    if (error instanceof ApiError) return null;
    throw error;
  }
});

/**
 * The user together with their onboarding completion state.
 *
 * `/auth/me` returns both in one response because every partner screen needs
 * both, and the old code made two separate database reads for it. Pages that
 * only need the actor should call `getCurrentUser`.
 */
export const getCurrentUserWithCompletion = cache(async () => {
  try {
    return (await authApi.me()) ?? { user: null, completion: null };
  } catch (error) {
    if (error instanceof ApiError) return { user: null, completion: null };
    throw error;
  }
});

/**
 * The session claims the old DAL exposed separately.
 *
 * There is no longer a cookie this process can decode — the session is the
 * API's. Callers only ever used it to identify the actor, so it is derived
 * from the user instead of parsed.
 */
export const getSession = cache(async () => {
  const user = await getCurrentUser();
  return user ? { userId: user.id, role: user.role } : null;
});

/** Redirects to the role's login route when there is no valid session. */
async function requireUser(role) {
  // Protected pages must surface an API outage instead of reporting a revoked session.
  const result = await authApi.me();
  const user = result?.user ?? null;
  const loginPath = role === 'client' ? '/partner/login' : '/login';

  if (!user) redirect(role === 'client' ? `${loginPath}?session=ended` : loginPath);
  if (role && user.role !== role) redirect(loginPath);
  if (['blocked', 'suspended'].includes(user.accountStatus)) redirect(`${loginPath}?blocked=1`);

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
 *
 * Callers that merely *display* a locked button should use `requireClient`
 * plus the `completion` from `/auth/me` instead.
 */
export async function requireActiveClient() {
  const user = await requireUser('client');
  if (user.accountStatus !== 'active') redirect('/partner');
  return user;
}

export async function requireCustomer() {
  return requireUser('customer');
}

/**
 * The Super Admin actor, or null.
 *
 * A separate session from the client/customer one, all the way down to a
 * separate cookie on the API — role confusion on the account that releases
 * payouts is not a bug worth risking.
 */
export const getCurrentAdmin = cache(async () => {
  try {
    const result = await adminAuthApi.me();
    return result?.admin ?? null;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
});

export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect('/admin/login?session=ended');
  return admin;
}
