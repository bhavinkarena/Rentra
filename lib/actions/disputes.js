'use server';
import { revalidatePath } from 'next/cache';
import { api, ApiError } from '@/lib/api/client';
const root = (kind) =>
  kind === 'admin'
    ? '/admin/payments/disputes'
    : kind === 'owner'
      ? '/partner/disputes'
      : '/customer/disputes';
export async function disputeCommand(kind, command, form) {
  const values = Object.fromEntries(form),
    id = String(values.id || '');
  delete values.id;
  let path = root(kind),
    body = values;
  if (command === 'reply') {
    path += `/${id}/reply`;
    body = form;
  } else if (command !== 'create') {
    path += `/${id}/manage`;
    values.command = command;
    values.preview = values.preview === 'true';
    if (values.assigneeId === '') values.assigneeId = null;
  }
  try {
    const result = await api.post(path, body);
    if (!result.preview) revalidatePath('/', 'layout');
    return result;
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message, code: e.code };
    throw e;
  }
}
