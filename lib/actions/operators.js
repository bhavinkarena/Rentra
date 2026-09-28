'use server';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';
export async function operatorCommand(id, input) {
  if (id && !/^[a-f0-9-]{36}$/i.test(id)) return { error: 'Invalid operator.' };
  try {
    const result = await api.post(`/admin/security${id ? `/${id}` : ''}`, input);
    revalidatePath('/admin/security', 'layout');
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
export async function enrollOperator(input) {
  try {
    return await api.post('/admin/auth/enrollment', input);
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
