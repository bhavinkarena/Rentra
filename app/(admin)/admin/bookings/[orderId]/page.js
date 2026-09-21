import { BookingDetail } from '@/components/customer/BookingRecords';
import { adminApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params }) {
  return <BookingDetail operational base="/admin/bookings" record={await adminApi.record((await params).orderId)}/>;
}
