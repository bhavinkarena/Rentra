import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { CalendarCheck2, CalendarClock, CalendarX2, CircleDollarSign, Search } from 'lucide-react';
import { displayMoney } from '@/lib/domain/display-money';
import Pagination from '@/components/ui/pagination';
import {
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminKpiCard,
  StatusBadge,
} from './AdminPrimitives';
import { adminBookingHref as queryHref } from '@/lib/domain/admin-booking-navigation';

const TABS = [
  { value: 'all', label: 'All bookings' },
  { value: 'today', label: 'Today' },
  { value: 'action_needed', label: 'Action needed' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDate(value) {
  if (!value) return 'Not recorded';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function label(value) {
  return String(value || 'unknown').replaceAll('_', ' ');
}

function paymentSummary(payments) {
  if (!payments.length) return { text: 'No payment', tone: 'text-ink-500', dot: 'bg-ink-300' };
  return {
    text: payments.map((p) => `${p.environment}: ${label(p.state)}`).join(' · '),
    tone: 'text-ink-700',
    dot: 'bg-ink-300',
  };
}

export default function AdminBookingHistory({ data }) {
  const summary = data.summary || {
    total: data.tab === 'all' ? data.total : 0,
    upcoming: data.tab === 'upcoming' ? data.total : 0,
    past: data.tab === 'past' ? data.total : 0,
    cancelled: data.tab === 'cancelled' ? data.total : 0,
  };

  return (
    <AdminPage>
      <AdminPageHeader
        title="Booking records"
        description="Inspect bookings, visit dates, payment evidence and operational cases."
      />

      {data.environment ? (
        <p className="mt-4 text-meta text-ink-600">
          Dashboard scope: {data.environment}{' '}
          {data.unit === 'visits'
            ? 'visits arriving or departing today (IST), counted once per visit.'
            : `orders created ${data.createdFrom || 'any date'} to ${data.createdTo || 'any date'} (IST).`}
          {data.rentOnly
            ? ' Non-cancelled visit rent only; excludes unpaid holds, fees and deposits.'
            : ''}{' '}
          <Link href="/admin/bookings" className="underline">
            Clear dashboard scope
          </Link>
        </p>
      ) : null}
      {data.unit !== 'visits' ? (
        <section
          className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"
          aria-label="Booking summary"
        >
          <AdminKpiCard
            label="Total bookings"
            value={summary.total}
            hint="All booking records"
            icon={CalendarCheck2}
          />
          <AdminKpiCard
            label="Upcoming"
            value={summary.upcoming}
            hint="Confirmed future visits"
            icon={CalendarClock}
            tone="brand"
          />
          <AdminKpiCard
            label="Past"
            value={summary.past}
            hint="Includes visits whose scheduled end has passed"
            icon={CircleDollarSign}
          />
          <AdminKpiCard
            label="Cancelled"
            value={summary.cancelled}
            hint="Cancelled or expired"
            icon={CalendarX2}
            tone={summary.cancelled ? 'danger' : 'neutral'}
          />
        </section>
      ) : null}

      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border p-4 sm:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-h4 font-bold text-ink-900">All booking records</h2>
              <p className="mt-0.5 text-tiny text-ink-500">
                Search by property name or booking reference
              </p>
            </div>
            <Form action="/admin/bookings" className="flex w-full max-w-xl gap-2">
              <input type="hidden" name="tab" value={data.tab} />
              {[
                'resource',
                'vertical',
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
              {data.property && <input type="hidden" name="property" value={data.property} />}
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Search property or booking reference</span>
                <Search
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  className="min-h-11 w-full rounded-md border border-input bg-card pr-3 pl-10 text-base md:text-sm text-ink-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  name="q"
                  maxLength={100}
                  defaultValue={data.q}
                  placeholder="Search bookings..."
                />
              </label>
              <button className="min-h-11 rounded-md bg-primary px-4 text-meta font-semibold text-white transition hover:bg-primary-hover active:bg-brand-900">
                Search
              </button>
            </Form>
          </div>

          <nav
            className="mt-5 flex gap-1 overflow-x-auto border-b border-border"
            aria-label="Booking filters"
          >
            {TABS.map((tab) => {
              const active = data.tab === tab.value;
              return (
                <Link
                  key={tab.value}
                  href={queryHref(data, { tab: tab.value, page: '1' })}
                  aria-current={active ? 'page' : undefined}
                  className="inline-flex min-h-11 shrink-0 items-center border-b-2 border-transparent px-3 text-meta font-semibold text-ink-600 aria-[current=page]:border-brand-700 aria-[current=page]:text-brand-800 hover:text-ink-900"
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {(data.verticals ?? []).length > 1 ? (
            <nav aria-label="Kind of place" className="mt-3 flex flex-wrap gap-2">
              {['', ...data.verticals].map((code) => (
                <Link
                  key={code || 'all'}
                  href={queryHref(data, { vertical: code, page: '1' })}
                  aria-current={(data.vertical ?? '') === code ? 'page' : undefined}
                  className="inline-flex min-h-11 items-center rounded-md border border-border px-3 text-meta font-semibold text-ink-600 hover:bg-ink-50 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800"
                >
                  {{ '': 'All kinds', farmhouse: 'Farmhouses', entertainment: 'Venues' }[code] ??
                    code}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
        <AdminTable
          label="Booking records"
          framed={false}
          minWidth={1060}
          columns={[
            'Property and reference',
            'Owner / guest',
            'Visit dates',
            'Booking state',
            data.rentOnly ? 'Non-cancelled rent (INR)' : 'Booked rent (INR)',
            'Payment environment',
            'View',
          ]}
          empty={
            !data.items.length ? (
              <div className="text-center">
                <h3 className="text-h4 font-semibold">No bookings found</h3>
                <p className="mt-2 text-meta text-ink-600">
                  Try another filter or clear your search.
                </p>
              </div>
            ) : null
          }
        >
          {data.items.map((item) => (
            <BookingRow
              key={item.visitId ?? item.id}
              item={item}
              rentOnly={data.rentOnly}
              viewHref={queryHref(data, { booking: item.id })}
            />
          ))}
        </AdminTable>
        <Pagination
          page={data.page}
          pageSize={20}
          total={data.total}
          pages={data.pages}
          pageSizes={null}
          label="Booking pages"
          noun={data.unit === 'visits' ? 'visits' : 'bookings'}
          className="border-t border-border px-4 py-4 sm:px-5"
        />
      </section>
    </AdminPage>
  );
}

function BookingRow({ item, viewHref, rentOnly }) {
  const payment = paymentSummary(item.payments);
  return (
    <tr className="hover:bg-ink-25">
      <td className="px-4 py-4">
        <p className="max-w-[300px] truncate text-meta font-semibold text-ink-900">{item.title}</p>
        <p className="mt-1 text-meta text-ink-600">{item.reference}</p>
        {item.firstVisitLabel ? (
          <p className="mt-1 text-meta text-ink-600">{item.firstVisitLabel}</p>
        ) : null}
      </td>
      <td className="px-4 py-4 text-meta">
        <p className="font-semibold">{item.owner?.name || 'Owner not recorded'}</p>
        <p className="mt-1 text-ink-600">
          {item.guestWithheld
            ? 'Guest hidden — no active fulfillment'
            : item.guestName || 'Guest not recorded'}
        </p>
      </td>
      <td className="px-4 py-4 text-meta">
        <p>
          {item.firstVisit || 'Not recorded'}
          {item.lastVisit && item.lastVisit !== item.firstVisit ? ` – ${item.lastVisit}` : ''}
        </p>
        <p className="mt-1 text-ink-600">
          {item.visitCount} visit{item.visitCount === 1 ? '' : 's'} ·{' '}
          {item.visitStates.map(label).join(', ') || 'No visits recorded'}
        </p>
        <p className="mt-1 text-ink-600">Booked {formatDate(item.createdAt)} (IST)</p>
      </td>
      <td className="px-4 py-4">
        <StatusBadge domain="booking" state={item.state} />
      </td>
      <td className="px-4 py-4 text-meta tabular">
        {displayMoney(item.rentMinor)}
        <p className="mt-1 text-tiny text-ink-600">
          {rentOnly ? 'Excludes fees and deposits' : 'Original rent; not collected cash'}
        </p>
      </td>
      <td className="px-4 py-4 text-meta">
        <span className={payment.tone}>{payment.text}</span>
        {item.payments.some((entry) => entry.environment === 'test') ? (
          <p className="mt-1 text-tiny font-semibold text-warning">Test gateway</p>
        ) : null}
      </td>
      <td className="px-4 py-4">
        <Link
          href={viewHref}
          scroll={false}
          className="inline-flex min-h-11 items-center rounded-md px-3 text-meta font-semibold text-brand-700 hover:bg-brand-50"
          aria-label={`Open booking ${item.reference}`}
        >
          View
        </Link>
      </td>
    </tr>
  );
}
