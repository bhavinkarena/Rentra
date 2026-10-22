import Link from '@/components/navigation/NavigationLink';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { staffApi } from '@/lib/api/endpoints';
import { staffSession } from '@/lib/api/session';
import { settle } from '@/lib/api/page-state';
import { isLocalDate } from '@/lib/domain/booking-dates';
import PortalState from '@/components/portal/PortalState';
import HotelRatesCalendar from '@/components/partner/HotelRatesCalendar';

export const metadata = { title: 'Rates & rooms' };

/** Hotel staff (hotel plan, Phase 5): the hotel's rates and rooms; the API checks the role on every request. */
export default async function StaffHotelRooms({ params, searchParams }) {
  const { staff, failure: sessionFailure } = await staffSession();
  if (sessionFailure) return <PortalState kind={sessionFailure} />;
  const { id } = await params;
  const property = staff.properties.find((p) => p.id === id && p.hotel);
  if (!property || !staff.permissions.hotelRole) notFound();
  const query = (await searchParams) ?? {};
  const { data, failure } = await settle(
    staffApi.hotelRooms(id, { from: isLocalDate(query.from) ? query.from : undefined, days: 14 }),
  );
  return (
    <div className="space-y-5">
      <Link
        href="/staff"
        className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-ink-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Visits
      </Link>
      <div>
        <h1 className="text-h2 font-bold text-ink-900">Rates &amp; rooms</h1>
        <p className="text-meta text-ink-600">
          {property.title} ·{' '}
          {staff.permissions.hotelRole === 'manager'
            ? 'You can change rates and rooms.'
            : 'You can open and close rooms.'}
        </p>
      </div>
      {failure ? (
        <PortalState kind={failure} />
      ) : (
        <HotelRatesCalendar propertyId={id} data={data} baseHref={`/staff/hotels/${id}?`} staff />
      )}
    </div>
  );
}
