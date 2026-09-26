import { proxyApiFile } from '@/lib/api/proxy';

/** One private evidence photo for an assigned visit; the API checks the assignment and audits the read. */
export async function GET(request, { params }) {
  const { orderId, attachmentId } = await params;
  return proxyApiFile(`/staff/visits/${orderId}/attachments/${attachmentId}`);
}
