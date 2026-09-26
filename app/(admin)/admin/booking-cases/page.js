import { BookingCaseList } from '@/components/admin/BookingCases';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Booking cases', robots: { index: false, follow: false } };

export default async function BookingCasesPage({ searchParams }) {
  const { data, failure } = await settle(adminApi.cases(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Overview" />;
  return <BookingCaseList data={data} />;
}
