import PortalState from '@/components/portal/PortalState';
import { TaxSlabs } from '@/components/admin/HotelFinance';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Hotel tax', robots: { index: false, follow: false } };

export default async function Page() {
  const { data, failure } = await settle(adminApi.hotelTaxSlabs());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <TaxSlabs data={data} />;
}
