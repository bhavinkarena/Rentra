import { RefundList } from '@/components/admin/RefundOperations';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Refunds', robots: { index: false, follow: false } };

export default async function RefundsPage({ searchParams }) {
  const { data, failure } = await settle(adminApi.refunds(await searchParams));
  if (failure)
    return <PortalState kind={failure} backHref="/admin/finance/payments" backLabel="Payments" />;
  return <RefundList data={data} />;
}
