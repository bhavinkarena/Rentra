import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ImageOff,
  Search,
  Wallet,
  Users,
  Download,
  LifeBuoy,
} from 'lucide-react';
import { randomUUID } from 'node:crypto';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { VisitLifecycle } from './VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import { CustomerCaseUpdates, OwnerCases } from '@/components/booking/CasePanels';

const linkClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50';
const badge =
  'inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800';
function href(base, data, changes) {
  return `${base}?${new URLSearchParams({ tab: data.tab, q: data.q, page: String(data.page), ...(data.property ? { property: data.property } : {}), ...changes })}`;
}

function PropertyPhoto({ photo, title, hero = false }) {
  return (
    <div
      className={`relative overflow-hidden bg-brand-50 ${hero ? 'h-56 sm:h-72' : 'h-48 sm:h-full sm:min-h-48'}`}
    >
      {photo ? (
        <Image
          src={photo.url}
          alt={photo.alt || title}
          fill
          sizes={hero ? '(max-width: 768px) 100vw, 900px' : '(max-width: 640px) 100vw, 260px'}
          className="object-cover"
        />
      ) : (
        <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-brand-700">
          <ImageOff className="size-8" />
          <span className="text-xs">Property photo unavailable</span>
        </div>
      )}
    </div>
  );
}
function totalPrice(record) {
  return record.rentMinor == null || record.feeMinor == null
    ? null
    : record.rentMinor + record.feeMinor;
}
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

export function BookingHistory({ data, base = '/bookings', operational = false }) {
  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-widest text-brand-700 uppercase">
            Time well spent
          </p>
          <h1 className="text-h1">{operational ? 'Booking records' : 'Your bookings'}</h1>
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
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <form action={base} className="flex items-end gap-3">
          <input type="hidden" name="tab" value={data.tab} />
          {data.property && <input type="hidden" name="property" value={data.property} />}
          <label className="min-w-0 flex-1">
            <span className="sr-only">Search property or booking reference</span>
            <span className="flex h-12 items-center gap-3 rounded-xl border border-border px-4">
              <Search className="size-4 shrink-0 text-ink-400" />
              <input
                className="w-full min-w-0 bg-transparent text-sm outline-none"
                name="q"
                maxLength={100}
                defaultValue={data.q}
                placeholder="Search property or booking reference"
              />
            </span>
          </label>
          <button className="min-h-12 rounded-xl bg-brand-700 px-5 text-sm font-semibold text-white hover:bg-brand-800">
            Search
          </button>
        </form>
        <nav aria-label="Booking history filters" className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {(operational
            ? ['all', 'today', 'upcoming', 'action_needed', 'past', 'cancelled']
            : ['all', 'upcoming', 'past', 'cancelled']
          ).map((tab) => (
            <Link
              key={tab}
              aria-current={data.tab === tab ? 'page' : undefined}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm text-ink-600 hover:bg-ink-50 aria-[current=page]:bg-brand-700 aria-[current=page]:font-semibold aria-[current=page]:text-white"
              href={href(base, data, { tab, page: '1' })}
            >
              {tab === 'action_needed' ? 'Action needed' : tab[0].toUpperCase() + tab.slice(1)}
              {data.summary && (
                <span className="text-xs opacity-75">
                  {tab === 'all' ? data.summary.total : data.summary[tab]}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>
      <p className="text-sm text-ink-500">
        {data.total} booking{data.total === 1 ? '' : 's'} found
      </p>
      <ul className="space-y-5">
        {data.items.map((item) => (
          <li key={item.id}>
            <Link
              href={`${base}/${item.id}${operational ? `?from=${encodeURIComponent(href(base, data, {}))}` : ''}`}
              className="group grid overflow-hidden rounded-2xl border border-border bg-card transition hover:border-brand-300 hover:shadow-md sm:grid-cols-[240px_1fr]"
            >
              <PropertyPhoto photo={item.photo} title={item.title} />
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={badge}>{item.state.replaceAll('_', ' ')}</span>
                    <h2 className="mt-3 text-xl font-semibold group-hover:text-brand-700">
                      {item.title}
                    </h2>
                  </div>
                  <ArrowUpRight className="size-5 text-ink-400 group-hover:text-brand-700" />
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-600">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" />
                    {shortDate(item.firstVisit)}
                  </span>
                  <span>
                    {item.visitCount} visit{item.visitCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border pt-4">
                  <div>
                    <p className="text-xs text-ink-500">Accepted total · separate deposit</p>
                    <p className="mt-1 text-xl font-semibold">{money(totalPrice(item))}</p>
                  </div>
                  <span className="text-sm font-semibold text-brand-700">View booking →</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-ink-500">
                  <span>{item.reference}</span>
                  {operational && (
                    <span>
                      Visit states: {item.visitStates.join(', ').replaceAll('_', ' ')}. Payment
                      below applies to the booking.
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
          </li>
        ))}
      </ul>
      {!data.items.length && (
        <div className="rounded-3xl border border-dashed border-border bg-card px-6 py-14 text-center">
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
          <Link
            href={operational || data.q || data.tab !== 'all' ? base : '/search'}
            className={linkClass}
          >
            {operational || data.q || data.tab !== 'all'
              ? 'View all bookings'
              : 'Explore farmhouses'}
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      )}
      {data.total > 0 && (
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

export function BookingDetail({
  record,
  base = '/bookings',
  operational = false,
  listHref = base,
}) {
  const test = record.payments.some((p) => p.environment === 'test');
  const confirmed = record.visits.some((v) =>
    ['confirmed', 'handed_over', 'returned', 'completed', 'disputed'].includes(v.state),
  );
  return (
    <article className="mx-auto max-w-5xl space-y-6 break-words">
      <Link href={listHref} className={linkClass}>
        <ArrowLeft className="size-4" />
        Back to bookings
      </Link>
      {operational && record.relationships && (
        <nav aria-label="Related records" className="flex flex-wrap gap-4">
          <Link
            className={linkClass}
            href={`/partner/listings/${record.relationships.propertyId}/overview`}
          >
            Property overview
          </Link>
          <Link
            className={linkClass}
            href={`/partner/listings/${record.relationships.propertyId}/calendar`}
          >
            Property calendar
          </Link>
        </nav>
      )}
      {operational && (
        <p className="text-sm">
          Payment status applies to the whole booking. Each visit has its own state and evidence.
          Verified capture confirms automatically; no owner acceptance is needed.
        </p>
      )}
      <header className="overflow-hidden rounded-3xl border border-border bg-card">
        <PropertyPhoto photo={record.photo} title={record.title} hero />
        <div className="p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <span className={badge}>{record.state.replaceAll('_', ' ')}</span>
              <h1 className="mt-3 text-h1">{record.title}</h1>
              <p className="mt-2 text-sm text-ink-500">
                {confirmed ? (test ? 'Test booking' : 'Your reservation') : 'Booking status'} ·{' '}
                {record.reference}
              </p>
            </div>
            <div className="rounded-2xl bg-brand-50 px-5 py-4">
              <p className="text-xs text-ink-600">Accepted booking total</p>
              <p className="mt-1 text-2xl font-semibold text-brand-800">
                {money(totalPrice(record))}
              </p>
              <p className="mt-1 text-xs text-ink-500">Deposit shown separately below</p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-border pt-5 text-sm text-ink-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4" />
              {shortDate(record.visits[0]?.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="size-4" />
              {record.visits.length} visit{record.visits.length === 1 ? '' : 's'}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" />
              Arrival details below
            </span>
          </div>
        </div>
      </header>
      {test ? (
        <p className="rounded-md bg-brand-50 p-4">
          Razorpay Test booking. No actual bank money was collected by the Test gateway. This record
          is not a real-money receipt.
        </p>
      ) : null}
      <nav aria-label="Manage booking" className="flex flex-wrap items-center gap-3">
        <a className={linkClass} href={`${base}/${record.id}/summary`}>
          <Download className="size-4" />
          Booking summary (.txt)
        </a>
        <p>
          <a className={linkClass} href={`${base}/${record.id}/calendar`}>
            <CalendarDays className="size-4" />
            Add to calendar (.ics)
          </a>
        </p>
        {!operational ? (
          <p>
            <Link className={linkClass} href={`/bookings/${record.id}/reviews`}>
              Reviews
            </Link>
          </p>
        ) : (
          <p>
            <Link
              className={linkClass}
              href={base === '/admin/bookings' ? '/admin/reviews' : '/partner/reviews'}
            >
              Customer reviews
            </Link>
          </p>
        )}
        {!operational ? (
          <p>
            <Link className={linkClass} href={`/bookings/${record.id}/again`}>
              Book again
            </Link>
          </p>
        ) : null}
        {!operational ? (
          <nav className="flex flex-wrap gap-5">
            <Link className={linkClass} href={`/support/new?order=${record.id}`}>
              <LifeBuoy className="size-4" />
              Get booking help
            </Link>
            <Link className={linkClass} href={`/support/new?order=${record.id}&topic=change`}>
              Ask about a change
            </Link>
          </nav>
        ) : null}
        {!operational && record.payments.some((p) => p.recoverable) ? (
          <p>
            <Link className={linkClass} href={`/checkout/${record.id}`}>
              View checkout and payment recovery
            </Link>
          </p>
        ) : null}
        {!operational && test ? (
          <p>
            <Link className={linkClass} href={`/bookings/${record.id}/cancel`}>
              Cancel visits
            </Link>
          </p>
        ) : null}
      </nav>
      {new Set(record.visits.map((v) => v.state)).size > 1 ? (
        <p className={badge}>Mixed visit statuses — check each visit below.</p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed">
          <h2 className="text-h3">Customer and purpose</h2>
          <p>
            {record.contact.withheld
              ? 'Contact hidden — no active visit requires fulfillment'
              : record.contact.name || 'Name not recorded'}{' '}
            · {record.contact.phone || 'Phone not recorded'}
          </p>
          <p>{record.purpose || 'Purpose not recorded'}</p>
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed">
          <h2 className="flex items-center gap-2 text-h3">
            <Wallet className="size-5 text-brand-700" />
            Price breakdown
          </h2>
          <p>
            Rent {money(record.rentMinor)} + fee {money(record.feeMinor)}
          </p>
          <p>
            Total:{' '}
            {money(
              record.rentMinor == null || record.feeMinor == null
                ? null
                : record.rentMinor + record.feeMinor,
            )}
          </p>
          <p>Separate deposit: {money(record.depositMinor)}</p>
        </section>
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed">
          <h2 className="flex items-center gap-2 text-h3">
            <CalendarDays className="size-5 text-brand-700" />
            Your visits
          </h2>
          <p className="mt-2 text-meta">
            Times in {record.timeZone}. Separate visits do not include access between dates.
          </p>
          <ul className="mt-3 space-y-4">
            {record.visits.map((v) => (
              <li key={v.id} className="space-y-2 rounded-lg border border-border p-4">
                <h3 className="font-semibold">
                  {v.date} · {v.slot.replaceAll('_', ' ')} · {v.guests} guests
                </h3>
                <p className="break-all text-meta">Visit {v.reference}</p>
                <span className={badge}>{v.state}</span>
                {operational && v.operation && (
                  <p className="text-sm font-semibold">{v.operation.label}</p>
                )}
                <p>
                  Arrival: {time(v.startsAt, record.timeZone)}
                  <br />
                  Departure: {time(v.endsAt, record.timeZone)}
                </p>
                <p>
                  Rent {money(v.rentMinor)} + fee {money(v.feeMinor)}
                </p>
                <p>Separate deposit: {money(v.depositMinor)}</p>
                <ol
                  aria-label={`Timeline for ${v.reference}`}
                  className="list-inside list-disc text-meta"
                >
                  {v.timeline.map((event, index) => (
                    <li key={index}>
                      {event.kind}: {time(event.at, record.timeZone)}
                    </li>
                  ))}
                </ol>
                {record.arrival?.visitIds.includes(v.id) ? (
                  <p className="text-meta">Confirmed visit: arrival details below apply.</p>
                ) : null}
                {!operational && v.evidence?.length ? (
                  <ul className="text-meta">
                    {v.evidence.map((e) => (
                      <li key={e.id}>
                        {e.kind} recorded ({e.nature}) · occurred{' '}
                        {time(e.occurredAt, record.timeZone)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {operational ? (
                  <VisitEvidence
                    visit={v}
                    orderId={record.id}
                    base={base}
                    timeZone={record.timeZone}
                    admin={base === '/admin/bookings'}
                    action={
                      <VisitLifecycle
                        key={`${v.id}-${v.version}`}
                        requestKey={randomUUID()}
                        visit={v}
                        admin={base === '/admin/bookings'}
                      />
                    }
                  />
                ) : null}
              </li>
            ))}
          </ul>
        </section>
        {operational ? (
          base === '/partner/bookings' ? (
            <OwnerCases record={record} />
          ) : null
        ) : (
          <CustomerCaseUpdates record={record} />
        )}
        <section
          id="getting-there"
          className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed"
        >
          <h2 className="flex items-center gap-2 text-h3">
            <MapPin className="size-5 text-brand-700" />
            Getting there
          </h2>
          {record.arrival ? (
            <div className="mt-3 space-y-2 rounded-lg bg-brand-50 p-4">
              <p>
                {record.arrival.address ||
                  'Exact address has not been provided. Contact the host before travelling.'}
              </p>
              <p>
                Host: {record.arrival.hostName || 'Not recorded'} ·{' '}
                {record.arrival.hostPhone || 'Contact number not provided'}
              </p>
              {record.arrival.latitude != null && record.arrival.longitude != null ? (
                <a
                  className={linkClass}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.arrival.latitude + ',' + record.arrival.longitude)}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open exact location in maps
                </a>
              ) : null}
              <p className="text-meta">
                For confirmed visits only. These are the host’s current arrival details; prices and
                terms above are the accepted booking record.
              </p>
            </div>
          ) : (
            <p className="mt-2">
              Arrival details unlock only for a confirmed visit. A payment attempt alone does not
              grant access.
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed">
          <h2 className="text-h3">Payments</h2>
          {record.payments.map((p) => (
            <div key={p.id} className="mt-3 space-y-2 rounded-lg border border-border p-4">
              <span className={badge}>
                Payment ({p.environment}): {p.state}
              </span>
              <p>
                {p.provider} · {p.purpose} collection
              </p>
              <p className="break-all text-meta">
                Provider order: {p.providerOrderId || 'Not yet assigned'}
              </p>
              <p>
                Expected {p.environment} amount: {money(p.expectedMinor)}
              </p>
              <p>
                Verified {p.environment} capture: {money(p.capturedMinor)}
              </p>
              <p>
                {p.environment} refunds completed: {money(p.refundedMinor)}
              </p>
              <p>Actual bank collection: {money(p.actualBankMinor)}</p>
            </div>
          ))}
          {!record.payments.length ? (
            <p>
              No verified payment record. Historical reported amounts are not proof of collection.
            </p>
          ) : null}
        </section>
        {record.payments.some((p) => p.refunds?.length) ? (
          <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed">
            <h2 className="text-h3">Refund obligations</h2>
            {record.payments.flatMap((p) =>
              (p.refunds || []).map((refund, index) => (
                <p key={`${p.id}-${index}`}>
                  {p.environment} refund: {refund.state} · requested {money(refund.expectedMinor)} ·
                  completed {money(refund.actualMinor)}
                  {p.environment === 'test' ? ' · actual bank refund: ₹0' : ''}
                  {refund.providerRefundId
                    ? ` · provider reference: ${refund.providerRefundId}`
                    : ''}
                  {refund.needsReview
                    ? ' · Reconciliation needs attention; the refund is not yet confirmed.'
                    : ''}
                </p>
              )),
            )}
          </section>
        ) : null}
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7 [&_h2]:mb-4 [&_p]:leading-relaxed">
          <h2 className="text-h3">Accepted rules</h2>
          <p>
            Cancellation: {record.policy.cancellationTier || 'Not recorded'} · Policy{' '}
            {record.policy.version || 'Not recorded'}
          </p>
          <ul className="mt-2 list-inside list-disc">
            {record.policy.houseRules.map((rule, index) => (
              <li key={index}>{rule}</li>
            ))}
          </ul>
        </section>
        <details className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 sm:p-7">
          <summary className="min-h-11 cursor-pointer font-semibold">Order timeline</summary>
          <ol className="mt-2 list-inside list-disc">
            {record.events.map((event, index) => (
              <li key={index}>
                {event.kind.replaceAll('_', ' ')} · {time(event.at, record.timeZone)}
              </li>
            ))}
          </ol>
          {!record.events.length ? (
            <p>No order events were recorded for this historical booking.</p>
          ) : null}
        </details>
      </div>
    </article>
  );
}
