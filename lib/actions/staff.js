'use server';

import { redirect } from 'next/navigation';
import { staffApi } from '@/lib/api/endpoints';
import { runApiAction } from '@/lib/api/action';

/**
 * Caretaker actions (CP16). The API sets and clears the separate caretaker
 * cookie; runApiAction relays it to the browser.
 */

export async function sendJoinCode(_previous, formData) {
  const result = await runApiAction(() => staffApi.joinCode(formData));
  return result?.error ? result : { ...result, step: 'code' };
}

export async function acceptInvitation(_previous, formData) {
  const result = await runApiAction(() => staffApi.join(formData));
  if (result?.error) return { ...result, step: 'code' };
  redirect('/staff');
}

export async function sendLoginCode(_previous, formData) {
  const result = await runApiAction(() => staffApi.loginCode(formData));
  return result?.error
    ? result
    : { ...result, step: 'code', phone: String(formData.get('phone') ?? '') };
}

export async function signInCaretaker(_previous, formData) {
  const result = await runApiAction(() => staffApi.login(formData));
  if (result?.error) return { ...result, step: 'code', phone: String(formData.get('phone') ?? '') };
  redirect('/staff');
}

export async function signOutCaretaker() {
  await runApiAction(() => staffApi.logout());
  redirect('/staff/login');
}

export async function recordStaffVisit(_previous, formData) {
  return runApiAction(() => staffApi.recordVisit(formData));
}
