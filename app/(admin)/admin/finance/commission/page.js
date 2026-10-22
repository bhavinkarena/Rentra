import PortalState from '@/components/portal/PortalState';
import { CommissionRules } from '@/components/admin/HotelFinance';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Hotel commission', robots: { index: false, follow: false } };

export default async function Page() {
  const { data, failure } = await settle(adminApi.hotelCommission());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <CommissionRules data={data} />;
}
