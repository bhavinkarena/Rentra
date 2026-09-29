import Link from '@/components/navigation/NavigationLink';
import { CalendarDays, ChevronRight, Scale } from 'lucide-react';
import { NewDispute } from '@/components/disputes/Disputes';
import { customerApi, disputesApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBadge } from '@/components/customer/BookingDisplay';
export const metadata = { title: 'Open dispute', robots: { index: false, follow: false } };

const day = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(value))
    : 'Dates in booking details';

export default async function Page({ searchParams }) {
  const order = (await searchParams)?.order;
  if (order) {
    const { data, failure } = await settle(disputesApi.context('customer', order));
    if (failure) return <PortalState kind={failure} />;
    return <NewDispute kind="customer" context={data} />;
  }
  // Guests pick one of their bookings instead of typing an order ID.
  const { data, failure } = await settle(customerApi.records({ tab: 'all', page: '1' }));
  if (failure) return <NewDispute kind="customer" />;
  // Unpaid orders (hold expired or still held) have nothing to dispute.
  const bookings = data.items.filter((item) => !['expired', 'held'].includes(item.state));
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: '/disputes', label: 'All disputes' }}
        title="Open a dispute"
        description="Choose the booking this is about."
      />
      {bookings.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {bookings.map((item) => (
            <li key={item.id}>
              <Link
                href={`/disputes/new?order=${item.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-ink-25"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <Scale className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{item.title}</span>
                    <StateBadge state={item.state} />
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-meta text-ink-600">
                    <CalendarDays className="size-4" aria-hidden="true" />
                    {day(item.firstVisit)}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-tiny text-ink-500">
                    {item.reference}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={Scale}
          title="No bookings to dispute"
          description="Disputes are opened from a booking. Your bookings will appear here."
        />
      )}
    </div>
  );
}
