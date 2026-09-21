import AdminBookingHistory from '@/components/admin/AdminBookingHistory';
import { adminApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  return <AdminBookingHistory data={await adminApi.records(await searchParams)} />;
}
