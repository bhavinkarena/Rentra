import OwnerModal from '@/components/partner/OwnerModal';
import OwnerBookingDetail from '@/components/partner/OwnerBookingDetail';
import { z } from 'zod';
import PartnerBookingsScreen from '@/components/partner/PartnerBookingsScreen';
import { normalizeBookings } from '@/lib/partner/query-args';
import { partnerCacheEnabled } from '@/lib/partner/flags';
import OwnerBookings from '@/components/partner/OwnerBookings';
import { partnerApi } from '@/lib/api/endpoints';
import { requireActiveClient } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Booking work queues', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  const user = await requireActiveClient();
  const query = await searchParams;
  const args = normalizeBookings(query);
  const closeHref = `/partner/bookings?${new URLSearchParams(
    Object.entries(args)
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]),
  )}`;
  const booking = z.string().uuid().safeParse(query.booking);
  const detail = booking.success ? await settle(partnerApi.record(booking.data)) : null;
  const modal = detail ? (
    <OwnerModal
      title={detail.data?.title || 'Booking details'}
      closeHref={closeHref}
      fullHref={
        detail.data
          ? `/partner/bookings/${detail.data.id}?${new URLSearchParams({ from: closeHref })}`
          : null
      }
    >
      {detail.failure ? (
        <PortalState kind={detail.failure} backHref={closeHref} backLabel="Bookings" />
      ) : (
        <OwnerBookingDetail record={detail.data} listHref={closeHref} sheet />
      )}
    </OwnerModal>
  ) : null;
  if (partnerCacheEnabled() && user.cacheScope)
    return (
      <>
        <PartnerBookingsScreen scope={user.cacheScope} args={args} />
        {modal}
      </>
    );
  const { data, failure } = await settle(partnerApi.records(args));
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return (
    <>
      <OwnerBookings data={data} />
      {modal}
    </>
  );
}
