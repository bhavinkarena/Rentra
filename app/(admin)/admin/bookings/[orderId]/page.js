import AdminBookingDetail from '@/components/admin/AdminBookingDetail';
import { adminApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params }) {
  return <AdminBookingDetail record={await adminApi.record((await params).orderId)}/>;
}
