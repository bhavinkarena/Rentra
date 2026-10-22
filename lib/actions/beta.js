'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { customerApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';

/**
 * Closed beta (hotel plan, Phase 9): turn the signed-in guest's invite into the
 * beta pass cookie. Not httpOnly on purpose: the browser sends it as a header
 * on room and price calls. It is only an access grant, signed and expiring.
 */
export async function claimBetaAccess() {
  let pass;
  try {
    pass = await customerApi.betaAccess();
  } catch (error) {
    if (error instanceof ApiError)
      return {
        error:
          error.code === 'NOT_INVITED' ? 'This number is not on the beta list yet.' : error.message,
      };
    throw error;
  }
  (await cookies()).set('rentra_beta', pass.token, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(pass.expiresAt),
  });
  redirect('/hotels');
}
