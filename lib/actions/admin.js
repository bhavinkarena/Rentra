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
 * An admin account command whose form needs the failure `code` (409 conflicts
 * offer a reload). Written out rather than through runApiAction so the shared
 * helper, which customer forms also use, keeps its exact behavior.
 */
async function accountCommand(call, paths) {
  let result;
  try {
    result = await call();
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return {
      error: error.message,
      code: error.code,
      errors: error.isValidation ? error.fields : undefined,
    };
  }
  // Public listing pages change visibility with an owner's status.
  for (const path of resultMeta(result).revalidate) revalidatePath(path);
  for (const path of paths) revalidatePath(path);
  return { ok: true, ...result };
}

/** Suspend or reinstate a client; the API re-checks `expectedVersion` (409 when stale). */
export async function changeClientLifecycle(_previous, formData) {
  const id = String(formData.get('id') ?? '');
  const call =
    formData.get('action') === 'reinstate' ? adminApi.reinstateClient : adminApi.suspendClient;
  return accountCommand(() => call(id, formData), ['/admin/clients', `/admin/clients/${id}`]);
}

const CUSTOMER_COMMANDS = {
  suspend: (id, form) => adminApi.restrictCustomer(id, form),
  reinstate: (id, form) => adminApi.reinstateCustomer(id, form),
  revoke: (id, form) => adminApi.revokeCustomerSessions(id, form),
  profile: (id, form) => adminApi.correctCustomer(id, form),
};

/** Restrict, reinstate, sign out everywhere or correct a customer's profile. */
export async function customerAccountCommand(_previous, formData) {
  const id = String(formData.get('id') ?? '');
  const run = CUSTOMER_COMMANDS[formData.get('command') ?? formData.get('action')];
  if (!run) return { error: 'Unknown command.' };
  return accountCommand(() => run(id, formData), ['/admin/customers', `/admin/customers/${id}`]);
}

/** Claim, release or take over a Gate 1 application. */
export async function assignApplication(_previous, formData) {
  const id = String(formData.get('applicationId') ?? '');
  return accountCommand(
    () => adminApi.assignApplication(id, formData),
    ['/admin', `/admin/applications/${id}`],
  );
}

/* ---------------------------------- KYC ----------------------------------- */

export async function propertyReviewCommand(_previous, formData) {
  const id = String(formData.get('id') ?? '');
  const command = String(formData.get('command') ?? '');
  const visitId = String(formData.get('visitId') ?? '');
  const call =
    {
      assign: () => adminApi.assignProperty(id, formData),
      decide: () => adminApi.decideProperty(id, formData),
      schedule: () => adminApi.scheduleVerification(id, formData),
      reschedule: () => adminApi.verificationCommand(id, visitId, 'reschedule', formData),
      cancel: () => adminApi.verificationCommand(id, visitId, 'cancel', formData),
      outcome: () => adminApi.verificationCommand(id, visitId, 'outcome', formData),
      publish: () => adminApi.publishProperty(id, formData),
      hide: () => adminApi.propertyLifecycle(id, 'hide', formData),
      restore: () => adminApi.propertyLifecycle(id, 'restore', formData),
      correction: () => adminApi.propertyLifecycle(id, 'correction', formData),
    }[command] ?? (() => adminApi.decideProperty(id, formData));
  return accountCommand(
    () => call(),
    [
      '/admin/properties',
      `/admin/properties/${id}`,
      `/partner/listings/${id}`,
      '/partner/listings',
    ],
  );
}

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

export async function reportAdminIncident(_previous, formData) {
  return runApiAction(() => adminApi.reportIncident(formData));
}

export async function closeAdminIncident(_previous, formData) {
  return runApiAction(() => adminApi.closeIncident(formData));
}

export async function correctAdminEvidence(_previous, formData) {
  return runApiAction(() => adminApi.correctEvidence(formData));
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
