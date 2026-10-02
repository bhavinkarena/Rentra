import { partnerApi } from '@/lib/api/endpoints';
import { updateHref } from '@/lib/domain/client-updates';
import { ApiError } from '@/lib/api/client';
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const update = await partnerApi.update(id);
    const form = new FormData();
    form.set('id', id);
    await partnerApi.readUpdates(form);
    return new Response(null, {
      status: 303,
      headers: {
        Location: new URL(updateHref(update), request.url).href,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401)
        return new Response(null, {
          status: 303,
          headers: {
            Location: new URL(
              `/partner/login?next=${encodeURIComponent(new URL(request.url).pathname)}`,
              request.url,
            ).href,
            'Cache-Control': 'private, no-store',
          },
        });
      return new Response(error.message, {
        status: error.status || 500,
        headers: { 'Cache-Control': 'private, no-store' },
      });
    }
    throw error;
  }
}
