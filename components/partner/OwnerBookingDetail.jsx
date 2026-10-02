import { randomUUID } from 'node:crypto';
import Link from '@/components/navigation/NavigationLink';
import { VisitLifecycle } from '@/components/customer/VisitLifecycle';
import { VisitEvidence } from '@/components/booking/VisitEvidence';
import BookingHelp from './BookingHelp';
import { OwnerCases } from '@/components/booking/CasePanels';
import BookingNote from './BookingNote';
import { CreateCaseForm } from '@/components/booking/CaseForms';
import { displayMoney as money } from '@/lib/domain/display-money';
import { EARNINGS_NOTICE } from '@/lib/domain/owner-earnings';
const time = (value) =>
  value
    ? new Date(value).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Visit hours need Rentra';
const card = 'rounded-xl border bg-card p-5 sm:p-6 space-y-4';
export default function OwnerBookingDetail({ record, listHref = '/partner/bookings' }) {
  const next =
    record.visits.find((v) => v.operation?.action) ||
    record.visits.find((v) => v.state === 'confirmed') ||
    record.visits[0];
  const phone = record.contact?.phone,
    digits = phone?.replace(/\D/g, '');
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link className="inline-flex min-h-11 underline" href={listHref}>
        Back to bookings
      </Link>
      <header className={card}>
        <p className="text-tiny text-ink-600">{record.reference}</p>
        <h1 className="text-h1">{record.title}</h1>
        <p className="text-h3">
          {next?.operation?.label || 'Booking visit'} · {time(next?.startsAt)}
        </p>
        {next?.operation?.action && (
          <VisitLifecycle
            key={next.id + '-' + next.version}
            visit={next}
            requestKey={randomUUID()}
          />
        )}
        <p className="text-meta text-ink-600">
          Guests book instantly after payment succeeds. To cancel a paid booking, ask Rentra.
        </p>
      </header>
      <section className={card}>
        <h2 className="text-h3">Your guest</h2>
        <p>
          {record.contact?.name || 'Guest contact hidden'} ·{' '}
          {Math.max(0, ...record.visits.map((v) => v.guests || 0))} guests
        </p>
        {phone ? (
          <div className="flex gap-3">
            <a className="min-h-11 rounded-md border p-3" href={`tel:${phone}`}>
              Call guest
            </a>
            <a
              className="min-h-11 rounded-md border p-3"
              href={`https://wa.me/${digits.length === 10 ? '91' : ''}${digits}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          </div>
        ) : (
          <p className="text-meta">
            Contact is available during the visit and for 7 days after completion.
          </p>
        )}
        {record.purpose && <p>{record.purpose}</p>}
        <BookingNote record={record} />
      </section>
      <section className={card}>
        <h2 className="text-h3">Visits</h2>
        <ul className="divide-y">
          {record.visits.map((v) => (
            <li key={v.id} id={`visit-${v.id}`} className="py-4 space-y-3">
              <h3 className="font-semibold">
                {v.label || v.date} · {v.guests} guests
              </h3>
              <p>
                {time(v.startsAt)} · {time(v.endsAt)}
              </p>
              <p>
                {{
                  confirmed: 'Upcoming',
                  handed_over: 'Checked in',
                  returned: 'Checked out',
                  completed: 'Completed',
                  cancelled: 'Cancelled',
                  no_show: 'No show',
                  disputed: 'With Rentra',
                }[v.state] || v.state}
              </p>
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
                <VisitLifecycle key={v.id + '-' + v.version} visit={v} requestKey={randomUUID()} />
              )}
              <VisitEvidence
                visit={v}
                orderId={record.id}
                base="/partner/bookings"
                timeZone={record.timeZone}
              />
            </li>
          ))}
        </ul>
      </section>
      <section className={card}>
        <h2 className="text-h3">Booked rent for this booking</h2>
        <p className="text-h2">{money(record.rentMinor)}</p>
        <p className="text-meta text-ink-600">Cancelled visits are excluded. {EARNINGS_NOTICE}</p>
        {record.earningLines?.map((line, i) => (
          <Link
            key={line.id}
            className="flex min-h-11 items-center text-meta font-semibold text-brand-800 underline"
            href={`/partner/allocations/${line.id}`}
          >
            {record.earningLines.length === 1 ? 'View earning line' : `View earning line ${i + 1}`}
          </Link>
        ))}
        <Link className="inline-flex min-h-11 underline" href="/partner/earnings">
          Open earnings
        </Link>
      </section>
      <BookingHelp record={record} />
      <OwnerCases record={record} />
      <details className={card}>
        <summary className="cursor-pointer font-semibold min-h-11">Guest payment details</summary>
        <p>
          Rent {money(record.rentMinor)} · Rentra guest fee (not your earning){' '}
          {money(record.feeMinor)}
        </p>
        {record.payments.map((p) => (
          <div key={p.id}>
            <p>
              {p.environment === 'test' ? 'Test payment · ' : ''}
              {p.state} · Captured {money(p.capturedMinor || 0)}
            </p>
            <details>
              <summary className="min-h-11 cursor-pointer">Technical details</summary>
              <p>
                {p.provider} · {p.providerOrderId || 'No provider reference'}
              </p>
            </details>
          </div>
        ))}
      </details>
      <details className={card}>
        <summary className="min-h-11 cursor-pointer font-semibold">Accepted rules</summary>
        {record.policy.houseRules?.map((r, i) => (
          <p key={i}>{r}</p>
        ))}
      </details>
      <details className={card}>
        <summary className="min-h-11 cursor-pointer font-semibold">Timeline and downloads</summary>
        {record.events.map((e, i) => (
          <p key={i}>
            {e.kind.replaceAll('_', ' ')} · {time(e.at)}
          </p>
        ))}
        <div className="flex gap-4">
          <Link className="min-h-11 underline" href={`/partner/bookings/${record.id}/calendar`}>
            Download calendar (.ics)
          </Link>
          <Link className="min-h-11 underline" href={`/partner/bookings/${record.id}/summary`}>
            Download summary
          </Link>
        </div>
      </details>
    </div>
  );
}
