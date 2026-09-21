'use client';
import { measureBrowser } from '@/lib/domain/browser-measurement';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';

import { SLOTS } from '@/lib/domain/pricing';
import { propertyToday } from '@/lib/domain/booking-dates';
import { useBookingQuote } from './BookingQuoteProvider';
import {
  toISODate, parseISODate, formatDayLabel,
} from './booking-state';

/**
 * Slot selector + calendar. The component the reference sites do not have,
 * because they all sell nights only.
 *
 * Availability is fetched here rather than server-rendered, on purpose: the
 * selection changes must recheck current inventory, independent of the
 * rendered listing response. The server-rendered `nextDates` are the fallback — they are
 * in the HTML for crawlers. Failed live reads do not enable cached dates.
 */
export default function AvailabilityPicker({
  code, prices, nextDates,
}) {
  const { date, dates, slot, guests, mode, anchor, setMode, setSlot, pickDate, removeDate, clearDates, notice, conflicts, selectionReady } = useBookingQuote();
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(parseISODate(date || propertyToday())));
  const monthStart = toISODate(monthCursor);
  const currentResult = result?.code === code && result?.retry === retry && result?.guests === guests && result?.monthStart === monthStart ? result : null;
  const availability = currentResult?.days ?? null;
  const state = currentResult?.state ?? 'loading';

  const positioned = useRef(false);
  useEffect(() => {
    if (!selectionReady || positioned.current) return;
    positioned.current = true;
    if (date) { const frame = requestAnimationFrame(() => setMonthCursor(startOfMonth(parseISODate(date)))); return () => cancelAnimationFrame(frame); }
  }, [selectionReady, date]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/listings/${code}/availability?from=${monthStart}&days=31&guests=${guests}`, {
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!controller.signal.aborted) setResult({ code, retry, guests, monthStart, days: data.days, message: data.message, state: 'ready' });
      } catch (err) {
        if (err.name !== 'AbortError' && !controller.signal.aborted) setResult({ code, retry, guests, monthStart, days: null, state: 'error' });
      }
    }
    load();

    return () => controller.abort();
  }, [code, retry, guests, monthStart]);

  const openOn = (iso) => {
    if (!availability) return null;               // unknown, not "unavailable"
    const entry = availability[iso];
    if (!entry) return false;
    return slot === 'full_day' ? entry.full === true : entry[slot] === true;
  };

  const weeks = useMemo(() => buildMonth(monthCursor), [monthCursor]);
  const today = propertyToday();
  const monthLabel = monthCursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const canGoBack = startOfMonth(parseISODate(today)) < monthCursor;

  return (
    <section aria-labelledby="availability-heading" className="scroll-mt-24" id="availability">
      <h2 id="availability-heading" className="text-h2">Choose your visits</h2>
      {currentResult?.message ? <p role="status" className="mt-2 text-meta text-ink-600">{currentResult.message}</p> : null}
      <p className="mt-2 max-w-prose text-body text-ink-600">
        Choose up to 10 visits with the same visit type and guest count. Each date has its own arrival and departure; gaps between visits are not included.
      </p>

      <div className="mt-5">
        <div role="group" aria-label="Visit type" className="flex flex-wrap gap-2">{Object.values(SLOTS).map(item => <button key={item.id} type="button" aria-pressed={slot === item.id} disabled={!prices?.[item.id] || !selectionReady} onClick={() => setSlot(item.id)} className={`min-h-11 rounded-md border px-4 ${slot === item.id ? 'bg-brand-600 text-white' : 'bg-card'} disabled:opacity-40`}>{item.label}</button>)}</div>
        <label className="mt-4 block text-meta font-semibold">Date mode<select aria-label="Date mode" value={mode} disabled={!selectionReady} onChange={event => setMode(event.target.value)} className="ml-3 min-h-11 rounded-md border border-border bg-card px-3"><option value="single">Single date</option><option value="consecutive">Consecutive dates</option><option value="separate">Separate dates</option></select></label>
        <p className="mt-2 text-meta text-ink-600">{mode === 'consecutive' ? anchor ? 'Choose the last date. Every date in between will be checked.' : 'Choose the first date, then the last date.' : mode === 'separate' ? 'Tap dates to add or remove visits.' : 'Tap a date to replace your selection.'}</p>
        <p role="status" className="mt-2 text-meta text-brand-700">{notice || `${dates.length} visit${dates.length === 1 ? '' : 's'} selected.`}</p>
        <ul aria-label="Selected visits" className="mt-3 flex flex-wrap gap-2">{dates.map(day => <li key={day}><button type="button" aria-label={`Remove ${formatDayLabel(day)}`} onClick={() => removeDate(day)} className="min-h-11 rounded-full border border-brand-200 bg-brand-50 px-3 text-meta">{formatDayLabel(day)} ×{conflicts.some(c => c.date === day) || (availability?.[day] && openOn(day) === false) ? ' · needs attention' : ''}</button></li>)}</ul>
        {dates.length ? <button type="button" onClick={clearDates} className="min-h-11 text-meta text-brand-700 underline">Clear dates</button> : null}
      </div>

      <div className="mt-6 max-w-lg rounded-lg border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
            disabled={!canGoBack}
            aria-label="Previous month"
            className="grid size-11 place-items-center rounded-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p aria-live="polite" className="text-h4 font-bold">{monthLabel}</p>
          <button
            type="button"
            onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
            disabled={monthCursor >= addMonths(startOfMonth(parseISODate(today)), 12)}
            aria-label="Next month"
            className="grid size-11 place-items-center rounded-sm text-ink-600 transition-colors hover:bg-ink-50 hover:text-ink-900"
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
            const selected = dates.includes(iso);
            // While availability is loading, dates are neither open nor shut.
            // Showing everything as bookable and then taking it away is worse
            // than a brief skeleton.
            const pending = state === 'loading' && !isPast;

            return (
              <button
                key={iso}
                type="button"
                aria-disabled={!selectionReady || isPast || (open !== true && !selected)}
                aria-pressed={selected}
                data-visit-date={iso}
                onKeyDown={event => {
                  const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
                  if (!(event.key in offsets)) return;
                  event.preventDefault();
                  const target = new Date(cell); target.setUTCDate(target.getUTCDate() + offsets[event.key]);
                  if (toISODate(target) < today) return;
                  setMonthCursor(startOfMonth(target));
                  requestAnimationFrame(() => document.querySelector(`[data-visit-date="${toISODate(target)}"]`)?.focus());
                }}
                aria-label={`${formatDayLabel(iso)}${open === false ? ' — not available' : ''}`}
                onClick={() => {
                  if (selectionReady && !isPast && (open === true || selected)) {
                    if (!selected) measureBrowser('dates_selected', dates.length ? 'multiple' : 'single');
                    pickDate(iso);
                  }
                }}
                className={[
                  'relative min-h-11 rounded-sm py-2 text-center text-meta tabular transition-colors',
                  selected
                    ? 'bg-brand-600 font-bold text-white'
                    : open
                      ? 'font-medium text-ink-900 hover:bg-brand-50 hover:text-brand-700'
                      : 'text-ink-300',
                  pending && !selected && 'animate-pulse bg-ink-50 text-transparent',
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
      <span className="flex items-center gap-1.5 line-through decoration-ink-300">Unavailable</span>
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
