'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';
export async function contentCommand(kind, input) {
  if (!['terms', 'privacy', 'cancellation', 'help', 'contact'].includes(kind))
    return { error: 'Invalid content type.' };
  try {
    const result = await api.post(`/admin/content/${kind}`, input);
    if (result.ok) {
      revalidatePath('/admin/content', 'layout');
      if (result.published) {
        if (kind === 'contact') updateTag('public-content-contact');
        revalidatePath('/', 'layout');
      }
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
