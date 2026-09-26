import { BookingCaseDetail } from '@/components/admin/BookingCases';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Booking case', robots: { index: false, follow: false } };

export default async function BookingCasePage({ params }) {
  const { data, failure } = await settle(adminApi.bookingCase((await params).id));
  if (failure)
    return <PortalState kind={failure} backHref="/admin/booking-cases" backLabel="Booking cases" />;
  return <BookingCaseDetail bookingCase={data} />;
}
