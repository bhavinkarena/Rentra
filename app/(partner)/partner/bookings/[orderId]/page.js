import { BookingDetail } from '@/components/customer/BookingRecords';
import { partnerApi } from '@/lib/api/endpoints';
import { requireActiveClient } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Booking record', robots: { index: false, follow: false } };
export default async function BookingPage({ params, searchParams }) {
  await requireActiveClient();
  const listHref = safeReturnPath((await searchParams)?.from, '/partner/bookings');
  const { data, failure } = await settle(partnerApi.record((await params).orderId));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Bookings" />;
  return <BookingDetail operational base="/partner/bookings" record={data} listHref={listHref} />;
}
