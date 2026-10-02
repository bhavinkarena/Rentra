import { EmptyState } from '@/components/ui/empty-state';
import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight, CalendarDays, Search } from 'lucide-react';
import {
  linkClass,
  PropertyPhoto,
  totalPrice,
  displayMoney as money,
  StateBadge,
} from './BookingDisplay';
import GuestContactLinks from '@/components/booking/GuestContactLinks';

const OWNER_STATE = {
  confirmed: 'Upcoming',
  handed_over: 'Checked in',
  returned: 'Checked out',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
  disputed: 'With Rentra',
};
const ACTION = {
  handover: 'Record check-in',
  return: 'Record check-out',
  complete: 'Finish inspection',
};

/** BOOK-01: who is coming, what to do next and how to reach them, under each owner card. */
function OwnerCardWork({ item, detailHref }) {
  const visits = item.visits ?? [];
  const next = item.visitId
    ? { id: item.visitId, operation: item.operation }
    : visits.find((v) => v.operation?.action) ||
      visits.find((v) => v.state === 'confirmed') ||
      visits[0];
  const name = item.contact?.name || 'Guest';
  return (
    <div className="flex flex-col gap-3 border-t border-border p-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-meta">
          <strong>{name}</strong>
          {item.guests ? ` · ${item.guests} guests` : ''}
          {next?.operation?.label ? (
            <span className="block text-tiny text-ink-600">{next.operation.label}</span>
          ) : null}
        </p>
        <span className="flex flex-wrap items-center gap-2">
          {next?.operation?.action ? (
            <Link
              href={`${detailHref}#visit-${next.id}`}
              className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-meta font-semibold text-white"
            >
              {ACTION[next.operation.action]}
            </Link>
          ) : null}
          <GuestContactLinks phone={item.contact?.phone} name={name} />
        </span>
      </div>
      {visits.length > 1 ? (
        <details>
          <summary className="min-h-11 cursor-pointer content-center text-meta font-semibold">
            {visits.length} visits
            {next?.label ? ` · next ${next.label}` : ''}
          </summary>
          <ul className="divide-y divide-border">
            {visits.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-meta">
                  {v.label} · {v.guests} guests ·{' '}
                  <span className="text-ink-600">{OWNER_STATE[v.state] || 'With Rentra'}</span>
                </span>
                <Link
                  href={`${detailHref}#visit-${v.id}`}
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-800 underline"
                >
                  {ACTION[v.operation?.action] ?? 'View visit'}
                  <span className="sr-only"> {v.reference}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}
function href(base, data, changes) {
  const query = {
    tab: data.tab,
    q: data.q,
    page: String(data.page),
    ...(data.property ? { property: data.property } : {}),
    ...(data.resource ? { resource: data.resource } : {}),
    ...(data.vertical ? { vertical: data.vertical } : {}),
    ...(data.from ? { from: data.from } : {}),
    ...(data.to ? { to: data.to } : {}),
    ...(data.event ? { event: data.event } : {}),
    ...changes,
  };
  // Optional filters drop out when cleared; tab, q and page keep their place.
  for (const key of ['resource', 'vertical']) if (query[key] === '') delete query[key];
  return `${base}?${new URLSearchParams(query)}`;
}

const VERTICAL_NAMES = { farmhouse: 'Farmhouses', entertainment: 'Venues' };

function shortDate(value) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(value))
    : 'Dates in booking details';
}

export function BookingHistory({ data, base = '/bookings', operational = false, homes = [] }) {
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-brand-700 uppercase">
            {operational ? 'Your guest visits' : 'Time well spent'}
          </p>
          <h1 className="text-h1">{operational ? 'Bookings' : 'Your bookings'}</h1>
          <p className="mt-2 text-ink-600">
            {operational
              ? 'Manage reservations and individual visits.'
              : 'Your next escape and the places you’ve already enjoyed.'}
          </p>
        </div>
        {!operational && (
          <Link href="/search" className={linkClass}>
            Explore places
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </header>
      <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <Form action={base} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="tab" value={data.tab} />
          {operational && (
            <label>
              Property
              <select
                name="property"
                defaultValue={data.property || ''}
                className="min-h-11 rounded-md border p-2"
              >
                <option value="">All properties</option>
                {(data.properties || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {operational &&
            ['from', 'to'].map((k) => (
              <label key={k}>
                {k === 'from' ? 'From' : 'To'}
                <input
                  type="date"
                  name={k}
                  defaultValue={data[k] || ''}
                  className="min-h-11 rounded-md border p-2"
                />
              </label>
            ))}
          {data.resource && <input type="hidden" name="resource" value={data.resource} />}
          {data.vertical && <input type="hidden" name="vertical" value={data.vertical} />}
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search property or booking reference</span>
            <span
              data-field-shell
              className="flex h-12 items-center gap-3 rounded-full border border-border px-4 focus-within:border-brand-600"
            >
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <input
                className="w-full min-w-0 bg-transparent text-base outline-none sm:text-sm"
                name="q"
                maxLength={100}
                defaultValue={data.q}
                placeholder={
                  operational
                    ? 'Guest name, phone, property or reference'
                    : 'Property or booking reference'
                }
              />
            </span>
          </label>
          <button className="min-h-12 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover active:bg-brand-900">
            Search
          </button>
        </Form>
        <nav aria-label="Booking history filters" className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {(operational
            ? [
                ...(base === '/partner/bookings' ? [] : ['all']),
                'today',
                'upcoming',
                'action_needed',
                ...(base === '/partner/bookings' ? ['with_rentra'] : []),
                'past',
                'cancelled',
              ]
            : ['all', 'upcoming', 'past', 'cancelled']
          ).map((tab) => (
            <Link
              key={tab}
              aria-current={data.tab === tab ? 'page' : undefined}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm text-ink-600 hover:bg-ink-50 aria-[current=page]:bg-primary aria-[current=page]:font-semibold aria-[current=page]:text-white"
              href={href(base, data, { tab, page: '1' })}
            >
              {tab === 'action_needed'
                ? 'Needs action'
                : tab === 'with_rentra'
                  ? 'With Rentra'
                  : tab[0].toUpperCase() + tab.slice(1)}
              {data.summary && (
                <span className="text-xs">
                  {tab === 'all' ? data.summary.total : data.summary[tab]}
                </span>
              )}
            </Link>
          ))}
        </nav>
        {(data.verticals ?? []).length > 1 || (data.resources ?? []).length ? (
          // Entertainment plan, Phase 11: optional, for owners with both kinds or many courts.
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(data.verticals ?? []).length > 1
              ? ['', ...data.verticals].map((code) => (
                  <Link
                    key={code || 'all'}
                    aria-current={(data.vertical ?? '') === code ? 'page' : undefined}
                    className="inline-flex min-h-10 items-center rounded-full border border-border px-3.5 text-sm text-ink-700 hover:bg-ink-50 aria-[current=page]:border-brand-600 aria-[current=page]:bg-brand-50 aria-[current=page]:font-semibold aria-[current=page]:text-brand-800"
                    href={href(base, data, { vertical: code, page: '1' })}
                  >
                    {code ? (VERTICAL_NAMES[code] ?? code) : 'All kinds'}
                  </Link>
                ))
              : null}
            {(data.resources ?? []).length ? (
              <Form action={base} className="flex items-center gap-2">
                {['tab', 'q', 'property', 'vertical']
                  .filter((k) => data[k])
                  .map((k) => (
                    <input key={k} type="hidden" name={k} value={data[k]} />
                  ))}
                <label htmlFor="booking-court" className="text-sm font-semibold text-ink-700">
                  Court
                </label>
                <select
                  id="booking-court"
                  name="resource"
                  defaultValue={data.resource ?? ''}
                  className="min-h-10 rounded-full border border-border bg-card px-3 text-sm"
                >
                  <option value="">All courts</option>
                  {data.resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button className="min-h-10 rounded-full border border-border px-3.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">
                  Apply
                </button>
              </Form>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="text-sm text-ink-500">
        {data.total} {data.tab === 'today' && base === '/partner/bookings' ? 'visit' : 'booking'}
        {data.total === 1 ? '' : 's'} found
      </p>
      {operational && data.tab === 'today' && (
        <nav aria-label="Today arrivals and departures" className="flex gap-3">
          {['all', 'arriving', 'leaving'].map((event) => (
            <Link
              key={event}
              className="min-h-11 rounded-md border p-3"
              aria-current={(data.event || 'all') === event ? 'page' : undefined}
              href={href(base, data, { event, page: '1' })}
            >
              {event === 'all' ? 'All today' : event === 'arriving' ? 'Arriving' : 'Leaving'}
            </Link>
          ))}
        </nav>
      )}
      <ul className="space-y-4">
        {data.items.map((item) => (
          <li
            key={item.visitId ?? item.id}
            className={
              base === '/partner/bookings'
                ? 'overflow-hidden rounded-xl border border-border bg-card'
                : undefined
            }
          >
            <Link
              href={`${base}/${item.id}${operational ? `?from=${encodeURIComponent(href(base, data, {}))}` : ''}${item.visitId ? `#visit-${item.visitId}` : ''}`}
              className={`group grid overflow-hidden bg-card transition grid-cols-[112px_1fr] sm:grid-cols-[200px_1fr] ${base === '/partner/bookings' ? 'hover:bg-ink-50' : 'rounded-xl border border-border hover:border-brand-300 hover:shadow-md'}`}
            >
              <PropertyPhoto photo={item.photo} title={item.title} />
              <div className="flex flex-col gap-3 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <StateBadge state={item.state} />
                    <h2 className="mt-2 text-h4 group-hover:text-brand-700">{item.title}</h2>
                  </div>
                  <ArrowUpRight
                    className="size-5 shrink-0 text-muted-foreground group-hover:text-brand-700"
                    aria-hidden="true"
                  />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4 text-brand-700" aria-hidden="true" />
                    {item.firstVisitSlot === 'hourly'
                      ? item.firstVisitLabel
                      : shortDate(item.firstVisit)}
                  </span>
                  <span>
                    {item.visitCount} visit{item.visitCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-xs text-ink-500">
                      {item.visitId
                        ? 'Booking total · separate deposit'
                        : 'Accepted total · separate deposit'}
                    </p>
                    <p className="mt-0.5 text-h4 font-bold tabular">{money(totalPrice(item))}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-ink-500">
                  <span className="max-w-full truncate font-mono" title={item.reference}>
                    {item.reference}
                  </span>
                  {operational && (
                    <span>
                      {item.visitStates.map((s) => OWNER_STATE[s] || 'With Rentra').join(', ')}.
                      Payment below applies to the booking.
                    </span>
                  )}
                  {item.payments.map((payment, index) => (
                    <span key={index}>
                      · {payment.environment === 'test' ? 'Test payment: ' : 'Payment: '}
                      {payment.state}
                    </span>
                  ))}
                  {!item.payments.length && <span>· No verified payment</span>}
                </div>
              </div>
            </Link>
            {base === '/partner/bookings' ? (
              <OwnerCardWork
                item={item}
                detailHref={`${base}/${item.id}?from=${encodeURIComponent(href(base, data, {}))}`}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {!data.items.length &&
        (base === '/partner/bookings' ? (
          <EmptyState
            icon={CalendarDays}
            variant={
              data.q || data.property || data.from || data.to || data.resource || data.vertical
                ? 'no-results'
                : 'first-use'
            }
            title={
              data.q || data.property || data.from || data.to || data.resource || data.vertical
                ? 'No bookings match these filters'
                : data.tab === 'action_needed'
                  ? 'Nothing needs you'
                  : data.tab === 'upcoming'
                    ? 'No upcoming bookings'
                    : 'No bookings in this queue'
            }
            description={
              data.tab === 'action_needed'
                ? 'Check-ins and check-outs to record will appear here.'
                : 'Keep your calendar open and prices current to get booked.'
            }
            actionHref={
              data.q || data.property || data.from || data.to || data.resource || data.vertical
                ? `${base}?tab=${data.tab}`
                : data.tab === 'action_needed'
                  ? undefined
                  : '/partner/calendar'
            }
            actionLabel={
              data.q || data.property || data.from || data.to || data.resource || data.vertical
                ? 'Clear filters'
                : 'Open calendar'
            }
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <CalendarDays className="mx-auto mb-5 size-10 text-brand-600" />
            <h2 className="text-xl font-semibold">
              {operational
                ? 'No bookings in this queue'
                : data.q
                  ? 'No matching bookings'
                  : 'Your next memory starts here'}
            </h2>
            <p className="mx-auto mt-3 mb-6 max-w-sm text-sm leading-relaxed text-ink-500">
              {operational
                ? 'Change your filters to view other bookings.'
                : data.q
                  ? 'Try another property name or booking reference.'
                  : 'When you book a place, you’ll find your visit details and updates here.'}
            </p>
            {!operational && !data.q && data.tab === 'all' && homes.length > 1 ? (
              // Two public homes: one link each, named by the vertical.
              <div className="flex flex-wrap justify-center gap-3">
                {homes.map((home) => (
                  <Link key={home.href} href={home.href} className={linkClass}>
                    {home.label}
                    <ArrowUpRight className="size-4" />
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                href={operational || data.q || data.tab !== 'all' ? base : '/search'}
                className={linkClass}
              >
                {operational || data.q || data.tab !== 'all'
                  ? 'View all bookings'
                  : 'Explore farmhouses'}
                <ArrowUpRight className="size-4" />
              </Link>
            )}
          </div>
        ))}
      {data.pages > 1 && (
        <nav
          aria-label="Booking pages"
          className="flex flex-wrap items-center justify-center gap-5"
        >
          {data.page > 1 && (
            <Link className={linkClass} href={href(base, data, { page: String(data.page - 1) })}>
              Previous
            </Link>
          )}
          <span className="text-sm text-ink-500">
            Page {data.page} of {data.pages}
          </span>
          {data.page < data.pages && (
            <Link className={linkClass} href={href(base, data, { page: String(data.page + 1) })}>
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
