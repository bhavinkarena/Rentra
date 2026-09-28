import { proxyApiFile } from '@/lib/api/proxy';
export async function GET(_request, { params }) {
  const { id } = await params;
  return proxyApiFile(`/admin/privacy/requests/${encodeURIComponent(id)}/export`);
}
