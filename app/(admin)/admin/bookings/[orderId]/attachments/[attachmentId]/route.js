import { proxyApiFile } from '@/lib/api/proxy';

/**
 * One private visit evidence photo (CP13).
 *
 * Same-origin so the session cookie travels with the link. The API decides
 * whether this actor may see the photo, answers 404 for foreign or guessed
 * ids and writes the audit row for every successful view.
 */
export async function GET(request, { params }) {
  const { orderId, attachmentId } = await params;
  return proxyApiFile(`/admin/records/${orderId}/attachments/${attachmentId}`);
}
