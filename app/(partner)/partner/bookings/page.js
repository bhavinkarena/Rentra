import { BookingHistory } from '@/components/customer/BookingRecords';
import { partnerApi } from '@/lib/api/endpoints';
import { requireActiveClient } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Booking work queues', robots: { index: false, follow: false } };
export default async function BookingsPage({ searchParams }) {
  await requireActiveClient();
  const { data, failure } = await settle(partnerApi.records(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return <BookingHistory operational base="/partner/bookings" data={data} />;
}
