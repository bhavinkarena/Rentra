'use server';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';

/** Hotel commission rules and tax slabs (hotel plan, Phase 4): one preview/save command each. */
const PATHS = { commission: '/admin/payments/hotel-commission', tax: '/admin/payments/hotel-tax-slabs' };
const PAGES = { commission: '/admin/finance/commission', tax: '/admin/finance/tax' };

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
