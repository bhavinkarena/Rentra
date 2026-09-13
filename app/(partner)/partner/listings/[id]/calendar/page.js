import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireActiveClient } from '@/lib/auth/dal';
import { sql } from '@/lib/db';
import BookingCalendarSettings from '@/components/partner/listing/BookingCalendarSettings';

export const metadata = { title: 'Booking calendar', robots: { index: false, follow: false } };

export default async function CalendarPage({ params }) {
  const owner = await requireActiveClient();
  const { id } = await params;
  const [listing] = await sql`SELECT id,title,capacity,extra_guest_charge,booking_config,booking_config_version FROM rentable WHERE id=${id} AND client_id=${owner.id}`;
  if (!listing) notFound();
  const rows = await sql`SELECT id,blocked_start_at,blocked_end_at,reason FROM inventory_reservation WHERE rentable_id=${id} AND source='owner_block' AND state='committed' ORDER BY blocked_start_at`;
  const format = (time) => new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(time));
  const blocks = rows.map((row) => ({ id: row.id, reason: row.reason, label: `${format(row.blocked_start_at)} – ${format(row.blocked_end_at)}` }));
  return <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
    <Link href={`/partner/listings/${id}`} className="text-brand-700 hover:underline">Back to property</Link>
    <header><h1 className="text-h1">Booking calendar</h1><p className="mt-2 text-ink-600">{listing.title}</p></header>
    <BookingCalendarSettings key={listing.booking_config_version} listing={listing} blocks={blocks} />
  </div>;
}
