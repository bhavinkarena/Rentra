'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import Link from '@/components/navigation/NavigationLink';
import { useRef, useState } from 'react';
import { previewCustomerCancellation, cancelCustomerVisits } from '@/lib/actions/customer';
import { bookingTime as time } from '@/lib/domain/booking-record';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { SLOTS } from '@/lib/domain/pricing';
import { BackLink } from '@/components/ui/page-header';
import { Info } from 'lucide-react';
import { displayMoney as money, StateBadge } from './BookingDisplay';

const pill =
  'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50';
const visitLabel = (v) =>
  v.slot === 'hourly'
    ? v.label
    : `${v.date ? formatLocalDate(v.date, { year: 'numeric' }) : 'Date not recorded'} · ${SLOTS[v.slot]?.label ?? v.slot.replaceAll('_', ' ')}`;

export default function CancelVisits({ record }) {
  const [selected, setSelected] = useState([]),
    [preview, setPreview] = useState(null),
    [receipt, setReceipt] = useState(null);
  const [reason, setReason] = useState(''),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const request = useRef(null),
    gate = useRef(false);
  async function run(commit = false) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      if (commit) {
        if (!accepted || !preview) return;
        // Reuse the exact request after a lost response, including its reason and hash.
        request.current ??= {
          orderId: record.id,
          visitIds: selected,
          hash: preview.hash,
          accepted: true,
          reason,
          idempotencyKey: crypto.randomUUID(),
        };
        const result = await cancelCustomerVisits(request.current);
        if (result.error) {
          setError(result.error);
          setPreview(null);
          setAccepted(false);
          request.current = null;
        } else setReceipt(result.receipt);
      } else {
        const result = await previewCustomerCancellation({
          orderId: record.id,
          visitIds: selected,
        });
        if (result.error) setError(result.error);
        else {
          setPreview(result.preview);
          setAccepted(false);
          request.current = null;
        }
      }
    } catch {
      setError(
        'The response was lost. Retry this same request or open your booking record to check which visits were cancelled.',
      );
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <BackLink href={`/bookings/${record.id}`}>Back to booking record</BackLink>
        <h1 className="mt-1 text-h1">{receipt ? 'Visits cancelled' : 'Cancel selected visits'}</h1>
        <h2 className="mt-1 text-ink-600">{record.title}</h2>
      </header>
      <p className="flex items-start gap-3 rounded-lg bg-info-bg p-4 text-meta text-ink-800">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <span>
          Only the selected visits are cancelled. Refund estimates use the accepted policy and
          verified Test amounts already collected. Actual bank refund: ₹0.
        </span>
      </p>
      {receipt ? (
        <section role="status" className="space-y-3 rounded-lg bg-brand-50 p-4 text-meta sm:p-5">
          <p>{receipt.visits.length} visit(s) cancelled. Unselected visits are unchanged.</p>
          <p>
            Test refund requested: {money(receipt.refundMinor)}. This is an obligation, not proof of
            a completed refund.
          </p>
          <p className="font-mono text-tiny break-all">Cancellation reference: {receipt.id}</p>
          <p>
            Track refund status in your booking record. Processing continues even if new payments
            are disabled.
          </p>
        </section>
      ) : (
        <>
          <fieldset disabled={busy} className="space-y-2">
            <legend className="mb-3 text-h4">Choose visits</legend>
            {record.visits.map((visit) => (
              <label
                key={visit.id}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors has-checked:border-brand-600 has-checked:bg-brand-50 has-disabled:cursor-not-allowed has-disabled:opacity-60"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 size-5 accent-brand-600"
                  disabled={visit.state !== 'confirmed'}
                  checked={selected.includes(visit.id)}
                  onChange={(event) => {
                    setSelected((old) =>
                      event.target.checked
                        ? [...old, visit.id]
                        : old.filter((id) => id !== visit.id),
                    );
                    setPreview(null);
                    setAccepted(false);
                    request.current = null;
                  }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{visitLabel(visit)}</span>
                  <span className="mt-0.5 block text-meta text-ink-600">
                    {time(visit.startsAt, record.timeZone)}
                  </span>
                </span>
                <StateBadge state={visit.state} />
              </label>
            ))}
          </fieldset>
          <p className="text-meta text-ink-600">
            Started visits need operational help. Open your booking record and contact the host;
            online cancellation will reject a started visit.
          </p>
          <button disabled={busy || !selected.length} onClick={() => run()} className={pill}>
            {busy ? <RentraLoader label="Checking…" /> : 'Preview cancellation'}
          </button>
          {preview ? (
            <section className="space-y-4 rounded-lg border border-border bg-card p-4 text-meta sm:p-5">
              <h2 className="text-h4">Review your cancellation</h2>
              <ul className="space-y-3">
                {preview.visits.map((v) => (
                  <li key={v.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <span>
                      {v.date ? formatLocalDate(v.date) : 'Date not recorded'} ·{' '}
                      <span className="capitalize">{v.tier}</span> policy ·{' '}
                      {Math.round(v.rate * 100)}% rent entitlement
                    </span>
                    <span className="tabular">
                      Test refund for this visit: {money(v.refundMinor)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-border pt-3 font-semibold">
                Total Test refund requested: {money(preview.refundMinor)}
              </p>
              <p>
                Refunds cannot exceed captured amounts. Uncollected deposits and balances are not
                refunded. Cutoffs are checked again when you confirm.
              </p>
              <label className="block">
                Reason (optional)
                <input
                  disabled={busy}
                  value={reason}
                  onChange={(event) => {
                    setReason(event.target.value);
                    request.current = null;
                  }}
                  maxLength={160}
                  className="mt-1 block min-h-11 w-full rounded-lg border border-input bg-card p-3 text-base sm:text-sm"
                />
              </label>
              <label className="flex gap-3">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-0.5 size-5 accent-brand-600"
                />
                <span>I accept this refund estimate and cancellation of only these visits.</span>
              </label>
              <button
                disabled={busy || !accepted}
                onClick={() => run(true)}
                className="min-h-11 rounded-full bg-danger px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <RentraLoader label="Confirming cancellation" /> : 'Confirm cancellation'}
              </button>
            </section>
          ) : null}
        </>
      )}
      {error ? (
        <p role="alert" className="rounded-lg border border-danger/30 bg-danger-bg p-4 text-meta">
          {error}
        </p>
      ) : null}
      <section className="border-t border-border pt-6">
        <h2 className="text-h4">Need different dates or guests?</h2>
        <p className="mt-2 text-meta text-ink-600">
          Visits cannot be edited in place. Review cancellation costs first, then make a new booking
          at current availability and prices. A replacement is not reserved or guaranteed. For an
          urgent arrival issue, contact the host from your booking record.
        </p>
        <nav className="mt-4 flex flex-wrap gap-2">
          <Link className={pill} href={`/support/new?order=${record.id}&topic=change`}>
            Ask about a change
          </Link>
          <Link className={pill} href={`/support/new?order=${record.id}&topic=cancellation`}>
            Get cancellation help
          </Link>
          <Link className={pill} href="/policies/cancellation">
            Cancellation policy
          </Link>
        </nav>
      </section>
    </div>
  );
}
