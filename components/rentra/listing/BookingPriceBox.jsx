'use client';
import { useBookingQuote } from './BookingQuoteProvider';
import SaveButton from '@/components/rentra/SaveButton';
import QuoteSummary from './QuoteSummary';

export default function BookingPriceBox({ rentableId, listingTitle }) {
  const { guests, setGuests, selectionReady, dates } = useBookingQuote();
  return (
    <div
      id="booking-summary"
      className="scroll-mt-24 rounded-lg border border-border bg-card p-5 shadow-sm"
    >
      <h2 className="text-h3">Price for your visit</h2>
      <a
        href="#availability"
        className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-brand-600 px-4 font-semibold text-white hover:bg-brand-700"
      >
        {dates.length ? 'Change booking dates' : 'Choose dates to book'}
      </a>
      <label className="mt-4 block text-meta font-semibold">
        Guests per visit
        <input
          type="number"
          min="1"
          max="500"
          disabled={!selectionReady}
          value={guests}
          onChange={(event) =>
            setGuests(event.target.value === '' ? '' : Number(event.target.value))
          }
          className="mt-1 min-h-11 w-full rounded-md border border-border px-3"
        />
      </label>
      <QuoteSummary />
      <div
        id="booking-save"
        className="mt-4 flex min-h-12 items-center justify-center rounded-md bg-brand-50 text-brand-800"
      >
        <SaveButton rentableId={rentableId} listingTitle={listingTitle} variant="inline" />
      </div>
    </div>
  );
}
