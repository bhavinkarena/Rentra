'use server';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/admin';
import { sql } from '@/lib/db';
import { reviewPrivacyRequest } from '@/lib/customer/privacy-admin';
export async function startPrivacyReview(form) {
  const admin=await requireAdmin();
  await reviewPrivacyRequest(sql,admin.id,form.get('requestId'));
  revalidatePath('/admin/privacy');
  revalidatePath('/account/privacy');
}
