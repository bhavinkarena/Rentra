'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';
export async function catalogueCommand(type, id, input) {
  const validId =
    type === 'verticals' ? /^[a-z][a-z0-9_]{0,23}$/.test(id) : /^(new|[0-9a-f-]{36})$/.test(id);
  if (!['cities', 'areas', 'categories', 'amenities', 'verticals'].includes(type) || !validId)
    return { error: 'Invalid catalogue record.' };
  try {
    const result = await api.post(`/admin/catalogues/${type}/${id}`, input);
    if (result.ok) {
      updateTag('discovery-registry');
      revalidatePath('/', 'layout');
    }
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
