import { PaymentDetail } from '@/components/admin/PaymentInvestigation';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Payment detail', robots: { index: false, follow: false } };

export default async function PaymentPage({ params }) {
  const { data, failure } = await settle(adminApi.paymentOrder((await params).id));
  if (failure)
    return <PortalState kind={failure} backHref="/admin/finance/payments" backLabel="Payments" />;
  return <PaymentDetail payment={data} />;
}
