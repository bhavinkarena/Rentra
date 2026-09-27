import { proxyApiFile } from '@/lib/api/proxy';
export async function GET(request, { params }) {
  const query = new URL(request.url).searchParams;
  query.set('period', (await params).id);
  return proxyApiFile(`/admin/payments/finance/statement.csv?${query}`);
}
