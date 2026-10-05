import { BookingCaseDetail } from '@/components/admin/BookingCases';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { requireAdmin } from '@/lib/api/session';
import { safeReturnPath } from '@/lib/domain/portal-state';

export const metadata = { title: 'Booking case', robots: { index: false, follow: false } };

export default async function BookingCasePage({ params, searchParams }) {
  const admin = await requireAdmin();
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/admin/booking-cases');
  const { data, failure } = await settle(adminApi.bookingCase((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Booking cases" />;
  return (
    <BookingCaseDetail bookingCase={data} listHref={listHref} capabilities={admin.capabilities} />
  );
}
