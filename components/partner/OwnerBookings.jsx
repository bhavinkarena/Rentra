/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { EmptyState } from '@/components/ui/empty-state';
import Pagination from '@/components/ui/pagination';
import { fieldClass } from '@/components/ui/field';
import { Building2, CalendarDays, ChevronRight, Search, X } from 'lucide-react';
import {
  totalPrice,
  displayMoney as money,
  StateBadge,
} from '@/components/customer/BookingDisplay';

const BASE = '/partner/bookings';
const PAGE_SIZE = 20; // Fixed by the records API.
const TABS = [
  ['today', 'Today'],
  ['upcoming', 'Upcoming'],
  ['action_needed', 'Needs action'],
  ['with_rentra', 'With Rentra'],
  ['past', 'Past'],
  ['cancelled', 'Cancelled'],
];
const VERTICAL_NAMES = { farmhouse: 'Farmhouses', entertainment: 'Venues' };

function href(data, changes) {
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
  for (const key of ['resource', 'vertical', 'property', 'from', 'to', 'q'])
    if (query[key] === '') delete query[key];
  if (query.page === '1') delete query.page;
  return `${BASE}?${new URLSearchParams(query)}`;
}

const dateLabel = (value) =>
  value
    ? new Intl.DateTimeFormat('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        timeZone: 'Asia/Kolkata',
      }).format(new Date(`${String(value).slice(0, 10)}T12:00:00+05:30`))
    : 'Dates in booking';
const year = (value) => (value ? String(value).slice(0, 4) : '');
const initials = (name) =>
  String(name || 'Guest')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

export default function OwnerBookings({ data }) {
  const filtered = Boolean(
    data.q || data.property || data.from || data.to || data.resource || data.vertical,
  );
  const propertyName = data.property
    ? (data.properties || []).find((p) => p.id === data.property)?.title || 'Untitled draft'
    : null;
  const chips = [
    data.q && ['Search', `“${data.q}”`, { q: '' }],
    propertyName && ['Property', propertyName, { property: '' }],
    data.from && ['From', dateLabel(data.from), { from: '' }],
    data.to && ['To', dateLabel(data.to), { to: '' }],
  ].filter(Boolean);
  const thisYear = String(new Date().getFullYear());

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-h1 leading-tight font-bold tracking-[-0.03em] text-ink-900">
            Bookings
          </h1>
          <p className="mt-2 text-meta text-ink-600">
            Every guest visit across your properties. Times are in IST.
          </p>
        </div>
        <Link
          href="/partner/calendar"
          className="inline-flex min-h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-meta font-semibold text-ink-800 hover:border-brand-300 hover:bg-brand-50"
        >
          <CalendarDays className="size-4" aria-hidden="true" />
          Open calendar
        </Link>
      </header>

      <section className="overflow-hidden rounded-lg border border-border bg-card">
        {/* Queues */}
        <nav
          aria-label="Booking queues"
          className="flex gap-1 overflow-x-auto border-b border-border px-2 sm:px-4"
        >
          {TABS.map(([tab, text]) => {
            const count = data.summary?.[tab];
            const current = data.tab === tab;
            return (
              <Link
                key={tab}
                aria-current={current ? 'page' : undefined}
                href={href(data, { tab, page: '1', event: '' })}
                className={`relative inline-flex min-h-13 shrink-0 items-center gap-2 px-3 text-meta font-semibold transition-colors ${current ? 'text-ink-900 after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-600' : 'text-ink-500 hover:text-ink-900'}`}
              >
                {text}
                {count != null ? (
                  <span
                    className={`min-w-6 rounded-full px-1.5 py-0.5 text-center text-tiny tabular ${tab === 'action_needed' && count ? 'bg-warning-bg text-warning' : current ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-600'}`}
                  >
                    {count}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Filters */}
        <Form
          action={BASE}
          className="grid gap-3 border-b border-border bg-ink-25 p-3 sm:p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto] xl:grid-cols-[minmax(0,1fr)_16rem_auto_auto]"
        >
          <input type="hidden" name="tab" value={data.tab} />
          {data.resource && <input type="hidden" name="resource" value={data.resource} />}
          {data.vertical && <input type="hidden" name="vertical" value={data.vertical} />}
          {data.event && data.event !== 'all' ? (
            <input type="hidden" name="event" value={data.event} />
          ) : null}
          <label className="relative block min-w-0">
            <span className="sr-only">Search bookings</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-500"
              aria-hidden="true"
            />
            <input
              className={`${fieldClass} block pl-9`}
              type="search"
              name="q"
              maxLength={100}
              defaultValue={data.q}
              placeholder="Guest, phone, property or reference"
            />
          </label>
          <label className="block min-w-0">
            <span className="sr-only">Property</span>
            <select
              name="property"
              defaultValue={data.property || ''}
              className={`${fieldClass} block overflow-hidden whitespace-nowrap`}
            >
              <option value="">All properties</option>
              {(data.properties || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title || 'Untitled draft'}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="flex min-w-0 items-center gap-2 md:col-span-2 xl:col-span-1">
            <legend className="sr-only">Visit dates</legend>
            <label className="min-w-0 flex-1">
              <span className="sr-only">From date</span>
              <input
                type="date"
                name="from"
                defaultValue={data.from || ''}
                className={`${fieldClass} min-w-0`}
              />
            </label>
            <span aria-hidden="true" className="text-ink-400">
              –
            </span>
            <label className="min-w-0 flex-1">
              <span className="sr-only">To date</span>
              <input
                type="date"
                name="to"
                defaultValue={data.to || ''}
                className={`${fieldClass} min-w-0`}
              />
            </label>
          </fieldset>
          <button className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-meta font-semibold text-white hover:bg-primary-hover active:bg-brand-900 md:col-start-3 md:row-start-1 xl:col-start-4">
            Apply
          </button>
        </Form>

        {/* Active filters, today split, venue filters */}
        {chips.length ||
        data.tab === 'today' ||
        (data.verticals ?? []).length > 1 ||
        (data.resources ?? []).length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-3 sm:px-4">
            {data.tab === 'today' ? (
              <div
                role="group"
                aria-label="Arrivals and departures"
                className="inline-flex h-10 items-center gap-0.5 rounded-md border border-border bg-ink-25 p-1"
              >
                {[
                  ['all', 'All today'],
                  ['arriving', 'Arriving'],
                  ['leaving', 'Leaving'],
                ].map(([event, text]) => (
                  <Link
                    key={event}
                    aria-current={(data.event || 'all') === event ? 'page' : undefined}
                    href={href(data, { event, page: '1' })}
                    className={`inline-flex h-full items-center rounded-[7px] px-3 text-tiny font-semibold ${(data.event || 'all') === event ? 'bg-card text-ink-900 shadow-sm ring-1 ring-border' : 'text-ink-600 hover:text-ink-900'}`}
                  >
                    {text}
                  </Link>
                ))}
              </div>
            ) : null}
            {(data.verticals ?? []).length > 1
              ? ['', ...data.verticals].map((code) => (
                  <Link
                    key={code || 'all'}
                    aria-current={(data.vertical ?? '') === code ? 'page' : undefined}
                    className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-tiny font-semibold text-ink-700 hover:bg-ink-50 aria-[current=page]:border-brand-600 aria-[current=page]:bg-brand-50 aria-[current=page]:text-brand-800"
                    href={href(data, { vertical: code, page: '1' })}
                  >
                    {code ? (VERTICAL_NAMES[code] ?? code) : 'All kinds'}
                  </Link>
                ))
              : null}
            {(data.resources ?? []).length ? (
              <Form action={BASE} className="flex items-center gap-2">
                {['tab', 'q', 'property', 'vertical']
                  .filter((k) => data[k])
                  .map((k) => (
                    <input key={k} type="hidden" name={k} value={data[k]} />
                  ))}
                <label htmlFor="booking-court" className="text-tiny font-semibold text-ink-600">
                  Court
                </label>
                <select
                  id="booking-court"
                  name="resource"
                  defaultValue={data.resource ?? ''}
                  className="min-h-9 rounded-md border border-border bg-card px-3 text-meta"
                >
                  <option value="">All courts</option>
                  {data.resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <button className="min-h-9 rounded-md border border-border px-3 text-tiny font-semibold text-brand-700 hover:bg-brand-50">
                  Apply
                </button>
              </Form>
            ) : null}
            {chips.map(([name, value, clear]) => (
              <Link
                key={name}
                href={href(data, { ...clear, page: '1' })}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 pr-2 pl-3 text-tiny text-brand-800 hover:border-brand-400"
              >
                <span className="text-brand-700">{name}:</span>
                <span className="max-w-48 truncate font-semibold">{value}</span>
                <X className="size-3.5" aria-hidden="true" />
                <span className="sr-only">Remove {name.toLowerCase()} filter</span>
              </Link>
            ))}
            {chips.length > 1 ? (
              <Link
                href={href(data, { q: '', property: '', from: '', to: '', page: '1' })}
                className="px-1 text-tiny font-semibold text-ink-600 underline underline-offset-2 hover:text-ink-900"
              >
                Clear all
              </Link>
            ) : null}
          </div>
        ) : null}

        {/* Results */}
        {data.items.length ? (
          <>
            <div
              aria-hidden="true"
              className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_9rem_8rem_1.25rem] gap-4 border-b border-border px-4 py-2.5 text-tiny font-semibold text-ink-500 lg:grid"
            >
              <span>Guest</span>
              <span>Property</span>
              <span>Visit</span>
              <span>Status</span>
              <span className="text-right">Booking total</span>
              <span />
            </div>
            <ul aria-label="Bookings" className="divide-y divide-border">
              {data.items.map((item) => {
                const next =
                  item.operation?.label ||
                  item.visits?.find((v) => v.operation?.action)?.operation.label;
                const when =
                  item.firstVisitSlot === 'hourly'
                    ? item.firstVisitLabel
                    : dateLabel(item.firstVisit);
                return (
                  <li key={item.visitId ?? item.id}>
                    <Link
                      scroll={false}
                      href={href(data, { booking: item.id })}
                      className="group grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3.5 transition-colors hover:bg-ink-25 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_9rem_8rem_1.25rem] lg:gap-4"
                    >
                      {/* Guest */}
                      <span className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-3">
                        <span
                          aria-hidden="true"
                          className="row-span-2 grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-meta font-semibold text-brand-700 lg:row-span-1"
                        >
                          {initials(item.contact?.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-ink-900">
                            {item.contact?.name || 'Guest'}
                          </span>
                          <span className="block truncate text-tiny text-ink-500 lg:hidden">
                            {item.title} · {when}
                          </span>
                          <span className="hidden text-tiny text-ink-500 lg:block">
                            {item.guests || 0} guests
                          </span>
                        </span>
                      </span>
                      {/* Property */}
                      <span className="hidden min-w-0 items-center gap-3 lg:flex">
                        {item.photo?.url ? (
                          <img
                            src={item.photo.url.replace(
                              '/image/upload/',
                              '/image/upload/c_fill,w_96,h_96,f_auto,q_auto/',
                            )}
                            alt=""
                            className="size-10 shrink-0 rounded-md bg-ink-100 object-cover"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="grid size-10 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
                          >
                            <Building2 className="size-4" />
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-meta font-semibold text-ink-900">
                            {item.title}
                          </span>
                          <span
                            className="block truncate font-mono text-tiny text-ink-500"
                            title={item.reference}
                          >
                            {item.reference}
                          </span>
                        </span>
                      </span>
                      {/* Visit */}
                      <span className="hidden min-w-0 lg:block">
                        <span className="block text-meta text-ink-900">
                          {when}
                          {year(item.firstVisit) && year(item.firstVisit) !== thisYear
                            ? ` ${year(item.firstVisit)}`
                            : ''}
                        </span>
                        <span className="block text-tiny text-ink-500">
                          {item.visitCount} {item.visitCount === 1 ? 'visit' : 'visits'}
                        </span>
                      </span>
                      {/* Status */}
                      <span className="col-start-2 row-start-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 lg:col-start-auto lg:row-start-auto lg:block">
                        <StateBadge state={item.state} />
                        {next ? (
                          <span className="block truncate text-tiny font-semibold text-warning lg:mt-1">
                            {next}
                          </span>
                        ) : null}
                      </span>
                      {/* Total */}
                      <span className="col-start-3 row-span-2 row-start-1 text-right lg:col-start-auto lg:row-span-1 lg:row-start-auto">
                        <span className="block font-semibold text-ink-900 tabular">
                          {money(totalPrice(item))}
                        </span>
                        <span className="block text-tiny text-ink-500">+ deposit</span>
                      </span>
                      <ChevronRight
                        className="hidden size-4 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-700 lg:block"
                        aria-hidden="true"
                      />
                      <span className="sr-only">Open booking {item.reference}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Pagination
              page={data.page}
              pages={data.pages}
              pageSize={PAGE_SIZE}
              total={data.total}
              pageSizes={null}
              label="Booking pages"
              noun={data.tab === 'today' ? 'visits' : 'bookings'}
              className="border-t border-border px-4 py-3"
            />
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              icon={CalendarDays}
              variant={filtered ? 'no-results' : 'first-use'}
              title={
                filtered
                  ? 'No bookings match these filters'
                  : data.tab === 'action_needed'
                    ? 'Nothing needs you'
                    : data.tab === 'upcoming'
                      ? 'No upcoming bookings'
                      : data.tab === 'today'
                        ? 'No guests today'
                        : 'No bookings in this queue'
              }
              description={
                data.tab === 'action_needed'
                  ? 'Check-ins and check-outs to record will appear here.'
                  : 'Keep your calendar open and prices current to get booked.'
              }
              actionHref={
                filtered
                  ? `${BASE}?tab=${data.tab}`
                  : data.tab === 'action_needed'
                    ? undefined
                    : '/partner/calendar'
              }
              actionLabel={filtered ? 'Clear filters' : 'Open calendar'}
            />
          </div>
        )}
      </section>
    </div>
  );
}
