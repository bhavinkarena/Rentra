import { partnerApi } from '@/lib/api/endpoints';
import { requireActiveClient } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import BookingCalendarSettings from '@/components/partner/listing/BookingCalendarSettings';
import { CalendarFeed } from '@/components/partner/CalendarTools';
import Link from '@/components/navigation/NavigationLink';
export const metadata = { title: 'Booking rules', robots: { index: false, follow: false } };
export default async function BookingRules({ params }) {
  await requireActiveClient();
  const { id } = await params;
  const { data, failure } = await settle(partnerApi.calendar(id));
  if (failure)
    return <PortalState kind={failure} backHref="/partner/calendar" backLabel="Calendar" />;
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      <Link className="inline-flex min-h-11 underline" href={`/partner/listings/${id}/calendar`}>
        Back to calendar
      </Link>
      <h1 className="text-h1">Booking rules · {data.listing.title}</h1>
      <BookingCalendarSettings
        listing={data.listing}
        blocks={data.blocks}
        resources={data.resources}
      />
      <CalendarFeed listingId={id} />
    </div>
  );
}
