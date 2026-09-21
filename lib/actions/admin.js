'use server';

import { adminApi } from '@/lib/api/endpoints';
import { runApiAction } from '@/lib/api/action';

/**
 * Super Admin operations.
 *
 * Every one of these is audited on the API with the admin as actor, so
 * nothing here needs to record anything itself — it would only produce a
 * second, less trustworthy copy of the same event.
 */

/* --------------------------- partner approval queue -------------------------- */

export async function approveApplication(_previous, formData) {
  return runApiAction(() => adminApi.approve(formData));
}

export async function requestMoreInfo(_previous, formData) {
  return runApiAction(() => adminApi.requestMoreInfo(formData));
}

export async function rejectApplication(_previous, formData) {
  return runApiAction(() => adminApi.reject(formData));
}

export async function suspendClient(_previous, formData) {
  return runApiAction(() => adminApi.suspendClient(formData));
}

/* ---------------------------------- KYC ----------------------------------- */

export async function reviewDocument(_previous, formData) {
  return runApiAction(() => adminApi.reviewDocument(formData));
}

/* --------------------------------- payments -------------------------------- */

export async function setPaymentGatewayConfiguration(_previous, formData) {
  return runApiAction(() => adminApi.savePaymentConfiguration(formData));
}

/* ------------------------- bookings, reviews, support ------------------------ */

export async function recordAdminVisit(_previous, formData) {
  return runApiAction(() => adminApi.recordVisit(formData));
}

export async function moderateCustomerReview(_previous, formData) {
  return runApiAction(() => adminApi.moderateReview(formData));
}

export async function resolveReviewReport(_previous, formData) {
  return runApiAction(() => adminApi.resolveReviewReport(formData));
}

export async function replyAdminSupport(_previous, formData) {
  return runApiAction(() => adminApi.replySupport(String(formData.get('id') ?? ''), formData));
}

/* ------------------------- notifications and privacy ------------------------- */

export async function manageNotification(_previous, formData) {
  return runApiAction(() => adminApi.manageNotification(formData));
}

export async function reviewPrivacyRequest(_previous, formData) {
  return runApiAction(() => adminApi.startPrivacyReview(formData));
}
