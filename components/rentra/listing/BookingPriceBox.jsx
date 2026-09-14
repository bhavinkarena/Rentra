'use client';

import { useBookingQuote } from './BookingQuoteProvider';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import SaveButton from '@/components/rentra/SaveButton';

export default function BookingPriceBox({ rentableId, listingTitle }) {
  const { quote, error, loading, guests, setGuests, retry, date, isCustomer, login, loginError, loggingIn } = useBookingQuote();
  return <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
    <h2 className="text-h3">Price for your visit</h2>
    <p className="mt-2 text-meta text-ink-600">You can check dates and save this place now. Online booking will open in a later release.</p>
    <label className="mt-4 block text-meta font-semibold">Guests per visit<input type="number" min="1" max="500" value={guests} onChange={(event) => setGuests(Number(event.target.value))} className="mt-1 min-h-11 w-full rounded-md border border-border px-3" /></label>
    <div aria-live="polite" className="mt-4">
      {loading ? <p className="text-meta text-ink-600">Checking availability and the latest price…</p> : null}
      {error ? <><p className="text-meta text-danger">{error}</p><button onClick={retry} className="min-h-11 text-meta text-brand-700 underline">Try again</button></> : null}
      {!quote && !error && !loading ? <p className="text-meta text-ink-600">Choose an available date to see your total.</p> : null}
      {quote ? <>
        <ul className="space-y-2 text-meta">{quote.visits.map((visit) => <li key={visit.date}><strong>{formatLocalDate(visit.date)}</strong><p className="text-tiny text-ink-600">{new Date(visit.startsAt).toLocaleString('en-IN', { timeZone: quote.timeZone, dateStyle: 'medium', timeStyle: 'short' })} – {new Date(visit.endsAt).toLocaleString('en-IN', { timeZone: quote.timeZone, dateStyle: 'medium', timeStyle: 'short' })} IST</p></li>)}</ul>
        <dl className="mt-4 space-y-3 border-t border-border pt-4 text-meta">{Object.entries({ 'Rent and extra guests': quote.totals.rentMinor, 'Platform fee (8%)': quote.totals.feeMinor, 'Total for selected visits': quote.totals.totalMinor }).map(([label, amount]) => <div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold tabular">{formatINRMinor(amount)}</dd></div>)}</dl>
        <div className="mt-4 rounded-md bg-ink-50 p-3 text-meta"><div className="flex justify-between gap-3"><span>Refundable deposit, separate</span><strong className="tabular">{formatINRMinor(quote.totals.depositMinor)}</strong></div><p className="mt-1 text-tiny text-ink-600">The deposit is not included in the visit total.</p></div>
        <p className="mt-4 text-tiny text-ink-600">This is a current estimate. Availability and price will be checked again when online booking opens.</p>
      </> : null}
    </div>
    <div id="booking-save" className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-brand-50 text-brand-800"><SaveButton rentableId={rentableId} listingTitle={listingTitle} variant="inline" /></div>
    {loginError ? <p role="alert" className="mt-3 text-meta text-danger">{loginError}</p> : null}
    {/* Login is offered as a benefit, never as booking progress. It is also the
        only entry to Part 05's signed selection recovery, which carries the
        chosen dates, slot and guests back here after onboarding. */}
    {isCustomer === false ? <button onClick={login} disabled={!date || loggingIn} className="mt-3 min-h-11 w-full text-meta font-semibold text-brand-700 underline disabled:text-ink-500 disabled:no-underline">{loggingIn ? 'Opening login…' : 'Log in to keep your saved places'}</button> : null}
  </div>;
}
