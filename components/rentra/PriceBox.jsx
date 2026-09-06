import { calculateBookingPrice, formatINR, SLOTS } from '@/lib/domain/pricing';
import { Button } from '@/components/ui/button';

/**
 * The positioning, rendered. The ₹0 brokerage row is never suppressed —
 * it costs one line of markup and it is the entire pitch.
 */
export default function PriceBox({
  baseRent,
  deposit = 0,
  slot = 'night',
  dateLabel,
  freeCancellationUntil,
}) {
  const p = calculateBookingPrice({ baseRent, deposit });
  const slotLabel = SLOTS[slot]?.label ?? 'Booking';

  return (
    <div className="max-w-sm rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-baseline gap-2 border-b border-ink-100 pb-3.5">
        <span className="text-h2 font-extrabold tracking-tight tabular" data-money>
          {formatINR(p.rent)}
        </span>
        <span className="text-meta text-ink-600">
          / {slotLabel.toLowerCase()}
          {dateLabel ? ` · ${dateLabel}` : ''}
        </span>
      </div>

      <dl className="text-meta">
        <Row label={`Farmhouse rent · ${slotLabel.toLowerCase()}`} value={formatINR(p.rent)} />
        <Row label="Platform fee (8%)" value={formatINR(p.fee)} />
        <Row label="Brokerage" value={formatINR(p.brokerage)} accent />

        <div className="mt-1.5 flex justify-between gap-3 border-t border-border pt-3 text-h4 font-bold">
          <dt>Pay now to confirm</dt>
          <dd className="font-extrabold tabular" data-money>
            {formatINR(p.advanceDue)}
          </dd>
        </div>

        <Row label="Balance · online or cash at check-in" value={formatINR(p.balanceDue)} muted />
        {deposit > 0 ? (
          <Row label="Refundable deposit · paid to owner" value={formatINR(p.deposit)} muted />
        ) : null}
      </dl>

      <Button className="mt-4 w-full" size="lg">
        Request booking
      </Button>

      <p className="mt-3 text-center text-tiny text-ink-500">
        You are not charged the balance until check-in.
        {freeCancellationUntil ? ` Free cancellation until ${freeCancellationUntil}.` : ''}
      </p>
    </div>
  );
}

function Row({ label, value, accent, muted }) {
  return (
    <div
      className={`flex justify-between gap-3 py-2.5 ${muted ? 'text-ink-500' : 'text-ink-700'}`}
    >
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
