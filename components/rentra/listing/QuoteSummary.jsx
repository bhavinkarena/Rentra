'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import Link from 'next/link';
import { useBookingQuote } from './BookingQuoteProvider';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';

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
    isCustomer,
    login,
    loginError,
    loggingIn,
  } = useBookingQuote();
  return (
    <div className="mt-4" aria-live="polite">
      {notice ? <p className="mb-3 text-meta text-brand-700">{notice}</p> : null}
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
            <button
              type="button"
              onClick={onChooseDates}
              className="min-h-12 w-full rounded-lg bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700"
            >
              Choose dates
            </button>
          )}
          <p className="mt-3 text-center text-xs text-ink-500">Choose dates to see your total.</p>
        </>
      ) : null}
      {quote ? (
        <>
          {!accepted ? (
            <button
              type="button"
              onClick={accept}
              disabled={!quote.payment.enabled}
              className="min-h-12 w-full rounded-lg bg-brand-600 px-4 text-white disabled:opacity-50"
            >
              Review booking
            </button>
          ) : null}
          {accepted && quote.payment.enabled ? (
            <div>
              {isCustomer === true ? (
                <Link
                  href={`/checkout/review/${quote.id}`}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-lg bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700"
                >
                  Continue to checkout
                </Link>
              ) : null}
              {isCustomer === false ? (
                <button
                  type="button"
                  onClick={login}
                  disabled={loggingIn}
                  className="min-h-12 w-full rounded-lg bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700"
                >
                  {loggingIn ? <RentraLoader label="Opening login…" /> : 'Continue with login'}
                </button>
              ) : null}
            </div>
          ) : null}

          <p className="mt-3 mb-5 text-center text-xs text-ink-500">
            Reviewing won’t reserve dates or take payment.
          </p>
          <details className="mb-4 border-b border-border pb-3" open={compact ? undefined : true}>
            <summary className="min-h-11 cursor-pointer text-sm font-semibold text-ink-700">
              {quote.visits.length} visit{quote.visits.length === 1 ? '' : 's'} · View dates & hours
            </summary>
            <ul className="mt-2 space-y-3 text-meta">
              {quote.visits.map((visit) => (
                <li key={visit.date} className="border-b border-border pb-3">
                  <strong>{formatLocalDate(visit.date)}</strong>
                  <p className="text-tiny text-ink-600">
                    {new Date(visit.startsAt).toLocaleString('en-IN', {
                      timeZone: quote.timeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    –{' '}
                    {new Date(visit.endsAt).toLocaleString('en-IN', {
                      timeZone: quote.timeZone,
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}{' '}
                    IST
                  </p>
                  <p>{formatINRMinor(visit.totalMinor)} including platform fee</p>
                </li>
              ))}
            </ul>
          </details>
          <dl className="mt-4 space-y-3 text-meta">
            {Object.entries({
              'Rent and extra guests': quote.totals.rentMinor,
              'Platform fee': quote.totals.feeMinor,
            }).map(([label, amount]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt>{label}</dt>
                <dd className="font-semibold tabular">{formatINRMinor(amount)}</dd>
              </div>
            ))}
            <div className="flex items-center justify-between gap-3 border-t border-border pt-5 text-lg font-semibold">
              <dt>Total</dt>
              <dd className="tabular" data-quote-total="">
                {formatINRMinor(quote.totals.totalMinor)}
              </dd>
            </div>
          </dl>
          <p className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ink-50 p-3 text-xs">
            Refundable deposit (separate){' '}
            <strong>{formatINRMinor(quote.totals.depositMinor)}</strong>
          </p>
          <p className="mt-3 text-tiny text-ink-600">
            Each visit ends at its departure time. Gaps between visits are not included.
          </p>
          {!quote.payment.enabled ? (
            <p className="mt-3 rounded-md bg-ink-50 p-3 text-meta" role="status">
              Test payments are temporarily unavailable. You can still check dates and save this
              place.
            </p>
          ) : null}
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
