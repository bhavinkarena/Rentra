'use server';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';

/** Hotel operations for owners (hotel plan, Phase 5). */
async function post(path, page, input) {
  try {
    const result = await api.post(path, input);
    if (result.ok) revalidatePath(page);
    return result;
  } catch (error) {
    if (error instanceof ApiError)
      return { error: error.message, code: error.code, fields: error.fields };
    throw error;
  }
}

const validId = (id) => /^[0-9a-f-]{36}$/.test(String(id));

export async function changeHotelAri(listingId, input) {
  if (!validId(listingId)) return { error: 'Invalid property.' };
  return post(`/partner/listings/${listingId}/calendar/hotel`, '/partner/calendar', input);
}

/** The same change made by hotel staff (manager or front desk). */
export async function changeStaffHotelAri(listingId, input) {
  if (!validId(listingId)) return { error: 'Invalid property.' };
  return post(`/staff/hotels/${listingId}/rooms`, `/staff/hotels/${listingId}`, input);
}
