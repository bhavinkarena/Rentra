import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight, ChevronRight, CalendarDays } from 'lucide-react';
import { displayMoney } from '@/lib/domain/display-money';
import Pagination from '@/components/ui/pagination';
import { Field, Select, fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
import { AdminPage, AdminPageHeader, AdminEmpty, StatusBadge } from './AdminPrimitives';
import {
  adminBookingHref as queryHref,
  bookingSheetContext,
} from '@/lib/domain/admin-booking-navigation';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { adminDateTime } from '@/lib/domain/admin-display';

const TABS = [
  { value: 'all', label: 'All bookings', count: 'total' },
  { value: 'today', label: 'Today' },
  { value: 'action_needed', label: 'Action needed' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];
const KINDS = { farmhouse: 'Farmhouses', entertainment: 'Venues' };
const humanise = (value) => String(value || 'unknown').replaceAll('_', ' ');

export default function AdminBookingHistory({ data }) {
  const showCounts =
    !data.environment && !data.createdFrom && !data.createdTo && !data.rentOnly && !data.unit;
  return (
    <AdminPage>
      <AdminPageHeader
        title="Booking records"
        description="Find a booking, follow its visits, and inspect the evidence."
        action={
          <Link href="/admin/booking-cases" className={buttonVariants({ variant: 'ghost' })}>
            Booking cases <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      {data.environment ? (
        <div className="mt-6 border-y border-border py-4 text-meta leading-6 text-ink-700">
          <p>
            <strong className="capitalize">{data.environment} dashboard scope.</strong>{' '}
            {data.unit === 'visits'
              ? 'Visits arriving or departing today (IST), counted once per visit.'
              : `Orders created ${data.createdFrom || 'any date'} to ${data.createdTo || 'any date'} (IST).`}
            {data.rentOnly
              ? ' Non-cancelled visit rent only; excludes unpaid holds, fees and deposits.'
              : ''}
          </p>
          <Link
            href="/admin/bookings"
            className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-4"
          >
            Clear dashboard scope
          </Link>
        </div>
      ) : null}
      <section className="mt-6" aria-labelledby="booking-list-title">
        <nav aria-label="Booking filters" className="flex flex-wrap gap-x-5 border-b border-border">
          {TABS.map((tab) => (
            <Link
              key={tab.value}
              href={queryHref(data, { tab: tab.value, page: '1' })}
              aria-current={data.tab === tab.value ? 'page' : undefined}
              className="inline-flex min-h-12 items-center gap-2 border-b-2 border-transparent px-1 text-meta font-semibold text-ink-600 aria-[current=page]:border-brand-700 aria-[current=page]:text-brand-800 hover:text-ink-900"
            >
              {tab.label}
              {showCounts && data.summary?.[tab.count || tab.value] != null ? (
                <span className="font-normal tabular">{data.summary[tab.count || tab.value]}</span>
              ) : null}
            </Link>
          ))}
        </nav>
        <Form
          action="/admin/bookings"
          role="search"
          aria-label="Booking filters"
          className="my-5 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="tab" value={data.tab} />
          {[
            'property',
            'resource',
            'from',
            'to',
            'event',
            'createdFrom',
            'createdTo',
            'environment',
            'rentOnly',
            'unit',
          ]
            .filter((key) => data[key])
            .map((key) => (
              <input key={key} type="hidden" name={key} value={data[key]} />
            ))}
          <div className="w-full min-w-0 sm:w-auto sm:max-w-96 sm:flex-1">
            <Field id="booking-search" label="Property or booking reference">
              <input
                id="booking-search"
                className={fieldClass}
                name="q"
                maxLength={100}
                defaultValue={data.q}
                placeholder="Search booking records"
              />
            </Field>
          </div>
          {(data.verticals ?? []).length > 1 ? (
            <Field id="booking-kind" label="Kind of place">
              <Select id="booking-kind" name="vertical" defaultValue={data.vertical || ''}>
                <option value="">All kinds</option>
                {data.verticals.map((code) => (
                  <option key={code} value={code}>
                    {KINDS[code] || code}
                  </option>
                ))}
              </Select>
            </Field>
          ) : data.vertical ? (
            <input type="hidden" name="vertical" value={data.vertical} />
          ) : null}
          <button className={buttonVariants({ variant: 'outline' })}>Apply filters</button>
          {data.q || data.vertical ? (
            <Link
              href={queryHref(data, { q: '', vertical: '', page: '1' })}
              className={buttonVariants({ variant: 'ghost' })}
            >
              Clear filters
            </Link>
          ) : null}
        </Form>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="booking-list-title" className="text-h3 font-semibold">
            {TABS.find((tab) => tab.value === data.tab)?.label || 'Booking records'}
          </h2>
          <p className="text-meta text-ink-600">
            {data.total} matching {data.unit === 'visits' ? 'visits' : 'bookings'}
          </p>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {data.items.length ? (
            <ul className="divide-y divide-border">
              {data.items.map((item) => (
                <li key={item.visitId ?? item.id}>
                  <Link
                    href={bookingSheetContext(data, item.id).fullHref}
                    aria-label={`Open booking ${item.reference}`}
                    className="grid gap-4 px-5 py-5 transition-colors hover:bg-ink-25 sm:px-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.8fr)_auto] xl:items-start"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-base font-semibold">{item.title}</p>
                      <p className="mt-1 break-all text-meta text-ink-600">{item.reference}</p>
                      <p className="mt-2 break-words text-meta text-ink-600">
                        Owner: {item.owner?.name || 'Not recorded'}
                      </p>
                      <p className="mt-1 text-meta text-ink-600">
                        {item.guestWithheld
                          ? 'Guest hidden / no active fulfillment'
                          : `Guest: ${item.guestName || 'Not recorded'}`}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-meta font-semibold">
                        {item.firstVisitLabel ||
                          (item.firstVisit
                            ? formatLocalDate(item.firstVisit)
                            : 'Visit date not recorded')}
                      </p>
                      {item.lastVisit && item.lastVisit !== item.firstVisit ? (
                        <p className="mt-1 text-meta text-ink-600">
                          Last visit {formatLocalDate(item.lastVisit)}
                        </p>
                      ) : null}
                      <p className="mt-2 text-meta text-ink-600">
                        {item.visitCount} visit{item.visitCount === 1 ? '' : 's'} /{' '}
                        {item.visitStates.map(humanise).join(', ') || 'No visits recorded'}
                      </p>
                      <p className="mt-1 text-meta text-ink-600">
                        Booked {adminDateTime(item.createdAt)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <StatusBadge domain="booking" state={item.state} />
                      <p className="mt-3 text-base font-semibold tabular">
                        {displayMoney(item.rentMinor)}
                      </p>
                      <p className="mt-1 text-meta text-ink-600">
                        {data.rentOnly
                          ? 'Non-cancelled rent / excludes fees and deposits'
                          : 'Booked rent / not collected cash'}
                      </p>
                      <p className="mt-2 break-words text-meta text-ink-600">
                        {item.payments.length
                          ? item.payments
                              .map((p) => `${humanise(p.environment)}: ${humanise(p.state)}`)
                              .join('; ')
                          : 'No payment evidence'}
                      </p>
                      {item.payments.some((p) => p.environment === 'test') ? (
                        <p className="mt-1 text-meta font-semibold text-warning">Test gateway</p>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-meta font-semibold text-brand-700">
                      Open <ChevronRight className="size-4" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <AdminEmpty
              icon={CalendarDays}
              title="No bookings in this view"
              description="Choose another status, kind of place, or clear your search."
            />
          )}
          <Pagination
            page={data.page}
            pageSize={data.pageSize || 20}
            total={data.total}
            pages={data.pages}
            pageSizes={null}
            label="Booking pages"
            noun={data.unit === 'visits' ? 'visits' : 'bookings'}
            className="border-t border-border px-5 py-4"
          />
        </div>
        <p className="mt-4 text-meta leading-6 text-ink-600">
          Views can overlap when a booking has multiple visits. Booking and visit states are tracked
          separately.
        </p>
      </section>
    </AdminPage>
  );
}
