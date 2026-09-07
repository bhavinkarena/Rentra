'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatINR, SLOTS, calculateBookingPrice } from '@/lib/domain/pricing';
import { useBookingSelection, rentFor, formatDayLabel } from './booking-state';

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
  prices, deposit = 0, defaultDate, defaultSlot, sentinelId = 'gallery-end',
}) {
  const { date, slot } = useBookingSelection({ defaultDate, defaultSlot });
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

  const rent = rentFor({ prices, slot, date });
  if (rent == null) return null;

  const p = calculateBookingPrice({ baseRent: rent, deposit });

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
              {formatINR(p.rent)}
            </span>
            <span className="truncate text-tiny text-ink-600">
              / {SLOTS[slot]?.label.toLowerCase()}
            </span>
          </p>
          <p className="truncate text-tiny text-ink-500">
            {date ? formatDayLabel(date) : 'Pick a date'}
            {' · '}
            {formatINR(p.advanceDue)} now
          </p>
        </div>

        {/* text-base, not text-meta — see the note in BookingPriceBox. */}
        <Button size="lg" className="ml-auto h-12 shrink-0 px-6 text-base font-semibold">
          Request booking
        </Button>
      </div>
    </div>
  );
}
