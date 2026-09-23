import { BookingHistory } from '@/components/customer/BookingRecords';
import { customerApi } from '@/lib/api/endpoints';
import MeasuredView from '@/components/customer/MeasuredView';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  return (
    <>
      <MeasuredView event="history_viewed" />
      <BookingHistory base="/bookings" data={await customerApi.records(await searchParams)} />
    </>
  );
}
