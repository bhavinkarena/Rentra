import PartnerBookingsScreen from '@/components/partner/PartnerBookingsScreen';
import { normalizeBookings } from '@/lib/partner/query-args';
import { partnerCacheEnabled } from '@/lib/partner/flags';
import { BookingHistory } from '@/components/customer/BookingHistory';
import { partnerApi } from '@/lib/api/endpoints';
import { requireActiveClient } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Booking work queues', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  const user = await requireActiveClient();
  const args = normalizeBookings(await searchParams);
  if (partnerCacheEnabled() && user.cacheScope)
    return <PartnerBookingsScreen scope={user.cacheScope} args={args} />;
  const { data, failure } = await settle(partnerApi.records(args));
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return <BookingHistory operational base="/partner/bookings" data={data} />;
}
