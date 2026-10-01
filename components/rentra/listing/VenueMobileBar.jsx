'use client';

import { useEffect, useRef } from 'react';
import { formatINR } from '@/lib/domain/pricing';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { useBookingQuote } from './booking-context';
import { useShownAfter } from './use-shown-after';
import TimeSlotPicker from './TimeSlotPicker';
import QuoteSummary from './QuoteSummary';

/**
 * Venue bottom bar below lg: "From ₹800 / hr · Check times". Appears after the
 * gallery, like the farmhouse bar, and opens the time picker as a bottom sheet.
 * A venue mid-update has no picker, so the button jumps to the facts instead.
 */
export default function VenueMobileBar({
  bookable,
  activities,
  horizonDays,
  price,
  summary,
  sentinelId = 'gallery-end',
}) {
  const shown = useShownAfter(sentinelId);
  const quote = useBookingQuote()?.quote;
  const dialog = useRef(null);
  const opener = useRef(null);
  const previousOverflow = useRef('');
  useEffect(() => {
    // Leaving for login with the sheet open must still release the scroll lock.
    const element = dialog.current;
    return () => {
      if (element?.open) document.body.style.overflow = previousOverflow.current;
    };
  }, []);

  const button =
    'ml-auto inline-flex min-h-12 shrink-0 items-center rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover';
  return (
    <>
      <div
        {...(shown ? { 'data-booking-bar': '' } : {})}
        aria-hidden={!shown}
        className={[
          'fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur lg:hidden',
          'transition-transform duration-200 motion-reduce:transition-none',
          shown ? 'translate-y-0' : 'pointer-events-none translate-y-full',
        ].join(' ')}
      >
        <div className="flex items-center gap-3 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="min-w-0">
            {quote ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-h4 font-extrabold tracking-tight tabular" data-money>
                  {formatINRMinor(quote.totals.totalMinor)}
                </span>
                <span className="text-tiny text-ink-600">booking total</span>
              </p>
            ) : price != null ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-tiny text-ink-600">from</span>
                <span className="text-h4 font-extrabold tracking-tight tabular" data-money>
                  {formatINR(price)}
                </span>
                <span className="text-tiny text-ink-600">/ hr</span>
              </p>
            ) : null}
            <p className="truncate text-tiny text-ink-500">{summary}</p>
          </div>
          {bookable ? (
            <button
              type="button"
              ref={opener}
              tabIndex={shown ? 0 : -1}
              onClick={() => {
                previousOverflow.current = document.body.style.overflow;
                document.body.style.overflow = 'hidden';
                dialog.current.showModal();
              }}
              className={button}
            >
              {quote ? 'Review' : 'Check times'}
            </button>
          ) : (
            <a href="#hours" tabIndex={shown ? 0 : -1} className={button}>
              See hours
            </a>
          )}
        </div>
      </div>
      {bookable ? (
        <dialog
          ref={dialog}
          aria-labelledby="venue-sheet-title"
          onClose={() => {
            document.body.style.overflow = previousOverflow.current;
            opener.current?.focus();
          }}
          className="sheet-dialog fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop:bg-black/50 lg:hidden"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 id="venue-sheet-title" className="text-h3">
              Book a time
            </h2>
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current.close()}
              className="min-h-11 px-3"
            >
              Close
            </button>
          </div>
          <TimeSlotPicker activities={activities} horizonDays={horizonDays} />
          <QuoteSummary compact />
        </dialog>
      ) : null}
    </>
  );
}
