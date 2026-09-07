'use client';

import { CalendarCheck, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  calculateBookingPrice, formatINR, SLOTS, CANCELLATION_TIERS,
} from '@/lib/domain/pricing';
import TrustBadge from '@/components/rentra/TrustBadge';
import { useBookingSelection, rentFor, formatDayLabel, isWeekendDate } from './booking-state';

/**
 * The sticky price box. Follows the scroll on desktop; the mobile bottom bar
 * is its sibling, not a second implementation of it.
 *
 * The "Brokerage ₹0" row is never suppressed and never conditional. It costs
 * one line of markup and it is the entire positioning — every portal this
 * competes with hides its fee until a phone call.
 */
export default function BookingPriceBox({
  prices, deposit = 0, cancellationTier = 'moderate', defaultDate, defaultSlot,
}) {
  const { date, slot, isExplicitDate } = useBookingSelection({ defaultDate, defaultSlot });
  const rent = rentFor({ prices, slot, date });

  if (rent == null) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
        <p className="text-meta text-ink-600">
          This slot is not offered here. Pick another above.
        </p>
      </div>
    );
  }

  const p = calculateBookingPrice({ baseRent: rent, deposit });
  const slotLabel = SLOTS[slot]?.label ?? 'Booking';
  const peak = isWeekendDate(date);
  const tier = CANCELLATION_TIERS[cancellationTier] ?? CANCELLATION_TIERS.moderate;
  // The top refund band, in rupees rather than in percentages.
  const [freeDays, topRate] = tier.bands[0];

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-ink-100 pb-3.5">
        <span className="text-h2 font-extrabold tracking-tight tabular" data-money>
          {formatINR(p.rent)}
        </span>
        <span className="text-meta text-ink-600">/ {slotLabel.toLowerCase()}</span>
        {peak ? <TrustBadge variant="peak" className="ml-auto" /> : null}
      </div>

      <p className="flex items-center gap-1.5 pt-3 text-meta text-ink-600">
        <CalendarCheck className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
        {date ? (
          <>
            <span className="font-semibold text-ink-900">{formatDayLabel(date)}</span>
            <span>· {SLOTS[slot]?.window}</span>
          </>
        ) : (
          'Pick a date to see the exact total'
        )}
      </p>
      {!isExplicitDate && date ? (
        <p className="mt-1 text-tiny text-ink-500">
          Next date with this slot free. Change it in the calendar.
        </p>
      ) : null}

      <dl className="mt-2 text-meta">
        <Row label={`Farmhouse rent · ${slotLabel.toLowerCase()}`} value={formatINR(p.rent)} />
        <Row label="Platform fee (8%)" value={formatINR(p.fee)} />
        <Row label="Brokerage" value={formatINR(p.brokerage)} accent />

        <div className="mt-1.5 flex justify-between gap-3 border-t border-border pt-3 text-h4 font-bold">
          <dt>Pay now to confirm</dt>
          <dd className="font-extrabold tabular" data-money>{formatINR(p.advanceDue)}</dd>
        </div>

        <Row label="Balance · online or cash at check-in" value={formatINR(p.balanceDue)} muted />
        {deposit > 0 ? (
          <Row label="Refundable deposit · paid to owner" value={formatINR(p.deposit)} muted />
        ) : null}
      </dl>

      {/**
        * h-12 rather than the default: this is the one target on the page that
        * has to be comfortable on a phone, and size="lg" is a 36px control.
        *
        * `text-base`, NOT `text-meta`. Button runs its classes through
        * tailwind-merge, which has no way to know `meta` is a font-size in
        * our @theme — it reads `text-meta` as a text COLOUR and drops the
        * variant's `text-primary-foreground`, leaving near-black label text
        * on brand green. Any `text-<custom-token>` on a Button does this.
        */}
      <Button size="lg" className="mt-4 h-12 w-full text-base font-semibold">
        Request booking
      </Button>

      <p className="mt-3 flex items-start gap-1.5 text-tiny text-ink-500">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
        <span>
          You are not charged the balance until check-in.
          {topRate === 1
            ? ` Cancel ${freeDays}+ days ahead and the rent comes back in full.`
            : ` Cancel ${freeDays}+ days ahead for ${formatINR(Math.round(p.rent * topRate))} back.`}
        </span>
      </p>
    </div>
  );
}

function Row({ label, value, accent, muted }) {
  return (
    <div className={`flex justify-between gap-3 py-2.5 ${muted ? 'text-ink-500' : 'text-ink-700'}`}>
      <dt>{label}</dt>
      <dd
        className={`tabular font-medium ${accent ? 'font-bold text-brand-600' : 'text-ink-900'}`}
        data-money
      >
        {value}
      </dd>
    </div>
  );
}
