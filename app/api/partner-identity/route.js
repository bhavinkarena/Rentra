import { cookies } from 'next/headers';
import { authApi } from '@/lib/api/endpoints';

export async function GET(request) {
  let user;
  try {
    ({ user } = await authApi.identity({
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
    }));
  } catch (error) {
    return Response.json(
      { scope: null },
      {
        status: error.status === 401 ? 401 : 503,
        headers: { 'Cache-Control': 'private, no-store' },
      },
    );
  }
  const allowed = user?.role === 'client' && user.accountStatus === 'active' && user.cacheScope;
  return Response.json(
    {
      scope: allowed ? user.cacheScope : null,
      revision: (await cookies()).get('rentra_partner_revision')?.value ?? '',
    },
    {
      status: allowed ? 200 : 401,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}
