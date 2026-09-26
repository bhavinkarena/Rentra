import AdminBookingDetail from '@/components/admin/AdminBookingDetail';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';

export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };

export default async function BookingPage({ params, searchParams }) {
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/admin/bookings');
  const { data, failure } = await settle(adminApi.record((await params).orderId));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Bookings" />;
  return <AdminBookingDetail record={data} tab={query.tab} params={query} listHref={listHref} />;
}
