import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AuditDirectory } from '@/components/admin/AuditBrowser';
export const metadata = { title: 'Audit history' };
export default async function Page({ params, searchParams }) {
  const { data, failure } = await settle(
    api.get('/admin/audit/events?' + new URLSearchParams(await searchParams), {
      cache: 'no-store',
    }),
  );
  return failure ? <PortalState kind={failure} /> : <AuditDirectory data={data} />;
}
