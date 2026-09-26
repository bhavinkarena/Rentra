import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { safeReturnPath } from '@/lib/domain/portal-state';
import Breadcrumbs from '@/components/portal/Breadcrumbs';
import PortfolioCalendar from '@/components/partner/PortfolioCalendar';
import BookingCalendarSettings from '@/components/partner/listing/BookingCalendarSettings';

export const metadata = { title: 'Booking calendar', robots: { index: false, follow: false } };

export default async function CalendarPage({ params, searchParams }) {
  await requireActiveClient();
  const { id } = await params;
  const query = await searchParams;
  const listHref = safeReturnPath(
    query?.fromList || (query?.from?.startsWith('/') ? query.from : null),
    '/partner/listings',
  );
  const view = ['agenda', 'month'].includes(query?.view) ? query.view : 'week';
  const overviewHref = `/partner/listings/${id}/overview?from=${encodeURIComponent(listHref)}`;
  const { data: page, failure } = await settle(partnerApi.calendar(id));
  if (failure)
    return <PortalState kind={failure} backHref={overviewHref} backLabel="Back to property" />;
  const { listing, blocks } = page;
  const intervals = await settle(
    partnerApi.calendarIntervals(id, {
      from: query?.from?.startsWith('/') ? undefined : query?.from,
      days: view === 'month' ? 31 : 7,
      slot: query?.slot,
    }),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Breadcrumbs
        items={[
          { href: listHref, label: 'Properties' },
          { href: overviewHref, label: listing.title },
          { label: 'Booking calendar' },
        ]}
      />
      <header>
        <h1 className="text-h1">Booking calendar</h1>
        <p className="mt-2 text-ink-600">{listing.title}</p>
      </header>
      {intervals.failure ? (
        <PortalState
          kind={intervals.failure}
          backHref={overviewHref}
          backLabel="Back to property"
        />
      ) : (
        <PortfolioCalendar
          data={intervals.data}
          basePath={`/partner/listings/${id}/calendar`}
          view={view}
          listHref={listHref}
        />
      )}
      <BookingCalendarSettings listing={listing} blocks={blocks} />
    </div>
  );
}
