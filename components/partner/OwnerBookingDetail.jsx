/* eslint-disable @next/next/no-img-element -- owner thumbnails come from Cloudinary or seed hosts. */
import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { VisitLifecycle } from '@/components/customer/VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import BookingHelp from './BookingHelp';
import { OwnerCases } from '@/components/booking/CasePanels';
import BookingNote from './BookingNote';
import CopyValue from './CopyValue';
import { CreateCaseForm } from '@/components/booking/CaseForms';
import { StateBadge } from '@/components/customer/BookingDisplay';
import { displayMoney as money } from '@/lib/domain/display-money';
import { EARNINGS_NOTICE } from '@/lib/domain/owner-earnings';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  MessageCircle,
  Phone,
  Users,
} from 'lucide-react';

const IST = 'Asia/Kolkata';
const time = (value) =>
  value
    ? new Date(value).toLocaleTimeString('en-IN', {
        timeZone: IST,
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;
const stamp = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: IST,
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
const day = (iso, options) =>
  new Date(`${String(iso).slice(0, 10)}T12:00:00+05:30`).toLocaleDateString('en-IN', {
    timeZone: IST,
    ...options,
  });
const sameDay = (a, b) =>
  a &&
  b &&
  new Date(a).toLocaleDateString('en-CA', { timeZone: IST }) ===
    new Date(b).toLocaleDateString('en-CA', { timeZone: IST });
const hours = (v) =>
  v.startsAt
    ? `${time(v.startsAt)} – ${sameDay(v.startsAt, v.endsAt) ? time(v.endsAt) : `${day(v.endsAt, { day: 'numeric', month: 'short' })}, ${time(v.endsAt)}`} IST`
    : 'Visit hours are with Rentra';
const initials = (name) =>
  String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
const EVENT_NAMES = {
  created: 'Booking created',
  confirmed: 'Booking confirmed',
  paid: 'Payment received',
  visits_cancelled: 'Visits cancelled',
  test_refund_processed: 'Test refund processed',
  visit_handover_recorded: 'Check-in recorded',
  visit_return_recorded: 'Check-out recorded',
  visit_complete_recorded: 'Visit completed',
  visit_evidence_recorded: 'Visit photos added',
};
const eventName = (kind) =>
  EVENT_NAMES[kind] ?? kind.charAt(0).toUpperCase() + kind.slice(1).replaceAll('_', ' ');

const card = 'rounded-lg border border-border bg-card';
const button =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md px-4 text-meta font-semibold transition-colors';

function Section({ title, action, children, className = '' }) {
  return (
    <section className={`${card} ${className}`}>
      <header className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h3 className="text-meta font-semibold text-ink-900">{title}</h3>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Disclosure({ title, children }) {
  return (
    <details className={`group ${card}`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-meta font-semibold text-ink-900 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown
          className="size-4 text-ink-500 transition-transform duration-150 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border p-5">{children}</div>
    </details>
  );
}

export default function OwnerBookingDetail({
  record,
  listHref = '/partner/bookings',
  sheet = false,
}) {
  const next =
    record.visits.find((v) => v.operation?.action) ||
    record.visits.find((v) => v.state === 'confirmed') ||
    record.visits[0];
  const phone = record.contact?.phone,
    digits = phone?.replace(/\D/g, '');
  const guests = Math.max(0, ...record.visits.map((v) => v.guests || 0));
  const Title = sheet ? 'p' : 'h1';
  const live = record.visits.filter((v) => v.state !== 'cancelled');
  const facts = [
    [
      CalendarDays,
      'Visit',
      next ? day(next.date, { weekday: 'short', day: 'numeric', month: 'short' }) : '—',
    ],
    [
      Clock,
      'Hours',
      next?.startsAt ? `${time(next.startsAt)} – ${time(next.endsAt)}` : 'With Rentra',
    ],
    [Users, 'Guests', String(guests)],
    [
      Building2,
      'Visits',
      `${live.length}${live.length !== record.visits.length ? ` of ${record.visits.length}` : ''}`,
    ],
  ];

  return (
    <div className={`@container space-y-5 ${sheet ? '' : 'mx-auto max-w-6xl pb-16 md:pb-0'}`}>
      {sheet ? null : (
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-meta font-semibold text-brand-700"
          href={listHref}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Bookings
        </Link>
      )}

      {/* Summary */}
      <header className={`${card} overflow-hidden`}>
        <div className="flex items-start gap-4 p-5">
          {record.photo?.url ? (
            <img
              src={record.photo.url.replace(
                '/image/upload/',
                '/image/upload/c_fill,w_160,h_160,f_auto,q_auto/',
              )}
              alt=""
              className="size-16 shrink-0 rounded-md bg-ink-100 object-cover"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-16 shrink-0 place-items-center rounded-md bg-brand-50 text-brand-700"
            >
              <Building2 className="size-6" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StateBadge state={record.state} />
              {record.payments.some((p) => p.environment === 'test') ? (
                <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-tiny font-semibold text-ink-700">
                  Test booking
                </span>
              ) : null}
            </div>
            <Title
              className={`mt-2 font-semibold text-ink-900 ${sheet ? 'text-h3' : 'text-h1 leading-tight tracking-[-0.03em]'}`}
            >
              {record.title}
            </Title>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-tiny text-ink-500">
              <CopyValue value={record.reference} />
              {record.createdAt ? <span>Booked {stamp(record.createdAt)}</span> : null}
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 border-t border-border @2xl:grid-cols-4">
          {facts.map(([Icon, name, value], i) => (
            <div
              key={name}
              className={`flex items-center gap-3 px-5 py-3 ${i % 2 ? 'border-l border-border' : ''} ${i > 1 ? 'border-t border-border @2xl:border-t-0' : ''} ${i === 2 ? '@2xl:border-l' : ''}`}
            >
              <Icon className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <div className="min-w-0">
                <dt className="text-tiny text-ink-500">{name}</dt>
                <dd className="text-meta font-semibold text-ink-900 tabular">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
        <p className="border-t border-border bg-ink-25 px-5 py-2.5 text-tiny text-ink-600">
          Guests book instantly after payment succeeds. To cancel a paid booking, ask Rentra.
        </p>
      </header>

      {/* Next step */}
      {next?.operation?.action && (
        <section
          aria-label="Next step"
          className="space-y-3 rounded-lg border border-brand-200 bg-brand-50 p-5"
        >
          <div>
            <p className="text-tiny font-semibold text-brand-700">Next step</p>
            <p className="text-h4 font-semibold text-ink-900">
              {next.operation.label}
              <span className="font-normal text-ink-600"> · {hours(next)}</span>
            </p>
          </div>
          <VisitLifecycle
            key={next.id + '-' + next.version}
            sticky
            visit={next}
            requestKey={randomUUID()}
          />
        </section>
      )}

      <div className="grid items-start gap-5 @4xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          {/* Visits */}
          <Section
            title={`Visits (${record.visits.length})`}
            action={
              <Link
                href={`/partner/bookings/${record.id}/calendar`}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-tiny font-semibold text-brand-700 hover:bg-brand-50"
              >
                <Download className="size-3.5" aria-hidden="true" />
                Add to calendar
              </Link>
            }
          >
            <ol className="-my-1 divide-y divide-border">
              {record.visits.map((v) => (
                <li key={v.id} id={`visit-${v.id}`} className="space-y-3 py-4 first:pt-1 last:pb-1">
                  <div className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className={`flex w-12 shrink-0 flex-col items-center rounded-md border py-1.5 ${v.state === 'cancelled' ? 'border-border text-ink-400' : 'border-brand-200 bg-brand-50 text-brand-800'}`}
                    >
                      <span className="text-tiny font-semibold uppercase">
                        {day(v.date, { month: 'short' })}
                      </span>
                      <span className="text-h4 leading-none font-bold tabular">
                        {day(v.date, { day: 'numeric' })}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink-900">
                          {v.label ||
                            day(v.date, { weekday: 'long', day: 'numeric', month: 'long' })}
                        </p>
                        <StateBadge state={v.state} />
                      </div>
                      <p className="mt-0.5 text-meta text-ink-600">
                        {hours(v)} · {v.guests} guests
                        {v.resource ? ` · ${v.resource.name}` : ''}
                      </p>
                      <p className="mt-0.5 font-mono text-tiny text-ink-400">{v.reference}</p>
                    </div>
                    {v.rentMinor != null ? (
                      <p className="shrink-0 text-meta font-semibold text-ink-900 tabular">
                        {money(v.rentMinor)}
                      </p>
                    ) : null}
                  </div>
                  {v.noShowEligible && (
                    // BOOK-05/08: an overdue arrival with no check-in opens a pre-filled no-show request.
                    <CreateCaseForm
                      orderId={record.id}
                      visits={[v]}
                      requestKey={randomUUID()}
                      defaultType="no_show"
                      defaultVisitId={v.id}
                      defaultReason={`The guest did not arrive for ${v.label || v.date} (${v.reference}) and no check-in was recorded.`}
                      summary="Guest didn’t arrive"
                    />
                  )}
                  {v.id !== next?.id && v.operation?.action && (
                    <VisitLifecycle
                      key={v.id + '-' + v.version}
                      visit={v}
                      requestKey={randomUUID()}
                    />
                  )}
                  <VisitEvidence
                    visit={v}
                    orderId={record.id}
                    base="/partner/bookings"
                    timeZone={record.timeZone}
                  />
                </li>
              ))}
            </ol>
          </Section>
          <BookingHelp record={record} />
          <OwnerCases record={record} />
        </div>

        <aside className="min-w-0 space-y-5">
          {/* Guest */}
          <Section title="Guest">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-meta font-semibold text-brand-700"
              >
                {initials(record.contact?.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink-900">
                  {record.contact?.name || 'Contact hidden'}
                </p>
                <p className="text-tiny text-ink-500">Up to {guests} guests</p>
              </div>
            </div>
            {phone ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                <a
                  className={`${button} border border-border text-ink-800 hover:border-brand-300 hover:bg-brand-50`}
                  href={`tel:${phone}`}
                >
                  <Phone className="size-4" aria-hidden="true" />
                  Call
                </a>
                <a
                  className={`${button} border border-border text-ink-800 hover:border-brand-300 hover:bg-brand-50`}
                  href={`https://wa.me/${digits.length === 10 ? '91' : ''}${digits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="size-4" aria-hidden="true" />
                  WhatsApp
                </a>
              </div>
            ) : (
              <p className="mt-4 rounded-md bg-ink-25 p-3 text-tiny text-ink-600">
                Contact details open during the visit and for 7 days after it ends.
              </p>
            )}
            {record.purpose ? (
              <p className="mt-4 text-meta text-ink-700">
                <span className="block text-tiny font-semibold text-ink-500">Occasion</span>
                {record.purpose}
              </p>
            ) : null}
            <div className="mt-4 border-t border-border pt-4">
              <BookingNote record={record} />
            </div>
          </Section>

          {/* Money */}
          <Section title="Booked rent">
            <p className="text-h2 leading-none font-semibold text-ink-900 tabular">
              {money(record.rentMinor)}
            </p>
            <p className="mt-2 text-tiny text-ink-500">
              Cancelled visits excluded. {EARNINGS_NOTICE}
            </p>
            <dl className="mt-4 space-y-2 border-t border-border pt-4 text-meta">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-600">Rent</dt>
                <dd className="font-semibold text-ink-900 tabular">{money(record.rentMinor)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-600">Rentra guest fee</dt>
                <dd className="text-ink-700 tabular">{money(record.feeMinor)}</dd>
              </div>
              {record.depositMinor ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-600">Deposit (separate)</dt>
                  <dd className="text-ink-700 tabular">{money(record.depositMinor)}</dd>
                </div>
              ) : null}
            </dl>
            <p className="mt-2 text-tiny text-ink-500">
              The guest fee is Rentra’s, not your earning.
            </p>
            {record.payments.length ? (
              <ul className="mt-4 space-y-2 border-t border-border pt-4">
                {record.payments.map((p) => (
                  <li key={p.id} className="text-meta">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-ink-700">
                        {p.environment === 'test' ? 'Test payment' : 'Payment'}
                      </span>
                      <StateBadge state={p.state} />
                    </div>
                    <p className="text-tiny text-ink-500 tabular">
                      Captured {money(p.capturedMinor || 0)}
                      {p.refundedMinor ? ` · Refunded ${money(p.refundedMinor)}` : ''} ·{' '}
                      {p.provider}
                      {p.providerOrderId ? ` · ${p.providerOrderId}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {record.earningLines?.map((line, i) => (
                <Link
                  key={line.id}
                  className={`${button} border border-border px-3 text-ink-800 hover:bg-ink-50`}
                  href={`/partner/allocations/${line.id}`}
                >
                  {record.earningLines.length === 1 ? 'Earning line' : `Earning line ${i + 1}`}
                </Link>
              ))}
              <Link
                className={`${button} px-3 text-brand-700 hover:bg-brand-50`}
                href="/partner/earnings"
              >
                Open earnings
              </Link>
            </div>
          </Section>

          <Disclosure title="House rules the guest accepted">
            {record.policy.houseRules?.length ? (
              <ul className="list-disc space-y-1.5 pl-5 text-meta text-ink-700">
                {record.policy.houseRules.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-ink-600">No house rules were recorded.</p>
            )}
          </Disclosure>

          <Disclosure title="Activity">
            <ol className="relative space-y-4 border-l border-border pl-5">
              {record.events.map((e, i) => (
                <li key={i} className="relative">
                  <span
                    aria-hidden="true"
                    className="absolute top-1.5 -left-[1.6rem] size-2.5 rounded-full border-2 border-card bg-brand-500"
                  />
                  <p className="text-meta font-semibold text-ink-900">{eventName(e.kind)}</p>
                  <p className="text-tiny text-ink-500">{stamp(e.at)} IST</p>
                </li>
              ))}
            </ol>
            <Link
              className={`${button} mt-4 w-full border border-border text-ink-800 hover:bg-ink-50`}
              href={`/partner/bookings/${record.id}/summary`}
            >
              <Download className="size-4" aria-hidden="true" />
              Download summary
            </Link>
          </Disclosure>
        </aside>
      </div>
    </div>
  );
}
