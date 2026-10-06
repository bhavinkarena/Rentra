import { adminRecordReturnHref } from '@/lib/domain/admin-search';
import { requireAdmin } from '@/lib/api/session';
import { RefundDetail } from '@/components/admin/RefundOperations';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Refund detail', robots: { index: false, follow: false } };

export default async function RefundPage({ params, searchParams }) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const listHref = adminRecordReturnHref(query.from, '/admin/finance/refunds');
  const { data, failure } = await settle(adminApi.refund((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Refunds" />;
  return (
    <RefundDetail
      refund={data}
      capabilities={admin.capabilities}
      tab={query.tab}
      params={query}
      listHref={listHref}
    />
  );
}
