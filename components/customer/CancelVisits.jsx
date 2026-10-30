'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import Link from '@/components/navigation/NavigationLink';
import { useRef, useState } from 'react';
import { previewCustomerCancellation, cancelCustomerVisits } from '@/lib/actions/customer';
import { bookingTime as time } from '@/lib/domain/booking-record';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { SLOTS } from '@/lib/domain/pricing';
import { BackLink } from '@/components/ui/page-header';
import { BedDouble, Info } from 'lucide-react';
import { displayMoney as money, StateBadge } from './BookingDisplay';

const pill =
  'inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50';
const visitLabel = (v) =>
  v.slot === 'hourly' || v.slot === 'stay'
    ? v.label
    : `${v.date ? formatLocalDate(v.date, { year: 'numeric' }) : 'Date not recorded'} · ${SLOTS[v.slot]?.label ?? v.slot.replaceAll('_', ' ')}`;

export default function CancelVisits({ record }) {
  const apartment = Boolean(record.stay?.apartment);
  const [selected, setSelected] = useState([]),
    [preview, setPreview] = useState(null),
    [receipt, setReceipt] = useState(null);
  const [reason, setReason] = useState(''),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [operation, setOperation] = useState('');
  const departing = operation === 'early_departure';
  // A stay with several booked rooms can release just some of them.
  const bookedRooms = record.stay?.rooms.filter((room) => room.state === 'booked') ?? [];
  const roomLabel = (id) => {
    const index = record.stay.rooms.findIndex((room) => room.id === id);
    const room = record.stay.rooms[index];
    return room
      ? `Room ${index + 1}: ${[room.name, room.plan?.name, room.guestName].filter(Boolean).join(' / ')}`
      : 'Room';
  };
  const [rooms, setRooms] = useState(() => bookedRooms.map((room) => room.id));
  const roomPick = bookedRooms.length > 1;
  const roomIds =
    // Story 3.11: a whole apartment has no rooms; its stay ends early as one unit.
    (departing && bookedRooms.length) || (roomPick && rooms.length < bookedRooms.length)
      ? { roomIds: rooms }
      : {};
  const action = departing ? { operation } : {};
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
          ...roomIds,
          ...action,
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
          ...roomIds,
          ...action,
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
        departing
          ? 'The response was lost. Retry this same request or open your booking record to check which rooms ended early.'
          : 'The response was lost. Retry this same request or open your booking record to check which visits were cancelled.',
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
        <h1 className="mt-1 text-h1">
          {receipt
            ? receipt.operation === 'early_departure'
              ? apartment
                ? 'Stay ended early'
                : 'Selected rooms ended early'
              : 'Visits cancelled'
            : departing
              ? apartment
                ? 'End stay early'
                : 'End selected rooms early'
              : 'Cancel selected visits'}
        </h1>
        <h2 className="mt-1 text-ink-600">{record.title}</h2>
      </header>
      <p className="flex items-start gap-3 rounded-lg bg-info-bg p-4 text-meta text-ink-800">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <span>
          {departing || receipt?.operation === 'early_departure'
            ? `Explicit confirmation ends occupancy of ${apartment ? 'the whole apartment' : 'selected rooms'} now, even when no refund is due. Only strictly unused nights are released. Refunds use the booked early-departure offer.`
            : 'Only the selected visits are cancelled. Refund estimates use the accepted policy and verified Test amounts already collected.'}{' '}
          Actual bank refund: {money(0)}.
        </span>
      </p>
      {receipt ? (
        <section role="status" className="space-y-3 rounded-lg bg-brand-50 p-4 text-meta sm:p-5">
          <p>
            {receipt.operation === 'early_departure'
              ? apartment
                ? `The whole apartment stay ended early at ${time(receipt.departedAt, record.timeZone)}.`
                : `${receipt.visits.reduce((sum, visit) => sum + visit.rooms, 0)} room(s) ended early at ${time(receipt.departedAt, record.timeZone)}.${receipt.visits.some((visit) => visit.partial) ? ' Your other rooms stay booked.' : ''}`
              : receipt.visits.every((visit) => visit.roomIds)
                ? `${receipt.visits.reduce((sum, visit) => sum + visit.rooms, 0)} room(s) cancelled.${receipt.visits.some((visit) => visit.partial) ? ' Your other rooms stay booked.' : ''}`
                : `${receipt.visits.length} visit(s) cancelled. Unselected visits are unchanged.`}
          </p>
          <p>
            {receipt.refundMinor > 0
              ? `Test refund requested: ${money(receipt.refundMinor)}. This is an obligation, not proof of a completed refund.`
              : 'No refund is due. No refund was requested.'}
          </p>
          <p className="font-mono text-tiny break-all">
            {receipt.operation === 'early_departure' ? 'Early-departure' : 'Cancellation'}{' '}
            reference: {receipt.id}
          </p>
          <p>
            Track refund status in your booking record. Processing continues even if new payments
            are disabled.
          </p>
        </section>
      ) : (
        <>
          {record.stay ? (
            <fieldset disabled={busy} className="flex flex-wrap gap-2">
              <legend className="mb-2 text-h4">Choose operation</legend>
              {[
                ['', 'Cancel visits'],
                ['early_departure', 'End stay early'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={pill}
                  aria-pressed={operation === value}
                  onClick={() => {
                    setOperation(value);
                    setSelected((old) =>
                      old.filter((id) =>
                        record.visits.some(
                          (v) =>
                            v.id === id &&
                            (value
                              ? ['confirmed', 'handed_over', 'returned'].includes(v.state)
                              : v.state === 'confirmed'),
                        ),
                      ),
                    );
                    setPreview(null);
                    setAccepted(false);
                    setError('');
                    request.current = null;
                  }}
                >
                  {label}
                </button>
              ))}
            </fieldset>
          ) : null}
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
                  disabled={
                    departing
                      ? !['confirmed', 'handed_over', 'returned'].includes(visit.state)
                      : visit.state !== 'confirmed'
                  }
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
          {roomPick ? (
            <fieldset disabled={busy} className="space-y-2">
              <legend className="mb-1 text-h4">Choose rooms</legend>
              <p className="mb-3 text-meta text-ink-600">
                Unticked rooms stay booked. Refunds cover only the selected rooms.
              </p>
              {bookedRooms.map((room) => (
                <label
                  key={room.id}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors has-checked:border-brand-600 has-checked:bg-brand-50"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-5 accent-brand-600"
                    checked={rooms.includes(room.id)}
                    onChange={(event) => {
                      setRooms((old) =>
                        event.target.checked
                          ? [...old, room.id]
                          : old.filter((id) => id !== room.id),
                      );
                      setPreview(null);
                      setAccepted(false);
                      request.current = null;
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-semibold">
                      <BedDouble className="size-4 shrink-0 text-brand-700" aria-hidden="true" />
                      {roomLabel(room.id)}
                    </span>
                    <span className="mt-0.5 block text-meta text-ink-600">
                      {[room.plan?.name, room.guestName].filter(Boolean).join(' · ')}
                    </span>
                    <span className="mt-0.5 block text-meta text-ink-600">
                      {record.stay.checkIn} to {record.stay.checkOut}: room {money(room.roomMinor)},
                      tax {money(room.taxMinor)}.
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          ) : null}
          <p className="text-meta text-ink-600">
            {departing
              ? 'Only nights starting strictly after your confirmed request are unused. The current night is consumed. Property and access claims need support.'
              : record.stay
                ? 'At or after check-in, online cancellation uses the booked percentage for each selected room when it allows a refund. Otherwise contact the host from your booking record.'
                : 'Started visits need operational help. Open your booking record and contact the host.'}
          </p>
          <button
            disabled={busy || !selected.length || (roomPick && !rooms.length)}
            onClick={() => run()}
            className={pill}
          >
            {busy ? (
              <RentraLoader label="Checking…" />
            ) : departing ? (
              'Preview early departure'
            ) : (
              'Preview cancellation'
            )}
          </button>
          {preview ? (
            <section className="space-y-4 rounded-lg border border-border bg-card p-4 text-meta sm:p-5">
              <h2 className="text-h4">
                {departing ? 'Review your early departure' : 'Review your cancellation'}
              </h2>
              <ul className="space-y-3">
                {preview.visits.map((v) => (
                  <li key={v.id} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                    <span>
                      {v.date ? formatLocalDate(v.date) : 'Date not recorded'} ·{' '}
                      {apartment && departing ? (
                        <>
                          Whole apartment · booked offer: {v.apartment.pct}% of unused nights.
                          <span className="mt-1 block">
                            Consumed nights: {v.apartment.consumedNights.join(', ')}. Unused nights:{' '}
                            {v.apartment.unusedNights.join(', ') || 'None'}.
                          </span>
                          <span className="mt-1 block">
                            Cleaning kept: {money(v.apartment.keptCleaningMinor)}. Pet charge kept:{' '}
                            {money(v.apartment.keptPetMinor)}.
                          </span>
                        </>
                      ) : v.roomIds ? (
                        <>
                          {v.rooms} room(s) to {departing ? 'end early' : 'cancel'}, using their
                          booked policies.
                          {v.roomDetails?.map((room) => (
                            <span key={room.id} className="mt-1 block">
                              {roomLabel(room.id)}:{' '}
                              {departing ? (
                                <>
                                  {room.offered
                                    ? `Booked offer: ${room.pct}%`
                                    : 'No booked offer: 0%'}{' '}
                                  of unused components.
                                  <span className="block">
                                    Consumed nights: {room.consumedNights.join(', ') || 'None'}.
                                    Unused nights: {room.unusedNights.join(', ') || 'None'}.
                                  </span>
                                  <span className="block">
                                    Original room {money(room.original.rent)}, tax{' '}
                                    {money(room.original.tax)}, allocated fee{' '}
                                    {money(room.original.fee)}.
                                  </span>
                                  <span className="block">
                                    Unused room {money(room.unused.rent)}, tax{' '}
                                    {money(room.unused.tax)}, allocated fee {money(room.unused.fee)}
                                    .
                                  </span>
                                </>
                              ) : Number.isInteger(room.pct) ? (
                                `${room.pct}% of room, tax and allocated fee`
                              ) : (
                                <>
                                  {room.rule === 'free'
                                    ? `Free cancellation before the booked cutoff (${room.freeCancelHours} hours before check-in)`
                                    : room.rule === 'full_stay'
                                      ? 'Booked late rule: whole stay charged'
                                      : 'Booked late rule: first night charged'}
                                  . Room and tax refund {money(room.refundMinor)}, charge{' '}
                                  {money(room.chargeMinor)}.
                                </>
                              )}
                            </span>
                          ))}
                          <span className="mt-1 block">
                            Policy entitlement: room {money(v.rent)}, tax {money(v.tax)}, allocated
                            fee {money(v.fee)}.
                          </span>
                          {departing ? (
                            <span className="mt-1 block">
                              Prior reserved refunds: room {money(v.priorReserved.rent)}, tax{' '}
                              {money(v.priorReserved.tax)}, fee {money(v.priorReserved.fee)}.
                              Remaining captured capacity caps this request.
                            </span>
                          ) : null}
                          <span className="mt-1 block">
                            Retained rooms:{' '}
                            {bookedRooms
                              .filter((room) => !v.roomIds.includes(room.id))
                              .map((room) => roomLabel(room.id))
                              .join(', ') || 'None'}
                            . Their dates, prices and terms stay unchanged.
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="capitalize">{v.tier}</span> policy:{' '}
                          {Math.round(v.rate * 100)}% rent entitlement
                        </>
                      )}
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
              <label className="flex min-h-11 items-start gap-3 py-2">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  className="mt-0.5 size-5 accent-brand-600"
                />
                <span>
                  {departing
                    ? `I accept this estimate and explicitly end occupancy of ${apartment ? 'the whole apartment' : 'only these selected rooms'} now, including when no refund is due.`
                    : 'I accept this refund estimate and cancellation of only these visits.'}
                </span>
              </label>
              <button
                disabled={busy || !accepted}
                onClick={() => run(true)}
                className="min-h-11 rounded-full bg-danger px-5 font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {busy ? (
                  <RentraLoader label="Confirming" />
                ) : departing ? (
                  'Confirm early departure'
                ) : (
                  'Confirm cancellation'
                )}
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
