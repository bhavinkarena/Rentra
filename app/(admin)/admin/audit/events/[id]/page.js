import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AuditDetail } from '@/components/admin/AuditBrowser';
export const metadata = { title: 'Audit event' };
export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const { data, failure } = await settle(
    api.get(`/admin/audit/events/${id}`, { cache: 'no-store' }),
  );
  return failure ? <PortalState kind={failure} /> : <AuditDetail data={data} />;
}
