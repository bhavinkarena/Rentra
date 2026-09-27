'use client';
import { usePortalScope } from '@/lib/partner/use-portal-scope';
import { useGetOwnerBookingsQuery } from '@/lib/services/partner.service';
import { BookingHistory } from '@/components/customer/BookingHistory';
import PartnerQueryState from './PartnerQueryState';
export default function PartnerBookingsScreen({ args, scope }) {
  const matches = usePortalScope(scope);
  const bookings = useGetOwnerBookingsQuery(args, {
    skip: !matches,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    refetchOnMountOrArgChange: 15,
  });
  if (!matches) return <p role="status">Checking your session…</p>;
  return (
    <PartnerQueryState queries={[bookings]}>
      {bookings.currentData?.data && (
        <BookingHistory operational base="/partner/bookings" data={bookings.currentData.data} />
      )}
    </PartnerQueryState>
  );
}
