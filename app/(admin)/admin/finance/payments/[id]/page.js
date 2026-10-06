import { adminRecordReturnHref } from '@/lib/domain/admin-search';
import { requireAdmin } from '@/lib/api/session';
import { PaymentDetail } from '@/components/admin/PaymentInvestigation';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Payment detail', robots: { index: false, follow: false } };

export default async function PaymentPage({ params, searchParams }) {
  const admin = await requireAdmin();
  const query = await searchParams;
  const listHref = adminRecordReturnHref(query.from, '/admin/finance/payments');
  const { data, failure } = await settle(adminApi.paymentOrder((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Payments" />;
  return (
    <PaymentDetail
      payment={data}
      capabilities={admin.capabilities}
      tab={query.tab}
      params={query}
      listHref={listHref}
    />
  );
}
