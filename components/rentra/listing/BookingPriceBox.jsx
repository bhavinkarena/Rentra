'use client';

import { useBookingQuote } from './BookingQuoteProvider';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';

export default function BookingPriceBox() {
  const { quote, error, loading, guests, setGuests, retry, isCustomer, login, loginError, loggingIn } = useBookingQuote();
  return <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
    <h2 className="text-h3">Your booking estimate</h2>
    <label className="mt-4 block text-meta font-semibold">Guests per visit<input type="number" min="1" max="500" value={guests} onChange={(event) => setGuests(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-md border border-border px-3" /></label>
    <div aria-live="polite" className="mt-4">
      {loading ? <p className="text-meta text-ink-600">Checking availability and the latest price…</p> : null}
      {error ? <><p className="text-meta text-danger">{error}</p><button onClick={retry} className="min-h-11 text-meta text-brand-700 underline">Try again</button></> : null}
      {!quote && !error && !loading ? <p className="text-meta text-ink-600">Choose an available date to see your total.</p> : null}
      {quote ? <>
        <ul className="space-y-2 text-meta">{quote.visits.map((visit) => <li key={visit.date}><strong>{formatLocalDate(visit.date)}</strong><p className="text-tiny text-ink-600">{new Date(visit.startsAt).toLocaleString('en-IN', { timeZone: quote.timeZone, dateStyle: 'medium', timeStyle: 'short' })} – {new Date(visit.endsAt).toLocaleString('en-IN', { timeZone: quote.timeZone, dateStyle: 'medium', timeStyle: 'short' })} IST</p></li>)}</ul>
        <dl className="mt-3 space-y-3 text-meta">{Object.entries({ 'Rent + extra guests': quote.totals.rentMinor, 'Platform fee (8%)': quote.totals.feeMinor, Brokerage: 0, 'Booking total': quote.totals.totalMinor, 'Deposit, separate': quote.totals.depositMinor, 'Planned test payment': quote.payment.expectedMinor, 'Actual money collected': 0 }).map(([label, amount]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular">{formatINRMinor(amount)}</dd></div>)}</dl>
        <p className="mt-4 text-tiny text-ink-600">{quote.payment.enabled ? 'Razorpay Test mode uses no real bank money.' : 'Online payment attempts are currently paused.'} Availability is rechecked when booking.</p>
      </> : null}
    </div>
    {loginError ? <p role="alert" className="mt-3 text-meta text-danger">{loginError}</p> : null}
    {!isCustomer ? <button onClick={login} disabled={!quote || loading || loggingIn} className="mt-4 min-h-12 w-full rounded-md bg-brand-600 px-4 text-meta font-semibold text-white disabled:opacity-50">{loggingIn ? 'Opening login…' : 'Log in with these dates'}</button> : null}
    <button disabled className="mt-4 min-h-12 w-full rounded-md bg-ink-100 px-4 text-meta font-semibold text-ink-600">Online booking is not available yet</button>
  </div>;
}
