import AdminBookingHistory from '@/components/admin/AdminBookingHistory';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Booking records', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  const { data, failure } = await settle(adminApi.records(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Overview" />;
  return <AdminBookingHistory data={data} />;
}
