import Link from 'next/link';
import { ArrowLeft, CalendarDays, MapPin, Wallet, Users, Download, LifeBuoy } from 'lucide-react';
import { randomUUID } from 'node:crypto';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { VisitLifecycle } from './VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import { CustomerCaseUpdates, OwnerCases } from '@/components/booking/CasePanels';

import { linkClass, badge, PropertyPhoto, totalPrice } from './BookingDisplay';
export { BookingHistory } from './BookingHistory';
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
            className="inline-flex min-h-11 items-center underline"
            href={`/partner/support/new?orderId=${record.id}`}
          >
            Contact support about this booking
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
          <Link
            className={linkClass}
            href={`${operational ? '/partner/disputes' : '/disputes'}/new?order=${record.id}`}
          >
            Open a dispute for this booking
          </Link>

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
