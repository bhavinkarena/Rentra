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
        // Public documents and sitemap policy reads use no-store. Only the
        // optional contact widget is cached; expire its tag without refreshing
        // every layout in the application after a publication.
        if (kind === 'contact') updateTag('public-content-contact');
      }
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
