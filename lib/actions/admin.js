'use server';

import { adminApi } from '@/lib/api/endpoints';
import { revalidatePath } from 'next/cache';
import { runApiAction } from '@/lib/api/action';
import { ApiError, resultMeta } from '@/lib/api/client';

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

/**
 * Suspend or reinstate a client. The API re-checks the reviewed
 * `expectedVersion` and answers 409 when another admin changed the account.
 * Written out rather than through runApiAction because the form needs the
 * failure `code` to offer a reload on conflict.
 */
export async function changeClientLifecycle(_previous, formData) {
  const id = String(formData.get('clientId') ?? '');
  const call =
    formData.get('action') === 'reinstate' ? adminApi.reinstateClient : adminApi.suspendClient;
  let result;
  try {
    result = await call(id, formData);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      error: error.message,
      code: error.code,
      errors: error.isValidation ? error.fields : undefined,
    };
  }
  // Public listing pages change visibility with the owner's status.
  for (const path of resultMeta(result).revalidate) revalidatePath(path);
  revalidatePath('/admin/clients');
  revalidatePath(`/admin/clients/${id}`);
  return { ok: true, accountStatus: result.accountStatus };
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
