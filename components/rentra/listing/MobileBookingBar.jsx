'use client';

import { useEffect, useRef } from 'react';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { SLOTS } from '@/lib/domain/pricing';
import { useBookingQuote } from './BookingQuoteProvider';
import QuoteSummary from './QuoteSummary';
import { useShownAfter } from './use-shown-after';

/**
 * The bottom bar, below lg. Appears once the photo grid has scrolled out of
 * view — before that the price box is still on screen and a second copy of
 * the same CTA is just noise.
 *
 * The booking bar always wins the bottom of the screen. The WhatsApp float in
 * the marketing layout steps up out of its way, driven by the
 * `data-booking-bar` attribute below (see the rule in globals.css) rather
 * than by measuring anything at runtime.
 */
export default function MobileBookingBar({ sentinelId = 'gallery-end', prices }) {
  const { dates, quote, loading, setCalendarOpen, slot } = useBookingQuote();
  // Same starting price the booking box shows before dates are chosen.
  const basePrice = prices?.[slot]
    ? Math.min(prices[slot].weekday, prices[slot].weekend) * 100
    : null;
  const shown = useShownAfter(sentinelId);
  const dialog = useRef(null);
  const opener = useRef(null);
  const previousOverflow = useRef('');
  function keepDialogFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [
      ...event.currentTarget.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (!first) {
      event.preventDefault();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  useEffect(() => {
    // React clears refs before unmount cleanup. Keep the dialog node so leaving
    // for login while it is open still releases the page's scroll lock.
    const element = dialog.current;
    return () => {
      if (element?.open) document.body.style.overflow = previousOverflow.current;
    };
  }, []);

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
            <p className="flex items-baseline gap-1.5">
              {!quote && !loading && basePrice !== null ? (
                <span className="text-tiny text-ink-600">from</span>
              ) : null}
              <span className="text-h4 font-extrabold tracking-tight tabular" data-money>
                {quote ? (
                  formatINRMinor(quote.totals.totalMinor)
                ) : loading ? (
                  <span role="status" className="text-sm font-medium text-ink-600">
                    Updating total…
                  </span>
                ) : basePrice !== null ? (
                  formatINRMinor(basePrice)
                ) : (
                  'Choose dates'
                )}
              </span>
              <span className="truncate text-tiny text-ink-600">
                {quote
                  ? 'booking total'
                  : !loading && basePrice !== null
                    ? `/ ${SLOTS[slot]?.label.toLowerCase() ?? 'visit'}`
                    : ''}
              </span>
            </p>
            <p className="truncate text-tiny text-ink-500">
              {dates.length ? `${dates.length} visits selected · ` : ''}
              Razorpay Test · no real charge
            </p>
          </div>

          {/* text-base, not text-meta — see the note in BookingPriceBox. */}
          <button
            type="button"
            ref={opener}
            onClick={() => {
              if (!dates.length) {
                setCalendarOpen(true);
                return;
              }
              previousOverflow.current = document.body.style.overflow;
              document.body.style.overflow = 'hidden';
              dialog.current.returnValue = '';
              dialog.current.showModal();
            }}
            tabIndex={shown ? 0 : -1}
            className="ml-auto min-h-12 shrink-0 rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            {dates.length ? 'Review booking' : 'Choose dates'}
          </button>
        </div>
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="mobile-summary-title"
        onKeyDown={keepDialogFocus}
        onClose={() => {
          document.body.style.overflow = previousOverflow.current;
          if (dialog.current.returnValue === 'edit') {
            setCalendarOpen(true);
          } else opener.current?.focus();
        }}
        className="sheet-dialog fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop:bg-black/50"
      >
        <div className="flex items-center justify-between">
          <h2 id="mobile-summary-title" className="text-h3">
            Your visits
          </h2>
          <button
            type="button"
            autoFocus
            onClick={() => dialog.current.close()}
            className="min-h-11 px-3"
          >
            Close summary
          </button>
        </div>
        <QuoteSummary />
        <button
          type="button"
          onClick={() => dialog.current.close('edit')}
          className="mt-3 min-h-11 text-brand-700 underline"
        >
          Edit dates
        </button>
      </dialog>
    </>
  );
}
