import { BookingHistory } from '@/components/customer/BookingRecords';
import { bookingHistoryPage } from '@/lib/booking/record-page';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  return <BookingHistory operational base="/partner/bookings" data={await bookingHistoryPage('owner', await searchParams)}/>;
}
