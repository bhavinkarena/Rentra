import { proxyApiFile } from '@/lib/api/proxy';
export async function GET(request, { params }) {
  const { id, attachmentId } = await params;
  return proxyApiFile(`/customer/support/${id}/attachments/${attachmentId}`);
}
