'use server';

import { revalidatePath } from 'next/cache';
import { customerApi, savedApi, bookingApi } from '@/lib/api/endpoints';
import { runApiAction } from '@/lib/api/action';

/**
 * Everything a signed-in guest does: their account, their bookings, reviews,
 * support and saved places.
 */

/* --------------------------------- account --------------------------------- */

export async function updateCustomerProfile(_previous, formData) {
  const result = await runApiAction(() => customerApi.updateProfile(formData));
  if (result.ok) revalidatePath('/', 'layout');
  return result;
}

export async function submitPrivacyRequest(_previous, formData) {
  return runApiAction(() => customerApi.privacyRequest(formData));
}

/**
 * A phone change is two steps by design: the new number proves it can receive
 * a code before it replaces the old one, so a typo cannot lock the account out.
 */
export async function requestPhoneChange(_previous, formData) {
  return runApiAction(() => customerApi.requestPhoneChange(formData));
}

export async function confirmPhoneChange(_previous, formData) {
  return runApiAction(() => customerApi.confirmPhoneChange(formData));
}

/* --------------------------------- bookings -------------------------------- */

export async function bookAgain(_previous, formData) {
  return runApiAction(() => customerApi.rebook(formData));
}

/** Always previewed before it is executed — never cancelled in one call. */
export async function previewCustomerCancellation(input) {
  return runApiAction(() => customerApi.previewCancellation(input));
}

export async function cancelCustomerVisits(input) {
  return runApiAction(() => customerApi.cancel(input));
}

/* --------------------------------- checkout -------------------------------- */

export async function requestBookingQuote(input) {
  return runApiAction(() => bookingApi.quote(input));
}

export async function holdCustomerCheckout(input) {
  return runApiAction(() => bookingApi.hold(input));
}

export async function startCustomerTestPayment(orderId) {
  return runApiAction(() => bookingApi.startPayment(orderId));
}

export async function verifyCustomerTestPayment(input) {
  return runApiAction(() => bookingApi.verifyPayment(input));
}

export async function customerCheckoutStatus(orderId) {
  return runApiAction(() => bookingApi.status(orderId));
}

/** Reconcile with the gateway when the browser never came back from payment. */
export async function refreshCustomerTestPayment(orderId) {
  return runApiAction(() => bookingApi.refresh(orderId));
}

export async function releaseCustomerCheckout(orderId) {
  return runApiAction(() => bookingApi.release(orderId));
}

/* ---------------------------------- reviews --------------------------------- */

export async function submitCustomerReview(_previous, formData) {
  return runApiAction(() => customerApi.submitReview(formData));
}

export async function customerReviewReport(_previous, formData) {
  return runApiAction(() => customerApi.reportReview(formData));
}

/* ---------------------------------- support --------------------------------- */

export async function openSupport(_previous, formData) {
  return runApiAction(() => customerApi.openSupport(formData));
}

export async function replyCustomerSupport(_previous, formData) {
  return runApiAction(() => customerApi.replySupport(String(formData.get('id') ?? ''), formData));
}

/* ------------------------------- notifications ------------------------------ */

export async function readNotification(formData) {
  return runApiAction(() => customerApi.markNotificationRead(formData));
}

/* ------------------------------- saved places ------------------------------- */

/**
 * Saved places work signed out too — the API decides guest versus account
 * from the session, which is why none of these take an actor.
 */
export async function loadSavedPlaces() {
  return runApiAction(() => savedApi.mine());
}

export async function loadGuestSavedPlaces(input) {
  return runApiAction(() => savedApi.guest(input));
}

export async function updateSavedPlace(scope, input) {
  return runApiAction(() => savedApi.update(scope, input));
}

export async function mergeGuestSavedPlaces(scope, input) {
  return runApiAction(() => savedApi.merge(scope, input));
}

export async function updateCustomerPhoto(_previous, formData) {
  return runApiAction(() => customerApi.updatePhoto(formData));
}
