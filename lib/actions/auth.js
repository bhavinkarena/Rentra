'use server';

import { authApi, customerAuthApi, adminAuthApi } from '@/lib/api/endpoints';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { runApiAction } from '@/lib/api/action';

/**
 * Sign-in and verification, as Server Actions.
 *
 * Each one forwards the form straight to the API and maps the envelope back
 * to the `{ ok } / { error } / { errors }` shape the form components read.
 * The session cookie the API sets is relayed to the browser by the API
 * client — see `relaySetCookie` — which is what makes signing in from a
 * Server Action work at all.
 */

/* ------------------------------ client (owner) ------------------------------ */

export async function requestClientOtp(_previous, formData) {
  return runApiAction(() => authApi.requestOtp(formData));
}

export async function verifyClientOtp(_previous, formData) {
  const result = await runApiAction(() => authApi.verifyOtp(formData));
  if (result.ok && ['/partner', '/partner/welcome'].includes(result.next)) redirect(result.next);
  return result;
}

export async function requestPhoneVerification(_previous, formData) {
  return runApiAction(() => authApi.requestPhoneOtp(formData));
}

export async function confirmPhoneVerification(_previous, formData) {
  const result = await runApiAction(() => authApi.confirmPhoneOtp(formData));
  if (
    result.ok &&
    /^\/partner\/onboarding\/(details|kyc|payout|consent|review)$/.test(result.next)
  ) {
    revalidatePath('/partner', 'layout');
    redirect(result.next);
  }
  return result;
}

export async function logout() {
  return runApiAction(() => authApi.logout());
}

/**
 * Records a locked Add property click for the signed-in owner.
 * The audit includes the owner ID and the number of clicks in this event.
 */
export async function recordLockedCtaClick(count = 1) {
  return runApiAction(() => authApi.recordLockedCta(count));
}

/* --------------------------------- customer -------------------------------- */

export async function beginCustomerLogin(input) {
  return runApiAction(() => customerAuthApi.begin(input));
}

export async function requestCustomerOtp(_previous, formData) {
  return runApiAction(() => customerAuthApi.requestOtp(formData));
}

export async function verifyCustomerOtp(_previous, formData) {
  return runApiAction(() => customerAuthApi.verifyOtp(formData));
}

export async function switchToCustomer() {
  return runApiAction(() => customerAuthApi.switchToCustomer());
}

export async function restoreCustomerSelection(rentableId) {
  return runApiAction(() => customerAuthApi.restoreSelection(rentableId));
}

export async function logoutCustomer() {
  return runApiAction(() => customerAuthApi.logout());
}

/* ---------------------------------- admin ---------------------------------- */

export async function adminLogin(_previous, formData) {
  return runApiAction(() => adminAuthApi.login(formData));
}

export async function adminLogout() {
  return runApiAction(() => adminAuthApi.logout());
}
