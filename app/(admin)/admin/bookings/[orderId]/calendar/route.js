import { proxyApiFile } from '@/lib/api/proxy';

/**
 * The booking calendar file, downloaded.
 *
 * Same-origin so the session cookie travels with the click; the API decides
 * whether this actor may read the booking at all.
 */
export async function GET(request, { params }) {
  const { orderId } = await params;
  return proxyApiFile(`/admin/records/${orderId}/summary?calendar=1`);
}
