import { cookies } from 'next/headers';
import { API_URL } from '@/lib/api/config';
import { authApi } from '@/lib/api/endpoints';

// Deliberately read-only and narrowly allowlisted. No arbitrary URL or writes.
const paths = new Set(['partner/listings', 'partner/listings/summary', 'partner/records']);
export async function GET(request, { params }) {
  const path = (await params).path.join('/');
  const headers = { 'Cache-Control': 'private, no-store' };
  if (!paths.has(path)) return Response.json({ success: false }, { status: 404, headers });
  try {
    const { user } = await authApi.identity({
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
    });
    if (
      user?.role !== 'client' ||
      user.accountStatus !== 'active' ||
      !user.cacheScope ||
      user.cacheScope !== request.headers.get('X-Portal-Scope')
    ) {
      return Response.json({ success: false, code: 'IDENTITY_CHANGED' }, { status: 401, headers });
    }
    const response = await fetch(`${API_URL}/${path}${new URL(request.url).search}`, {
      headers: { Cookie: (await cookies()).toString() },
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12000)]),
    });
    return new Response(await response.text(), {
      status: response.status,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Request-Id': response.headers.get('X-Request-Id') ?? '',
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, code: error.status === 401 ? 'SESSION_ENDED' : 'UPSTREAM_UNAVAILABLE' },
      { status: error.status === 401 ? 401 : 503, headers },
    );
  }
}
