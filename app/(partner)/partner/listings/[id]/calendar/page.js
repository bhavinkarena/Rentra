import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { safeReturnPath } from '@/lib/domain/portal-state';
import PropertyHub from '@/components/partner/property/PropertyHub';
import { loadPropertyHub } from '@/lib/partner/property-hub';
import PortfolioCalendar from '@/components/partner/PortfolioCalendar';
import ResourceDayTimeline from '@/components/partner/ResourceDayTimeline';
import { isLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import BookingCalendarSettings from '@/components/partner/listing/BookingCalendarSettings';

export const metadata = { title: 'Booking calendar', robots: { index: false, follow: false } };

export default async function CalendarPage({ params, searchParams }) {
  await requireActiveClient();
  const { id } = await params;
  const query = await searchParams;
  const property = await loadPropertyHub({ params, searchParams });
  const listHref = safeReturnPath(
    query?.fromList || (query?.from?.startsWith('/') ? query.from : null),
    '/partner/listings',
  );
  const view = ['agenda', 'month'].includes(query?.view) ? query.view : 'week';
  const overviewHref = `/partner/listings/${id}/overview?from=${encodeURIComponent(listHref)}`;
  const { data: page, failure } = await settle(partnerApi.calendar(id));
  if (failure)
    return <PortalState kind={failure} backHref={overviewHref} backLabel="Back to property" />;
  const { listing, blocks, resources = [] } = page;
  // Venues are booked by the hour: one day, court by court, instead of day/night slots.
  const venue = listing.rental_unit === 'hour';
  const date = isLocalDate(query?.date) ? query.date : propertyToday();
  const intervals = await settle(
    partnerApi.calendarIntervals(
      id,
      venue
        ? { from: date, days: 7 }
        : {
            from: query?.from?.startsWith('/') ? undefined : query?.from,
            days: view === 'month' ? 31 : 7,
            slot: query?.slot,
          },
    ),
  );
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      {property.hub ? (
        <PropertyHub {...property.hub} listHref={listHref} active="calendar" />
      ) : null}
      <h2 className="text-h3">Booking calendar</h2>
      {intervals.failure ? (
        <PortalState
          kind={intervals.failure}
          backHref={overviewHref}
          backLabel="Back to property"
        />
      ) : venue ? (
        <ResourceDayTimeline
          property={intervals.data.items[0]}
          config={listing.booking_config}
          date={date}
          basePath={`/partner/listings/${id}/calendar`}
        />
      ) : (
        <PortfolioCalendar
          data={intervals.data}
          basePath={`/partner/listings/${id}/calendar`}
          view={view}
          listHref={listHref}
        />
      )}
      <BookingCalendarSettings listing={listing} blocks={blocks} resources={resources} />
    </div>
  );
}
