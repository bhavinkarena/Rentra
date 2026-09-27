import { PaymentList } from '@/components/admin/PaymentInvestigation';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Payments', robots: { index: false, follow: false } };

export default async function PaymentsPage({ searchParams }) {
  const { data, failure } = await settle(adminApi.paymentOrders(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Overview" />;
  return <PaymentList data={data} />;
}
