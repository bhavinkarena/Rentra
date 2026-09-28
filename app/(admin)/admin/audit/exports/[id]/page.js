import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { ExportDetail } from '@/components/admin/AuditBrowser';
export const metadata = { title: 'Governed export' };
export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { data, failure } = await settle(
    api.get(`/admin/audit/exports/${id}`, { cache: 'no-store' }),
  );
  return failure ? <PortalState kind={failure} /> : <ExportDetail data={data} />;
}
