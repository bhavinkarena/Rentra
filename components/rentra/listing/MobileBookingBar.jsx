'use client';

import { useEffect, useRef, useState } from 'react';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { useBookingQuote } from './BookingQuoteProvider';
import QuoteSummary from './QuoteSummary';

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
export default function MobileBookingBar({
  sentinelId = 'gallery-end',
}) {
  const { dates, quote, loading } = useBookingQuote();
  const [shown, setShown] = useState(false);
  const dialog = useRef(null);
  const opener = useRef(null);
  const previousOverflow = useRef('');
  function keepDialogFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
    const first = controls[0], last = controls.at(-1);
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }
  useEffect(() => {
    // React clears refs before unmount cleanup. Keep the dialog node so leaving
    // for login while it is open still releases the page's scroll lock.
    const element = dialog.current;
    return () => { if (element?.open) document.body.style.overflow = previousOverflow.current; };
  }, []);

  useEffect(() => {
    const sentinel = document.getElementById(sentinelId);

    if (sentinel) {
      // An observer always delivers an initial entry, so the correct state
      // arrives from the callback — nothing has to be seeded by hand here.
      const observer = new IntersectionObserver(
        ([entry]) => setShown(entry.boundingClientRect.top < 0 && !entry.isIntersecting),
        { threshold: 0 },
      );
      observer.observe(sentinel);
      return () => observer.disconnect();
    }

    /**
     * No sentinel means an unexpected page shape. Fall back to scroll depth
     * rather than silently losing the only booking CTA on a phone. The first
     * reading is taken in a frame callback, not in the effect body: setting
     * state synchronously here would cascade an extra render on every mount.
     */
    const onScroll = () => setShown(window.scrollY > 320);
    const frame = requestAnimationFrame(onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, [sentinelId]);


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
            <span className="text-h4 font-extrabold tracking-tight tabular" data-money>
              {quote ? formatINRMinor(quote.totals.totalMinor) : loading ? 'Checking…' : 'Choose dates'}
            </span>
            <span className="truncate text-tiny text-ink-600">
              {quote ? 'booking total' : ''}
            </span>
          </p>
          <p className="truncate text-tiny text-ink-500">
            {dates.length ? `${dates.length} visits selected` : 'Pick dates'}
            {' · '}
            Booking opens in a later release
          </p>
        </div>

        {/* text-base, not text-meta — see the note in BookingPriceBox. */}
        <button type="button" ref={opener} onClick={() => { previousOverflow.current = document.body.style.overflow; document.body.style.overflow = 'hidden'; dialog.current.returnValue = ''; dialog.current.showModal(); }} tabIndex={shown ? 0 : -1} className="ml-auto min-h-12 shrink-0 rounded-md bg-brand-600 px-4 text-white">View summary</button>
      </div>
    </div>
    <dialog ref={dialog} aria-labelledby="mobile-summary-title" onKeyDown={keepDialogFocus} onClose={() => { document.body.style.overflow = previousOverflow.current; if (dialog.current.returnValue === 'edit') { document.getElementById('availability')?.scrollIntoView(); document.querySelector('#availability select')?.focus(); } else opener.current?.focus(); }} className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto rounded-t-xl bg-card p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop:bg-black/50">
      <div className="flex items-center justify-between"><h2 id="mobile-summary-title" className="text-h3">Your visits</h2><button type="button" autoFocus onClick={() => dialog.current.close()} className="min-h-11 px-3">Close summary</button></div>
      <QuoteSummary />
      <button type="button" onClick={() => dialog.current.close('edit')} className="mt-3 min-h-11 text-brand-700 underline">Edit dates</button>
    </dialog>
    </>
  );
}
