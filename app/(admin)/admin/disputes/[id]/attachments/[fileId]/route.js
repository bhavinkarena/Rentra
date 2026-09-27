import { proxyApiFile } from '@/lib/api/proxy';
export async function GET(_request, { params }) {
  const { id, fileId } = await params;
  return proxyApiFile(`/admin/payments/disputes/${id}/attachments/${fileId}`);
}
