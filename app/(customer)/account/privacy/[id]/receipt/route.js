import { proxyApiFile } from '@/lib/api/proxy';
export async function GET(_request, { params }) {
  const { id } = await params;
  return proxyApiFile(`/customer/account/privacy/${encodeURIComponent(id)}/receipt`);
}
