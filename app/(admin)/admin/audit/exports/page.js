import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { ExportDirectory } from '@/components/admin/AuditBrowser';
export const metadata = { title: 'My governed exports' };
export default async function Page({ params, searchParams }) {
  const { data, failure } = await settle(api.get('/admin/audit/exports', { cache: 'no-store' }));
  return failure ? <PortalState kind={failure} /> : <ExportDirectory data={data} />;
}
