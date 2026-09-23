import { BookingDetail } from '@/components/customer/BookingRecords';
import { customerApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params }) {
  return (
    <BookingDetail base="/bookings" record={await customerApi.record((await params).orderId)} />
  );
}
