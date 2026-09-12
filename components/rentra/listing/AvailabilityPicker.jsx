'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import SlotSelector from '@/components/rentra/SlotSelector';
import { SLOTS, formatINR } from '@/lib/domain/pricing';
import { propertyToday } from '@/lib/domain/booking-dates';
import {
  useBookingSelection, rentFor, toISODate, parseISODate, formatDayLabel,
} from './booking-state';

/**
 * Slot selector + calendar. The component the reference sites do not have,
 * because they all sell nights only.
 *
 * Availability is fetched here rather than server-rendered, on purpose: the
 * page is ISR-cached, and a calendar is the one thing on it that must never
 * be an hour old. The server-rendered `nextDates` are the fallback — they are
 * in the HTML for crawlers. Failed live reads do not enable cached dates.
 */
export default function AvailabilityPicker({
  code, prices, nextDates, defaultDate, defaultSlot,
}) {
  const { date, slot, setDate } = useBookingSelection({ defaultDate, defaultSlot });
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const currentResult = result?.code === code && result?.retry === retry ? result : null;
  const availability = currentResult?.days ?? null;
  const state = currentResult?.state ?? 'loading';
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(parseISODate(date || propertyToday())));

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/listings/${code}/availability?days=90`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!controller.signal.aborted) setResult({ code, retry, days: data.days, state: 'ready' });
      } catch (err) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) setResult({ code, retry, days: null, state: 'error' });
      }
    }
    load();

    return () => controller.abort();
  }, [code, retry]);

  const openOn = (iso) => {
    if (!availability) return null;               // unknown, not "unavailable"
    const entry = availability[iso];
    if (!entry) return false;
    return slot === 'full_day' ? entry.full === true : entry[slot] === true;
  };

  // Prices for the currently selected date, so the slot selector shows the
  // real gap between a day picnic and an overnight on THAT Saturday.
  const slotPrices = useMemo(() => {
    const overrides = availability?.[date]?.priceOverride ?? {};
    return Object.fromEntries(
      Object.keys(SLOTS).map((id) => [
        id,
        rentFor({ prices, slot: id, date, override: overrides[id] }),
      ]),
    );
  }, [availability, date, prices]);

  const disabledSlots = Object.keys(SLOTS).filter((id) => prices?.[id] == null);
  const weeks = useMemo(() => buildMonth(monthCursor), [monthCursor]);
  const today = propertyToday();
  const monthLabel = monthCursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const canGoBack = startOfMonth(parseISODate(today)) < monthCursor;

  return (
    <section aria-labelledby="availability-heading" className="scroll-mt-24" id="availability">
      <h2 id="availability-heading" className="text-h2">Pick a slot and a date</h2>
      <p className="mt-2 max-w-prose text-body text-ink-600">
        This farm rents a day picnic and an overnight separately, at different
        prices, on the same date.
      </p>

      <div className="mt-5">
        <SlotSelector prices={slotPrices} disabledSlots={disabledSlots} />
      </div>

      <div className="mt-6 max-w-lg rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="grid size-8 place-items-center rounded-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p aria-live="polite" className="text-h4 font-bold">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
            aria-label="Next month"
            className="grid size-8 place-items-center rounded-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="py-1 text-center text-tiny font-bold text-ink-500">{d}</span>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1">
          {weeks.map((cell, i) => {
            if (!cell) return <span key={`pad-${i}`} />;
            const iso = toISODate(cell);
            const isPast = iso < today;
            const open = openOn(iso);
            const selected = iso === date;
            // While availability is loading, dates are neither open nor shut.
            // Showing everything as bookable and then taking it away is worse
            // than a brief skeleton.
            const pending = state === 'loading' && !isPast;

            return (
              <button
                key={iso}
                type="button"
                disabled={isPast || open !== true}
                aria-pressed={selected}
                aria-label={`${formatDayLabel(iso)}${open === false ? ' — not available' : ''}`}
                onClick={() => setDate(iso)}
                className={[
                  'relative rounded-sm py-2 text-center text-meta tabular transition-colors',
                  selected
                    ? 'bg-brand-600 font-bold text-white'
                    : open
                      ? 'font-medium text-ink-900 hover:bg-brand-50 hover:text-brand-700'
                      : 'text-ink-300',
                  pending && 'animate-pulse bg-ink-50 text-transparent',
                  (isPast || open === false) && 'cursor-not-allowed line-through decoration-ink-300',
                ].filter(Boolean).join(' ')}
              >
                {cell.getUTCDate()}
                {iso === today && !selected ? (
                  <span className="absolute inset-x-0 -bottom-0.5 mx-auto size-1 rounded-full bg-brand-600" />
                ) : null}
              </button>
            );
          })}
        </div>

        <Legend state={state} nextDates={nextDates} slot={slot} onRetry={() => {
          setRetry((value) => value + 1);
        }} />
      </div>

      {date ? (
        <p className="mt-3 flex items-baseline gap-2 text-meta text-ink-600">
          <span className="font-semibold text-ink-900">{formatDayLabel(date)}</span>
          <span>·</span>
          <span>{SLOTS[slot]?.label} · {SLOTS[slot]?.window}</span>
          {slotPrices[slot] != null ? (
            <span className="font-bold text-brand-700 tabular" data-money>
              {formatINR(slotPrices[slot])}
            </span>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}

/**
 * Doubles as the failure state. If the live fetch never lands, the guest
 * sees cached suggestions as text only until a live retry succeeds.
 */
function Legend({ state, nextDates, slot, onRetry }) {
  const fallback = nextDates?.[slot] ?? [];

  if (state === 'error') {
    return (
      <div className="mt-3 flex gap-2 border-t border-border pt-3 text-tiny text-ink-600">
        <Info className="mt-0.5 size-3.5 shrink-0 text-info" aria-hidden="true" />
        <p>
          Live availability did not load.
          {fallback.length ? ' Previously open dates (not confirmed): ' : ' '}
          {fallback.map((iso, i) => (
            <span key={iso}>
              {i > 0 ? ', ' : ''}
              {formatDayLabel(iso)}
            </span>
          ))}
          <button type="button" onClick={onRetry} className="ml-1 min-h-11 font-semibold text-brand-700 underline">
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-tiny text-ink-500">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-brand-600" aria-hidden="true" />
        Selected
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-brand-100" aria-hidden="true" />
        Available
      </span>
      <span className="flex items-center gap-1.5 line-through decoration-ink-300">Booked</span>
      {state === 'loading' ? <span className="ml-auto animate-pulse">Checking dates…</span> : null}
    </div>
  );
}

const startOfMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

/** Month as a flat cell list, Monday-first, padded with nulls. */
function buildMonth(cursor) {
  const first = startOfMonth(cursor);
  const lead = (first.getUTCDay() + 6) % 7; // shift Sunday-first to Monday-first
  const total = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) =>
      new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), i + 1))),
  ];
}
