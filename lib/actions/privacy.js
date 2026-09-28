'use server';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';
export async function privacyCommand(id, input) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { error: 'Invalid request.' };
  try {
    const result = await api.post(`/admin/privacy/requests/${id}`, input);
    if (input.command !== 'preview') {
      revalidatePath('/admin/privacy', 'layout');
      revalidatePath('/account/privacy');
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
