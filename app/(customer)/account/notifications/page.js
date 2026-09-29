import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight, Bell, BellRing } from 'lucide-react';
import { customerApi } from '@/lib/api/endpoints';
import { readNotification } from '@/lib/actions/customer';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';

export const metadata = { title: 'Booking updates', robots: { index: false, follow: false } };

const when = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});

export default async function NotificationsPage() {
  const updates = await customerApi.notifications();
  return (
    <section className="mx-auto max-w-3xl">
      <PageHeader
        back={{ href: '/account', label: 'Account' }}
        title="Booking updates"
        description="Your latest 50 booking updates stay here even if SMS delivery is unavailable."
      />
      {updates.length ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {updates.map((n) => (
            <li
              key={n.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-3 p-4 sm:flex-nowrap"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-full ${n.read ? 'bg-ink-50 text-ink-500' : 'bg-brand-50 text-brand-700'}`}
              >
                {n.read ? (
                  <Bell className="size-5" aria-hidden="true" />
                ) : (
                  <BellRing className="size-5" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2
                  className={`flex flex-wrap items-center gap-2 ${n.read ? 'font-medium' : 'font-bold'}`}
                >
                  {n.title}
                  {n.simulation ? (
                    <span className="rounded-full bg-info-bg px-2 py-0.5 text-tiny font-semibold text-info">
                      Test / simulation
                    </span>
                  ) : null}
                  {!n.read ? <span className="sr-only">(unread)</span> : null}
                </h2>
                <p className="mt-1 text-meta text-ink-600">
                  {n.at ? <time dateTime={n.at}>{when.format(new Date(n.at))}</time> : null}
                  {n.at ? ' · ' : ''}
                  SMS:{' '}
                  {n.delivery === 'accepted'
                    ? 'accepted by provider; delivery not confirmed'
                    : n.delivery}
                </p>
                <p className="mt-0.5 truncate font-mono text-tiny text-ink-500" title={n.reference}>
                  {n.reference}
                </p>
              </div>
              <div className="flex w-full items-center gap-2 pl-14 sm:w-auto sm:pl-0">
                <Link
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'sm' }),
                    'h-9 rounded-full px-3',
                  )}
                  href={`/bookings/${n.orderId}`}
                >
                  Open booking
                  <ArrowUpRight aria-hidden="true" />
                </Link>
                {!n.read ? (
                  <form action={readNotification}>
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      className={cn(
                        buttonVariants({ variant: 'ghost', size: 'sm' }),
                        'h-9 rounded-full px-3',
                      )}
                    >
                      Mark as read
                    </button>
                  </form>
                ) : (
                  <span className="px-2 text-tiny text-ink-500">Read</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState icon={Bell} title="No booking updates yet">
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'rounded-full px-5')}
            href="/bookings"
          >
            View bookings
          </Link>
        </EmptyState>
      )}
    </section>
  );
}
