import PortalState from '@/components/portal/PortalState';
import { HotelAnalytics } from '@/components/admin/HotelAnalytics';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Hotel analytics', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const { from, to, cityId } = await searchParams;
  const { data, failure } = await settle(adminApi.hotelAnalytics({ from, to, cityId }));
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <HotelAnalytics data={data} cityId={cityId} />;
}
