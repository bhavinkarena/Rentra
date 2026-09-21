import { BookingHistory } from '@/components/customer/BookingRecords';
import { adminApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  return <BookingHistory operational base="/admin/bookings" data={await adminApi.records(await searchParams)}/>;
}
