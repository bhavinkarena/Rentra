'use server';
import { api, ApiError } from '@/lib/api/client';
import { revalidatePath } from 'next/cache';
export async function createAuditExport(input) {
  try {
    const result = await api.post('/admin/audit/exports', input);
    revalidatePath('/admin/audit', 'layout');
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
export async function retryAuditExport(id, input) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { error: 'Invalid export.' };
  try {
    const result = await api.post(`/admin/audit/exports/${id}/retry`, input);
    revalidatePath('/admin/audit', 'layout');
    return result;
  } catch (error) {
    if (error instanceof ApiError) return { error: error.message, code: error.code };
    throw error;
  }
}
