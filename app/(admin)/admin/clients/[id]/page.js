import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { adminRecordReturnHref } from '@/lib/domain/admin-search';
import PortalState from '@/components/portal/PortalState';
import { AdminClientDetail } from '@/components/admin/AdminClients';
import { requireAdmin } from '@/lib/api/session';

export const metadata = { title: 'Owner', robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }) {
  const admin = await requireAdmin();
  const query = (await searchParams) ?? {};
  const listHref = adminRecordReturnHref(query.from, '/admin/clients');
  const { data, failure } = await settle(adminApi.client((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Owners" />;
  return (
    <AdminClientDetail
      data={data}
      listHref={listHref}
      tab={query.tab}
      params={query}
      capabilities={admin.capabilities}
    />
  );
}
