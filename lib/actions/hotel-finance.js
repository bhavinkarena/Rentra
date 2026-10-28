'use server';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';

/** Hotel commission rules and tax slabs (hotel plan, Phase 4): one preview/save command each. */
const PATHS = {
  payoutMode: '/admin/payments/payout-modes',
  commission: '/admin/payments/hotel-commission',
  tax: '/admin/payments/hotel-tax-slabs',
  serviceFee: '/admin/payments/service-fee',
};
const PAGES = {
  payoutMode: '/admin/finance/payout-modes',
  commission: '/admin/finance/commission',
  tax: '/admin/finance/tax',
  serviceFee: '/admin/finance/service-fee',
};

export async function hotelFinanceCommand(kind, input) {
  if (!PATHS[kind]) return { error: 'Unknown command.' };
  try {
    const result = await api.post(PATHS[kind], input);
    if (result.ok) revalidatePath(PAGES[kind]);
    return result;
  } catch (error) {
    if (error instanceof ApiError)
      return { error: error.message, code: error.code, fields: error.fields };
    throw error;
  }
}

/** Create or close an unfunded Test statement; Live bank execution is unavailable. */
async function payoutCall(path, input) {
  try {
    const result = await api.post(path, input);
    revalidatePath('/admin/finance/hotel-payouts');
    return result;
  } catch (error) {
    if (error instanceof ApiError)
      return { error: error.message, code: error.code, status: error.status };
    throw error;
  }
}
export async function executeHotelPayoutRun(input) {
  return payoutCall('/admin/payments/hotel-payout-runs', input);
}
export async function settleHotelPayoutRun(runId) {
  return payoutCall(`/admin/payments/hotel-payout-runs/${runId}/settle`, {});
}

/** Story 2.17: assign a Test owner recovery obligation (hash + version + request key bound). */
export async function assignOwnerRecovery(sourceId, input) {
  try {
    const result = await api.post(
      `/admin/payments/owner-recoveries/${encodeURIComponent(sourceId)}`,
      input,
    );
    revalidatePath('/admin/finance/owner-recoveries');
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ApiError)
      return { error: error.message, code: error.code, fields: error.fields };
    throw error;
  }
}

/** Story 2.18: create or replace a Test repayment link (recovery version + request key bound). */
export async function createOwnerRepaymentLink(sourceId, input) {
  return repaymentCall(sourceId, '', input);
}
/** Story 2.18: re-read Razorpay Test payments for the recovery's links; settles exact captures. */
export async function checkOwnerRepaymentLink(sourceId) {
  return repaymentCall(sourceId, '/check', {});
}
/** Story 2.18: close a needs_review link when Razorpay Test shows no captured payment. */
export async function resolveOwnerRepaymentLink(sourceId, input) {
  return repaymentCall(sourceId, '/resolve', input);
}
async function repaymentCall(sourceId, suffix, input) {
  try {
    const result = await api.post(
      `/admin/payments/owner-recoveries/${encodeURIComponent(sourceId)}/repayment-link${suffix}`,
      input,
    );
    revalidatePath('/admin/finance/owner-recoveries');
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ApiError)
      return { error: error.message, code: error.code, status: error.status };
    throw error;
  }
}
