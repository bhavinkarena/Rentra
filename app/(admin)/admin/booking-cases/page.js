import { BookingCaseList, BookingCaseDetail } from '@/components/admin/BookingCases';
import PortalState from '@/components/portal/PortalState';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { requireAdmin } from '@/lib/api/session';
import { z } from 'zod';
import RecordSheet from '@/components/partner/OwnerModal';
import { adminCaseHref } from '@/lib/domain/admin-booking-navigation';

export const metadata = { title: 'Booking cases', robots: { index: false, follow: false } };

export default async function BookingCasesPage({ searchParams }) {
  const query = (await searchParams) ?? {};
  const admin = await requireAdmin();
  const selected = z.string().uuid().safeParse(query.case);
  const filters = Object.fromEntries(Object.entries(query).filter(([key]) => key !== 'case'));
  const [list, detail] = await Promise.all([
    settle(adminApi.cases(filters)),
    selected.success ? settle(adminApi.bookingCase(selected.data)) : null,
  ]);
  const { data, failure } = list;
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Overview" />;
  const closeHref = adminCaseHref(data);
  return (
    <>
      <BookingCaseList data={data} />
      {detail ? (
        <RecordSheet
          title={detail.data?.reference || 'Booking case'}
          closeHref={closeHref}
          fullHref={
            detail.data
              ? `/admin/booking-cases/${detail.data.id}?${new URLSearchParams({ from: closeHref })}`
              : null
          }
        >
          {detail.failure ? (
            <PortalState kind={detail.failure} backHref={closeHref} backLabel="Booking cases" />
          ) : (
            <BookingCaseDetail
              bookingCase={detail.data}
              listHref={closeHref}
              capabilities={admin.capabilities}
              sheet
            />
          )}
        </RecordSheet>
      ) : null}
    </>
  );
}
