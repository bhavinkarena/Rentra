import { BookingDetail } from '@/components/customer/BookingRecords';
import { partnerApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params }) {
  return <BookingDetail operational base="/partner/bookings" record={await partnerApi.record((await params).orderId)}/>;
}
