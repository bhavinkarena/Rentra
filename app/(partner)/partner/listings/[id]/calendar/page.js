import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import BookingCalendarSettings from '@/components/partner/listing/BookingCalendarSettings';

export const metadata = { title: 'Booking calendar', robots: { index: false, follow: false } };

export default async function CalendarPage({ params }) {
  await requireActiveClient();
  const { id } = await params;
  const page = await partnerApi.calendar(id).catch(() => null);
  if (!page) notFound();
  const { listing, blocks } = page;
  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
    <Link href={`/partner/listings/${id}`} className="text-brand-700 hover:underline">Back to property</Link>
    <header><h1 className="text-h1">Booking calendar</h1><p className="mt-2 text-ink-600">{listing.title}</p></header>
    <BookingCalendarSettings key={listing.booking_config_version} listing={listing} blocks={blocks} />
  </div>;
}
