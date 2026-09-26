'use client';
import { useState } from 'react';
import { Popover } from 'radix-ui';
import { ChevronDown, Minus, Plus, ShieldCheck } from 'lucide-react';
import { useBookingQuote } from './BookingQuoteProvider';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { SLOTS } from '@/lib/domain/pricing';
import SaveButton from '@/components/rentra/SaveButton';
import QuoteSummary from './QuoteSummary';

const shortDate = (date) =>
  new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
export default function BookingPriceBox({
  rentableId,
  listingTitle,
  prices,
  schedules = [],
  capacity = 500,
}) {
  const { guests, setGuests, selectionReady, dates, slot, setSlot, quote, setCalendarOpen } =
    useBookingQuote();
  const [guestsOpen, setGuestsOpen] = useState(false);
  const schedule = schedules.find((item) => item.slot === slot);
  const maxGuests = Math.max(1, Math.min(500, schedule?.capacity ?? capacity));
  const basePrice = prices?.[slot]
    ? Math.min(prices[slot].weekday, prices[slot].weekend) * 100
    : null;
  const first = quote?.visits[0];
  const multiple = dates.length > 1;
  return (
    <div
      id="booking-summary"
      className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] sm:p-6"
    >
      <h2 className="sr-only">Price for your visit</h2>
      <div className="mb-6">
        <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {!quote && basePrice !== null && <span className="text-sm text-ink-500">From</span>}
          <span className="text-3xl font-bold tracking-tight text-ink-900">
            {quote
              ? formatINRMinor(quote.totals.totalMinor)
              : basePrice !== null
                ? formatINRMinor(basePrice)
                : 'Choose dates'}
          </span>
          <span className="text-sm text-ink-600">
            {quote
              ? ` / ${dates.length} visit${multiple ? 's' : ''}`
              : ` / ${SLOTS[slot]?.label.toLowerCase() ?? 'visit'}`}
          </span>
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {quote
            ? 'Includes platform fee · refundable deposit separate'
            : 'Base rent · final price depends on dates and guests'}
        </p>
      </div>
      <div
        className="mb-3 flex gap-1 rounded-lg bg-ink-50 p-1"
        role="group"
        aria-label="Booking visit type"
      >
        {Object.values(SLOTS).map((item) => (
          <button
            type="button"
            key={item.id}
            disabled={!selectionReady || !prices?.[item.id]}
            aria-pressed={slot === item.id}
            onClick={() => setSlot(item.id)}
            className="min-h-10 flex-1 rounded-md px-2 text-xs font-semibold text-ink-600 transition aria-pressed:bg-white aria-pressed:text-brand-800 aria-pressed:shadow-sm disabled:opacity-40"
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-ink-300">
        <button
          type="button"
          disabled={!selectionReady}
          onClick={() => setCalendarOpen(true)}
          aria-haspopup="dialog"
          aria-label="Choose arrival and departure dates"
          className="grid w-full grid-cols-2 rounded-t-xl text-left transition hover:bg-brand-50 disabled:opacity-50"
        >
          <span className="min-w-0 border-r border-ink-300 px-4 py-3">
            <span className="block text-[11px] font-bold uppercase">
              {multiple ? 'Visit dates' : 'Arrival'}
            </span>
            <span className="mt-1 block text-sm">
              {multiple
                ? `${dates.length} dates selected`
                : first
                  ? shortDate(first.startsAt)
                  : dates[0]
                    ? shortDate(dates[0])
                    : 'Add date'}
            </span>
          </span>
          <span className="min-w-0 px-4 py-3">
            <span className="block text-[11px] font-bold uppercase">
              {multiple ? 'Visit schedule' : 'Departure'}
            </span>
            <span className="mt-1 block text-sm">
              {multiple
                ? 'View each visit'
                : first
                  ? shortDate(first.endsAt)
                  : dates[0]
                    ? 'Checking hours…'
                    : 'Add date'}
            </span>
          </span>
        </button>
        <Popover.Root open={guestsOpen} onOpenChange={setGuestsOpen}>
          <Popover.Trigger
            disabled={!selectionReady}
            className="flex min-h-18 w-full items-center justify-between rounded-b-xl border-t border-ink-300 px-4 py-3 text-left hover:bg-brand-50 disabled:opacity-50"
            aria-label={`Guests per visit: ${guests}`}
          >
            <span>
              <span className="block text-[11px] font-bold uppercase">Guests per visit</span>
              <span className="mt-1 block text-sm">
                {guests} guest{guests === 1 ? '' : 's'}
              </span>
            </span>
            <ChevronDown className={`size-5 transition ${guestsOpen ? 'rotate-180' : ''}`} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="end"
              sideOffset={8}
              collisionPadding={16}
              aria-label="Select guests"
              className="z-[70] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-5 shadow-xl"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold">Guests</h3>
                  <p className="mt-1 text-xs text-ink-500">Up to {maxGuests} per visit</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Remove one guest"
                    disabled={guests <= 1}
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="grid size-11 place-items-center rounded-full border border-ink-300 hover:border-brand-700 disabled:opacity-30"
                  >
                    <Minus className="size-4" />
                  </button>
                  <output aria-live="polite" className="min-w-5 text-center font-semibold">
                    {guests}
                  </output>
                  <button
                    type="button"
                    aria-label="Add one guest"
                    disabled={guests >= maxGuests}
                    onClick={() => setGuests(guests + 1)}
                    className="grid size-11 place-items-center rounded-full border border-ink-300 hover:border-brand-700 disabled:opacity-30"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
              {guests > maxGuests && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  This visit type allows {maxGuests} guests. Reduce your guest count to continue.
                </p>
              )}
              <div className="mt-3 text-right">
                <Popover.Close className="min-h-11 text-sm font-semibold underline underline-offset-4">
                  Close
                </Popover.Close>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
      <QuoteSummary compact onChooseDates={() => setCalendarOpen(true)} />
      <div
        id="booking-save"
        className="mt-4 flex items-center justify-between border-t border-border pt-4"
      >
        <span className="inline-flex items-center gap-1.5 text-xs text-ink-500">
          <ShieldCheck className="size-4" />
          Review before payment
        </span>
        <SaveButton rentableId={rentableId} listingTitle={listingTitle} variant="inline" />
      </div>
    </div>
  );
}
