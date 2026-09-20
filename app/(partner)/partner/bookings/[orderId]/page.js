import { BookingDetail } from '@/components/customer/BookingRecords';
import { bookingRecordPage } from '@/lib/booking/record-page';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params }) {
  return <BookingDetail operational base="/partner/bookings" record={await bookingRecordPage('owner', (await params).orderId)}/>;
}
