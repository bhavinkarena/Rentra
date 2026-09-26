'use client';
import RentraLoader from '@/components/ui/rentra-loader';
import CheckboxCard from '@/components/ui/checkbox-card';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { Info, Lock } from 'lucide-react';
import { useBookingQuote } from './BookingQuoteProvider';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { clockTime } from '@/lib/domain/checkout-display';

const cta =
  'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50';

/**
 * Price, then the terms that come with it, then the one action — in that
 * order, so the total is read before anything is committed to. The tick-box
 * is the review step: it records which exact quote the guest looked at, and
 * any change to dates, guests or price clears it.
 */
export default function QuoteSummary({ compact = false, onChooseDates }) {
  const {
    quote,
    error,
    loading,
    retry,
    notice,
    conflicts,
    accepted,
    accept,
    unaccept,
    isCustomer,
    login,
    loginError,
    loggingIn,
  } = useBookingQuote();
  // Remembers which quote the guest tried to continue with, so a fresh quote starts clean.
  const [promptedQuote, setPromptedQuote] = useState(null);
  const tick = useRef(null);
  const missingTick = Boolean(quote) && promptedQuote === quote && !accepted;
  function requireTick(event) {
    if (accepted) return;
    event.preventDefault();
    setPromptedQuote(quote);
    tick.current?.focus();
  }
  // A single visit's hours already sit in the date fields of the compact card.
  const showVisits = quote && (!compact || quote.visits.length > 1);
  return (
    <div className="mt-3" aria-live="polite">
      {notice ? (
        <p className="mb-3 flex items-start gap-2 rounded-lg bg-info-bg p-2.5 text-xs text-ink-800">
          <Info className="mt-px size-3.5 shrink-0 text-info" aria-hidden="true" />
          {notice}
        </p>
      ) : null}
      {loading ? (
        <RentraLoader label="Checking availability and the latest price" className="my-4" />
      ) : null}
      {error ? (
        <>
          <p role="alert" className="text-danger">
            {error}
          </p>
          <ul>
            {conflicts.map((conflict, i) => (
              <li key={i}>
                {formatLocalDate(conflict.date)} needs attention. Remove it or choose another date.
              </li>
            ))}
          </ul>
          <button type="button" onClick={retry} className="min-h-11 text-brand-700 underline">
            Try again
          </button>
        </>
      ) : null}
      {!quote && !error && !loading ? (
        <>
          {onChooseDates && (
            <button type="button" onClick={onChooseDates} className={cta}>
              Choose dates
            </button>
          )}
          <p className="mt-2 text-center text-xs text-ink-500">Choose dates to see your total.</p>
        </>
      ) : null}
      {quote ? (
        <>
          {showVisits ? (
            <details className="mb-3 border-b border-border pb-2" open={compact ? undefined : true}>
              <summary className="min-h-10 cursor-pointer py-2 text-sm font-semibold text-ink-700">
                {quote.visits.length} visit{quote.visits.length === 1 ? '' : 's'} · View dates &
                hours
              </summary>
              <ul className="mt-1 space-y-2.5 text-meta">
                {quote.visits.map((visit) => (
                  <li key={visit.date} className="flex items-baseline justify-between gap-3">
                    <span>
                      <strong className="font-semibold">{formatLocalDate(visit.date)}</strong>
                      <span className="block text-tiny text-ink-600">
                        {clockTime(visit.startsAt, quote.timeZone)} –{' '}
                        {clockTime(visit.endsAt, quote.timeZone)}
                      </span>
                    </span>
                    <span className="tabular">{formatINRMinor(visit.totalMinor)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          <dl className="space-y-2 text-sm">
            {Object.entries({
              'Rent and extra guests': quote.totals.rentMinor,
              'Platform fee': quote.totals.feeMinor,
            }).map(([label, amount]) => (
              <div key={label} className="flex justify-between gap-3 text-ink-700">
                <dt>{label}</dt>
                <dd className="tabular">{formatINRMinor(amount)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-base font-bold text-ink-900">
              <dt>Total</dt>
              <dd className="tabular" data-quote-total="">
                {formatINRMinor(quote.totals.totalMinor)}
              </dd>
            </div>
          </dl>
          <CheckboxCard
            className="mt-3"
            inputRef={tick}
            checked={accepted}
            invalid={missingTick}
            aria-describedby={missingTick ? 'quote-tick-hint' : undefined}
            onCheckedChange={(checked) => {
              if (checked) accept();
              else unaccept();
            }}
          >
            <span className="block">
              I understand the{' '}
              <strong className="font-semibold text-ink-900">
                {formatINRMinor(quote.totals.depositMinor)} refundable deposit
              </strong>{' '}
              is paid separately.
            </span>
            <span className="mt-0.5 block text-xs text-ink-600">
              Each visit ends at its departure time.
              {quote.visits.length > 1 ? ' Gaps between visits are not included.' : ''}
            </span>
          </CheckboxCard>
          {missingTick ? (
            <p id="quote-tick-hint" role="alert" className="mt-2 text-xs font-medium text-danger">
              Tick the box to confirm you’ve seen the deposit and visit timings.
            </p>
          ) : null}
          {!quote.payment.enabled ? (
            <p className="mt-3 rounded-lg bg-ink-50 p-3 text-meta" role="status">
              Test payments are temporarily unavailable. You can still check dates and save this
              place.
            </p>
          ) : isCustomer === true ? (
            <Link
              href={`/checkout/review/${quote.id}`}
              onClick={requireTick}
              className={`${cta} mt-3`}
            >
              Review booking
            </Link>
          ) : isCustomer === false ? (
            // No tick needed yet: it is asked for again after login, right before checkout.
            <button type="button" onClick={login} disabled={loggingIn} className={`${cta} mt-3`}>
              {loggingIn ? <RentraLoader inverse label="Opening login…" /> : 'Log in to book'}
            </button>
          ) : null}
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-500">
            <Lock className="size-3" aria-hidden="true" />
            You won’t be charged yet
          </p>
        </>
      ) : null}
      {loginError ? (
        <p role="alert" className="mt-3 text-danger">
          {loginError}
        </p>
      ) : null}
    </div>
  );
}
