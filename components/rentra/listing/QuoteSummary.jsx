'use client';
import Link from 'next/link';
import { useBookingQuote } from './BookingQuoteProvider';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';

export default function QuoteSummary() {
  const { quote, error, loading, retry, notice, conflicts, accepted, accept, isCustomer, login, loginError, loggingIn } = useBookingQuote();
  return <div className="mt-4" aria-live="polite">
    {notice ? <p className="mb-3 text-meta text-brand-700">{notice}</p> : null}
    {loading ? <p>Checking availability and the latest price…</p> : null}
    {error ? <><p role="alert" className="text-danger">{error}</p><ul>{conflicts.map((conflict, i) => <li key={i}>{formatLocalDate(conflict.date)} needs attention. Remove it or choose another date.</li>)}</ul><button type="button" onClick={retry} className="min-h-11 text-brand-700 underline">Try again</button></> : null}
    {!quote && !error && !loading ? <p>Choose dates to see your total.</p> : null}
    {quote ? <>
      <ul className="space-y-3 text-meta">{quote.visits.map(visit => <li key={visit.date} className="border-b border-border pb-3"><strong>{formatLocalDate(visit.date)}</strong><p className="text-tiny text-ink-600">{new Date(visit.startsAt).toLocaleString('en-IN', { timeZone: quote.timeZone, dateStyle: 'medium', timeStyle: 'short' })} – {new Date(visit.endsAt).toLocaleString('en-IN', { timeZone: quote.timeZone, dateStyle: 'medium', timeStyle: 'short' })} IST</p><p>{formatINRMinor(visit.totalMinor)} including platform fee</p></li>)}</ul>
      <dl className="mt-4 space-y-3 text-meta">{Object.entries({ 'Rent and extra guests': quote.totals.rentMinor, 'Platform fee': quote.totals.feeMinor, 'Total for selected visits': quote.totals.totalMinor }).map(([label, amount]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular" data-quote-total={label === 'Total for selected visits' ? '' : undefined}>{formatINRMinor(amount)}</dd></div>)}</dl>
      <p className="mt-4 rounded-md bg-ink-50 p-3 text-meta">Refundable deposit, separate: <strong>{formatINRMinor(quote.totals.depositMinor)}</strong></p>
      <p className="mt-3 text-tiny text-ink-600">Each visit ends at its listed departure time. Time between visits is not included. Reviewing does not reserve dates or take payment.</p>
      <button type="button" onClick={accept} className="mt-4 min-h-11 w-full rounded-md bg-brand-600 px-4 text-white">{accepted ? 'Booking details reviewed' : 'Review booking'}</button>
      {accepted ? <div className="mt-3 rounded-md bg-brand-50 p-3 text-meta"><p>Review the contact details and booking terms before test payment.</p>{isCustomer === true ? <Link href={`/checkout/review/${quote.id}`} className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline">Continue to checkout</Link> : null}{isCustomer === false ? <button type="button" onClick={login} disabled={loggingIn} className="min-h-11 font-semibold text-brand-700 underline">{loggingIn ? 'Opening login…' : 'Continue with login'}</button> : null}</div> : null}
    </> : null}
    {loginError ? <p role="alert" className="mt-3 text-danger">{loginError}</p> : null}
  </div>;
}
