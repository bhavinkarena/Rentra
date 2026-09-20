import { BookingDetail } from '@/components/customer/BookingRecords';
import { bookingRecordPage } from '@/lib/booking/record-page';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params }) {
  return <BookingDetail base="/bookings" record={await bookingRecordPage('customer', (await params).orderId)}/>;
}
