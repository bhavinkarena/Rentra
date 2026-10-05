import AdminBookingHistory from '@/components/admin/AdminBookingHistory';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { requireAdmin } from '@/lib/api/session';
import { z } from 'zod';
import RecordSheet from '@/components/partner/OwnerModal';
import AdminBookingDetail from '@/components/admin/AdminBookingDetail';
import { bookingSheetContext } from '@/lib/domain/admin-booking-navigation';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  const query = (await searchParams) ?? {};
  const admin = await requireAdmin();
  const booking = z.string().uuid().safeParse(query.booking);
  const [list, detail] = await Promise.all([
    settle(adminApi.records(query)),
    booking.success ? settle(adminApi.record(booking.data)) : null,
  ]);
  const { data, failure } = list;
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Overview" />;
  const context = bookingSheetContext(query, booking.data);
  return (
    <>
      <AdminBookingHistory data={data} />
      {detail ? (
        <RecordSheet
          title={detail.data?.reference || 'Booking details'}
          closeHref={context.closeHref}
          fullHref={detail.data ? context.fullHref : null}
        >
          {detail.failure ? (
            <PortalState kind={detail.failure} backHref={context.closeHref} backLabel="Bookings" />
          ) : (
            <AdminBookingDetail
              record={detail.data}
              tab={query.recordTab}
              params={query}
              listHref={context.closeHref}
              capabilities={admin.capabilities}
              sheet
            />
          )}
        </RecordSheet>
      ) : null}
    </>
  );
}
