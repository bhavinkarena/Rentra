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
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
export async function executeHotelPayoutRun(input) {
  return payoutCall('/admin/payments/hotel-payout-runs', input);
}
export async function settleHotelPayoutRun(runId) {
  return payoutCall(`/admin/payments/hotel-payout-runs/${runId}/settle`, {});
}
