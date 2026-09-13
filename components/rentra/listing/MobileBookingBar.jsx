'use client';

import { useEffect, useState } from 'react';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { useBookingQuote } from './BookingQuoteProvider';
import { formatDayLabel } from './booking-state';

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
  const { date, quote, loading, isCustomer, login, loggingIn } = useBookingQuote();
  const [shown, setShown] = useState(false);

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
            {date ? formatDayLabel(date) : 'Pick a date'}
            {' · '}
            No real money collected
          </p>
        </div>

        {/* text-base, not text-meta — see the note in BookingPriceBox. */}
        {quote && !isCustomer ? <button onClick={login} disabled={loggingIn} tabIndex={shown ? 0 : -1} className="ml-auto min-h-12 shrink-0 rounded-md bg-brand-600 px-4 text-base font-semibold text-white">Log in</button> : <a href="#availability" tabIndex={shown ? 0 : -1} className="ml-auto inline-flex min-h-12 shrink-0 items-center rounded-md bg-brand-600 px-4 text-base font-semibold text-white">Check dates</a>}
      </div>
    </div>
  );
}
