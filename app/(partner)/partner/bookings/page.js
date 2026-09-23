import { BookingHistory } from '@/components/customer/BookingRecords';
import { partnerApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  return (
    <BookingHistory
      operational
      base="/partner/bookings"
      data={await partnerApi.records(await searchParams)}
    />
  );
}
