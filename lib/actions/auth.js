'use server';

import { authApi, customerAuthApi, adminAuthApi } from '@/lib/api/endpoints';
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
  return runApiAction(() => authApi.verifyOtp(formData));
}

export async function requestPhoneVerification(_previous, formData) {
  return runApiAction(() => authApi.requestPhoneOtp(formData));
}

export async function confirmPhoneVerification(_previous, formData) {
  return runApiAction(() => authApi.confirmPhoneOtp(formData));
}

export async function logout() {
  return runApiAction(() => authApi.logout());
}

/**
 * Funnel counter for a locked call to action. Aggregate only — it records
 * that a locked button was clicked, never who clicked it.
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
