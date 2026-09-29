import Link from '@/components/navigation/NavigationLink';
import {
  CalendarDays,
  CalendarPlus,
  Check,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  LifeBuoy,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Repeat,
  ScrollText,
  Star,
  User,
  Users,
  Wallet,
  Download,
  CircleX,
  Scale,
  PenLine,
} from 'lucide-react';
import { randomUUID } from 'node:crypto';
import { bookingTime as time } from '@/lib/domain/booking-record';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { SLOTS } from '@/lib/domain/pricing';
import { BackLink } from '@/components/ui/page-header';
import { VisitLifecycle } from './VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import { CustomerCaseUpdates, OwnerCases } from '@/components/booking/CasePanels';

import {
  linkClass,
  PropertyPhoto,
  totalPrice,
  displayMoney as money,
  StateBadge,
} from './BookingDisplay';
export { BookingHistory } from './BookingHistory';

const card = 'rounded-lg border border-border bg-card p-5 sm:p-6';
const heading = 'mb-4 flex items-center gap-2 text-h4';
const headingIcon = 'size-5 text-brand-700';

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
const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const words = (value) => value.replaceAll('_', ' ');

/** Label on the left, value on the right; `strong` for totals. */
function Row({ label, children, strong = false, muted = false }) {
  return (
    <div
      className={`flex items-baseline justify-between gap-4 py-1.5 ${strong ? 'mt-1 border-t border-border pt-3 font-semibold text-ink-900' : muted ? 'text-ink-500' : 'text-ink-700'}`}
    >
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 text-right tabular">{children}</dd>
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
  const guests = Math.max(0, ...record.visits.map((v) => v.guests ?? 0));
  // Every action a guest (or owner) can take, as one row of icon pills.
  const actions = [
    [`${base}/${record.id}/calendar`, CalendarPlus, 'Add to calendar (.ics)', true],
    [`${base}/${record.id}/summary`, Download, 'Booking summary (.txt)', true],
    ...(operational
      ? [
          [
            base === '/admin/bookings' ? '/admin/reviews' : '/partner/reviews',
            Star,
            'Customer reviews',
          ],
        ]
      : [
          [`/support/new?order=${record.id}`, LifeBuoy, 'Get booking help'],
          [`/support/new?order=${record.id}&topic=change`, PenLine, 'Ask about a change'],
          [`/bookings/${record.id}/again`, Repeat, 'Book again'],
          [`/bookings/${record.id}/reviews`, Star, 'Reviews'],
          ...(record.payments.some((p) => p.recoverable)
            ? [[`/checkout/${record.id}`, RefreshCw, 'View checkout and payment recovery']]
            : []),
          ...(test ? [[`/bookings/${record.id}/cancel`, CircleX, 'Cancel visits']] : []),
        ]),
    [
      `${operational ? '/partner/disputes' : '/disputes'}/new?order=${record.id}`,
      Scale,
      'Open a dispute for this booking',
    ],
  ];
  return (
    <article className="mx-auto max-w-5xl space-y-6 wrap-break-word">
      <BackLink href={listHref}>Back to bookings</BackLink>
      {operational && record.relationships && (
        <nav aria-label="Related records" className="flex flex-wrap gap-2">
          <Link
            className={linkClass}
            href={`/partner/listings/${record.relationships.propertyId}/overview`}
          >
            Property overview
          </Link>
          <Link className={linkClass} href={`/partner/support/new?orderId=${record.id}`}>
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
      <header className="overflow-hidden rounded-xl border border-border bg-card">
        <PropertyPhoto photo={record.photo} title={record.title} hero />
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <StateBadge state={record.state} />
              <h1 className="mt-3 text-h1">{record.title}</h1>
              <p className="mt-2 font-mono text-tiny break-all text-ink-500">
                {confirmed ? (test ? 'Test booking' : 'Your reservation') : 'Booking status'} ·{' '}
                {record.reference}
              </p>
            </div>
            <div className="rounded-lg bg-brand-50 px-5 py-4">
              <p className="text-tiny text-ink-600">Accepted booking total</p>
              <p className="mt-1 text-h3 font-bold text-brand-800 tabular">
                {money(totalPrice(record))}
              </p>
              <p className="mt-1 text-tiny text-ink-500">Deposit shown separately below</p>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-border pt-4 text-meta text-ink-600">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-4 text-brand-700" aria-hidden="true" />
              {shortDate(record.visits[0]?.date)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Users className="size-4 text-brand-700" aria-hidden="true" />
              {plural(record.visits.length, 'visit')}
              {guests ? ` · ${plural(guests, 'guest')}` : ''}
            </span>
            <a
              href="#getting-there"
              className="inline-flex min-h-6 items-center gap-2 hover:text-brand-700"
            >
              <MapPin className="size-4 text-brand-700" aria-hidden="true" />
              Arrival details below
            </a>
          </div>
        </div>
      </header>
      {test ? (
        <p className="flex items-start gap-3 rounded-lg border border-info/20 bg-info-bg p-4 text-meta text-ink-800">
          <FlaskConical className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          Razorpay Test booking. No actual bank money was collected by the Test gateway. This record
          is not a real-money receipt.
        </p>
      ) : null}
      {/* One swipeable row on phones; wraps from sm. */}
      <nav
        aria-label="Manage booking"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&>*]:shrink-0"
      >
        {actions.map(([href, Icon, label, file]) => {
          const content = (
            <>
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </>
          );
          return file ? (
            <a key={href} className={linkClass} href={href}>
              {content}
            </a>
          ) : (
            <Link key={href} className={linkClass} href={href}>
              {content}
            </Link>
          );
        })}
      </nav>
      {new Set(record.visits.map((v) => v.state)).size > 1 ? (
        <p className="rounded-lg bg-warning-bg p-3 text-meta text-ink-800">
          Mixed visit statuses — check each visit below.
        </p>
      ) : null}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className={card}>
          <h2 className={heading}>
            <User className={headingIcon} aria-hidden="true" />
            Customer and purpose
          </h2>
          <ul className="space-y-2 text-ink-700">
            <li className="flex items-center gap-3">
              <User className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
              {record.contact.withheld
                ? 'Contact hidden — no active visit requires fulfillment'
                : record.contact.name || 'Name not recorded'}
            </li>
            <li className="flex items-center gap-3">
              <Phone className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
              {record.contact.phone || 'Phone not recorded'}
            </li>
            <li className="flex items-center gap-3">
              <MessageSquare className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
              {record.purpose || 'Purpose not recorded'}
            </li>
          </ul>
        </section>
        <section className={card}>
          <h2 className={heading}>
            <Wallet className={headingIcon} aria-hidden="true" />
            Price breakdown
          </h2>
          <dl className="text-meta">
            <Row label="Rent">{money(record.rentMinor)}</Row>
            <Row label="Platform fee">{money(record.feeMinor)}</Row>
            <Row label="Total" strong>
              {money(totalPrice(record))}
            </Row>
            <Row label="Separate deposit" muted>
              {money(record.depositMinor)}
            </Row>
          </dl>
        </section>
        <section className={`lg:col-span-2 ${card}`}>
          <h2 className="flex items-center gap-2 text-h4">
            <CalendarDays className={headingIcon} aria-hidden="true" />
            Your visits
          </h2>
          <p className="mt-1 text-meta text-ink-600">
            Times in {record.timeZone}. Separate visits do not include access between dates.
          </p>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {record.visits.map((v) => (
              <li key={v.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">
                      {v.date ? formatLocalDate(v.date, { year: 'numeric' }) : 'Date not recorded'}{' '}
                      · {SLOTS[v.slot]?.label ?? words(v.slot)} · {plural(v.guests, 'guest')}
                    </h3>
                    <p className="font-mono text-tiny break-all text-ink-500">
                      Visit {v.reference}
                    </p>
                  </div>
                  <StateBadge state={v.state} />
                </div>
                {operational && v.operation && (
                  <p className="text-sm font-semibold">{v.operation.label}</p>
                )}
                <dl className="grid gap-x-8 text-meta sm:grid-cols-2">
                  <Row label="Arrival">{time(v.startsAt, record.timeZone)}</Row>
                  <Row label="Departure">{time(v.endsAt, record.timeZone)}</Row>
                  <Row label="Rent + fee">
                    {money(v.rentMinor)} + {money(v.feeMinor)}
                  </Row>
                  <Row label="Separate deposit" muted>
                    {money(v.depositMinor)}
                  </Row>
                </dl>
                {v.timeline.length ? (
                  <ol
                    aria-label={`Timeline for ${v.reference}`}
                    className="flex flex-wrap gap-x-4 gap-y-1 text-tiny text-ink-500"
                  >
                    {v.timeline.map((event, index) => (
                      <li key={index} className="inline-flex items-center gap-1">
                        <Check className="size-3 text-brand-600" aria-hidden="true" />
                        <span className="first-letter:uppercase">{words(event.kind)}</span>{' '}
                        {time(event.at, record.timeZone)}
                      </li>
                    ))}
                  </ol>
                ) : null}
                {record.arrival?.visitIds.includes(v.id) ? (
                  <p className="text-meta text-ink-600">
                    Confirmed visit: arrival details below apply.
                  </p>
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
        <section id="getting-there" className={`scroll-mt-24 ${card}`}>
          <h2 className={heading}>
            <MapPin className={headingIcon} aria-hidden="true" />
            Getting there
          </h2>
          {record.arrival ? (
            <div className="space-y-2 rounded-lg bg-brand-50 p-4 text-ink-800">
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
                  <ExternalLink className="size-4" aria-hidden="true" />
                  Open exact location in maps
                </a>
              ) : null}
              <p className="text-meta text-ink-600">
                For confirmed visits only. These are the host’s current arrival details; prices and
                terms above are the accepted booking record.
              </p>
            </div>
          ) : (
            <p className="text-ink-600">
              Arrival details unlock only for a confirmed visit. A payment attempt alone does not
              grant access.
            </p>
          )}
        </section>
        <section className={card}>
          <h2 className={heading}>
            <Wallet className={headingIcon} aria-hidden="true" />
            Payments
          </h2>
          {record.payments.map((p) => (
            <div key={p.id} className="mt-3 rounded-lg border border-border p-4 first-of-type:mt-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-meta font-semibold capitalize">
                  {p.provider} · {p.purpose} collection
                </span>
                <StateBadge state={p.state}>
                  Payment ({p.environment}): {words(p.state)}
                </StateBadge>
              </div>
              <dl className="mt-2 text-meta">
                <Row label="Provider order">
                  <span className="font-mono text-tiny">
                    {p.providerOrderId || 'Not yet assigned'}
                  </span>
                </Row>
                <Row label={`Expected ${p.environment} amount`}>{money(p.expectedMinor)}</Row>
                <Row label={`Verified ${p.environment} capture`}>{money(p.capturedMinor)}</Row>
                <Row
                  label={`${p.environment[0].toUpperCase()}${p.environment.slice(1)} refunds completed`}
                >
                  {money(p.refundedMinor)}
                </Row>
                <Row label="Actual bank collection" strong>
                  {money(p.actualBankMinor)}
                </Row>
              </dl>
            </div>
          ))}
          {!record.payments.length ? (
            <p className="text-ink-600">
              No verified payment record. Historical reported amounts are not proof of collection.
            </p>
          ) : null}
        </section>
        {record.payments.some((p) => p.refunds?.length) ? (
          <section className={card}>
            <h2 className={heading}>
              <RefreshCw className={headingIcon} aria-hidden="true" />
              Refund obligations
            </h2>
            {record.payments.flatMap((p) =>
              (p.refunds || []).map((refund, index) => (
                <p key={`${p.id}-${index}`} className="text-meta">
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
        <section className={card}>
          <h2 className={heading}>
            <ScrollText className={headingIcon} aria-hidden="true" />
            Accepted rules
          </h2>
          <p className="text-meta text-ink-700">
            Cancellation:{' '}
            <span className="capitalize">{record.policy.cancellationTier || 'Not recorded'}</span> ·
            Policy {record.policy.version || 'Not recorded'}
          </p>
          {record.policy.publications && (
            <nav aria-label="Accepted public policies" className="my-3 flex flex-wrap gap-2">
              {Object.entries(record.policy.publications).map(([kind, p]) => (
                <Link key={kind} className={linkClass} href={p.href}>
                  Accepted {kind} version
                </Link>
              ))}
            </nav>
          )}
          <ul className="mt-3 space-y-2">
            {record.policy.houseRules.map((rule, index) => (
              <li key={index} className="flex items-start gap-2 text-meta text-ink-700">
                <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                {rule}
              </li>
            ))}
          </ul>
        </section>
        <details className={`group lg:col-span-2 ${card}`}>
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 font-semibold [&::-webkit-details-marker]:hidden">
            Order timeline
            <ChevronDown
              className="size-4 transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <ol className="mt-3 space-y-1.5 text-meta text-ink-700">
            {record.events.map((event, index) => (
              <li key={index} className="flex items-center gap-2">
                <Check className="size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                <span className="first-letter:uppercase">{words(event.kind)}</span>
                <span className="text-ink-500">· {time(event.at, record.timeZone)}</span>
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
