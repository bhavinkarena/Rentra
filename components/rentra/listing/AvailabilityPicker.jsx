'use client';
import RentraLoader from '@/components/ui/rentra-loader';
import { fetchAvailability, availabilityMonthRange } from '@/lib/api/availability';
import { measureBrowser } from '@/lib/domain/browser-measurement';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from 'radix-ui';
import { ChevronLeft, ChevronRight, Info, X, CalendarDays } from 'lucide-react';

import { SLOTS } from '@/lib/domain/pricing';
import { propertyToday } from '@/lib/domain/booking-dates';
import { SLOT_ICONS } from '@/components/rentra/slot-icons';
import { useBookingQuote } from './BookingQuoteProvider';
import DateModeSelect from './DateModeSelect';
import { toISODate, parseISODate, formatDayLabel } from './booking-state';

/**
 * Slot selector + calendar. The component the reference sites do not have,
 * because they all sell nights only.
 *
 * Availability is fetched here rather than server-rendered, on purpose: the
 * selection changes must recheck current inventory, independent of the
 * rendered listing response. The server-rendered `nextDates` are the fallback — they are
 * in the HTML for crawlers. Failed live reads do not enable cached dates.
 */
export default function AvailabilityPicker({ code, prices, nextDates }) {
  const {
    calendarOpen,
    setCalendarOpen,
    date,
    dates,
    slot,
    guests,
    mode,
    anchor,
    setMode,
    setSlot,
    pickDate,
    removeDate,
    clearDates,
    notice,
    conflicts,
    selectionReady,
  } = useBookingQuote();
  const [result, setResult] = useState(null);
  const [retry, setRetry] = useState(0);
  const [monthCursor, setMonthCursor] = useState(() =>
    startOfMonth(parseISODate(date || propertyToday())),
  );
  const monthStart = toISODate(monthCursor);
  const currentResult =
    result?.code === code &&
    result?.retry === retry &&
    result?.guests === guests &&
    result?.monthStart === monthStart
      ? result
      : null;
  const availability = currentResult?.days ?? null;
  const state = currentResult?.state ?? 'loading';

  const positioned = useRef(false);
  useEffect(() => {
    if (!selectionReady || positioned.current) return;
    positioned.current = true;
    if (date) {
      const frame = requestAnimationFrame(() => setMonthCursor(startOfMonth(parseISODate(date))));
      return () => cancelAnimationFrame(frame);
    }
  }, [selectionReady, date]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const request = () =>
          fetchAvailability({
            code,
            from: availabilityMonthRange(monthStart, propertyToday()).from,
            days: Math.round(
              (addMonths(monthCursor, 2) -
                parseISODate(availabilityMonthRange(monthStart, propertyToday()).from)) /
                86400000,
            ),
            guests,
            signal: controller.signal,
          });
        // One quiet retry: a single dropped request is not worth an error banner.
        const data = await request().catch(async (error) => {
          if (controller.signal.aborted) throw error;
          await new Promise((resolve) => setTimeout(resolve, 800));
          if (controller.signal.aborted) throw error;
          return request();
        });
        if (!controller.signal.aborted)
          setResult({
            code,
            retry,
            guests,
            monthStart,
            days: data.days,
            message: data.message,
            state: 'ready',
          });
      } catch {
        if (!controller.signal.aborted)
          setResult({ code, retry, guests, monthStart, days: null, state: 'error' });
      }
    }
    load();

    return () => controller.abort();
  }, [code, retry, guests, monthStart, monthCursor]);

  const openOn = (iso) => {
    if (!availability) return null; // unknown, not "unavailable"
    const entry = availability[iso];
    if (!entry) return false;
    return slot === 'full_day' ? entry.full === true : entry[slot] === true;
  };

  const months = useMemo(() => [monthCursor, addMonths(monthCursor, 1)], [monthCursor]);
  const today = propertyToday();
  const canGoBack = startOfMonth(parseISODate(today)) < monthCursor;

  return (
    <section aria-labelledby="availability-heading" className="scroll-mt-24" id="availability">
      <h2 id="availability-heading" className="text-h2">
        Choose your visits
      </h2>
      <p className="mt-2 text-sm text-ink-600">
        Day picnic, overnight or full day. Pick one date or plan up to 10 visits.
      </p>
      <button
        type="button"
        onClick={() => setCalendarOpen(true)}
        className="mt-5 flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left hover:border-brand-500"
      >
        <CalendarDays className="size-5 text-brand-700" />
        <span className="flex-1">
          {dates.length
            ? `${dates.length} visit${dates.length === 1 ? '' : 's'} selected · ${SLOTS[slot].label}`
            : 'Choose dates & visit type'}
        </span>
        <span className="text-sm font-semibold text-brand-700">
          {dates.length ? 'Edit' : 'Open calendar'}
        </span>
      </button>
      <Dialog.Root open={calendarOpen} onOpenChange={setCalendarOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[80] bg-ink-900/30 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-[90] max-h-[92dvh] w-[calc(100%-1rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-4 shadow-2xl sm:p-8">
            <Dialog.Title className="pr-10 text-2xl font-semibold">
              {dates.length
                ? `${dates.length} visit${dates.length === 1 ? '' : 's'} selected`
                : 'Choose your dates'}
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-ink-600">
              Choose up to 10 visits. Each date has its own arrival and departure.
            </Dialog.Description>
            <Dialog.Close
              aria-label="Close calendar"
              className="absolute top-3 right-3 grid size-11 place-items-center rounded-full hover:bg-ink-50"
            >
              <X className="size-5" />
            </Dialog.Close>
            {currentResult?.message ? (
              <p role="status" className="mt-2 text-xs text-ink-600">
                {currentResult.message}
              </p>
            ) : null}
            <div className="mt-5">
              <div role="group" aria-label="Visit type" className="grid grid-cols-3 gap-2">
                {Object.values(SLOTS).map((item) => {
                  const Icon = SLOT_ICONS[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={slot === item.id}
                      disabled={!prices?.[item.id] || !selectionReady}
                      onClick={() => setSlot(item.id)}
                      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-2 text-sm ${slot === item.id ? 'border-brand-600 bg-brand-600 font-semibold text-white' : 'bg-card hover:border-brand-400'} disabled:opacity-40`}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4">
                <DateModeSelect value={mode} onValueChange={setMode} disabled={!selectionReady} />
              </div>
              <p className="mt-2 text-xs text-ink-600">
                {mode === 'consecutive'
                  ? anchor
                    ? 'Choose the last date. Every date in between will be checked.'
                    : 'Choose the first date, then the last date.'
                  : mode === 'separate'
                    ? 'Tap dates to add or remove visits.'
                    : 'Tap a date to replace your selection.'}
              </p>
              <p role="status" className="sr-only">
                {notice || `${dates.length} visit${dates.length === 1 ? '' : 's'} selected.`}
              </p>
            </div>

            <div className="mt-5">
              <div className="mb-4 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMonthCursor(addMonths(monthCursor, -1))}
                  disabled={!canGoBack}
                  aria-label="Previous month"
                  className="grid size-11 place-items-center rounded-full hover:bg-brand-50 disabled:opacity-30"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <p className="text-xs text-ink-500">Select the dates you’ll visit</p>
                <button
                  type="button"
                  onClick={() => setMonthCursor(addMonths(monthCursor, 1))}
                  disabled={monthCursor >= addMonths(startOfMonth(parseISODate(today)), 12)}
                  aria-label="Next month"
                  className="grid size-11 place-items-center rounded-full hover:bg-brand-50 disabled:opacity-30"
                >
                  <ChevronRight className="size-5" />
                </button>
              </div>
              <div className="grid gap-6 sm:grid-cols-2">
                {months.map((cursor, monthIndex) => (
                  <div key={toISODate(cursor)} className={monthIndex ? 'hidden sm:block' : ''}>
                    <h3 className="rounded-lg bg-brand-50 py-3 text-center font-semibold">
                      {cursor.toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric',
                        timeZone: 'UTC',
                      })}
                    </h3>
                    <div className="mt-3 grid grid-cols-7 gap-1" aria-hidden="true">
                      {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                        <span key={i} className="py-1 text-center text-tiny font-bold text-ink-500">
                          {d}
                        </span>
                      ))}
                    </div>

                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {buildMonth(cursor).map((cell, i) => {
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
                            aria-disabled={
                              !selectionReady || isPast || (open !== true && !selected)
                            }
                            aria-pressed={selected}
                            data-visit-date={iso}
                            onKeyDown={(event) => {
                              const offsets = {
                                ArrowLeft: -1,
                                ArrowRight: 1,
                                ArrowUp: -7,
                                ArrowDown: 7,
                              };
                              if (!(event.key in offsets)) return;
                              event.preventDefault();
                              const target = new Date(cell);
                              target.setUTCDate(target.getUTCDate() + offsets[event.key]);
                              if (toISODate(target) < today) return;
                              setMonthCursor(startOfMonth(target));
                              requestAnimationFrame(() =>
                                document
                                  .querySelector(
                                    `[role="dialog"] [data-visit-date="${toISODate(target)}"]`,
                                  )
                                  ?.focus(),
                              );
                            }}
                            aria-label={`${formatDayLabel(iso)}${open === false ? ' — not available' : ''}`}
                            onClick={() => {
                              if (selectionReady && !isPast && (open === true || selected)) {
                                if (!selected)
                                  measureBrowser(
                                    'dates_selected',
                                    dates.length ? 'multiple' : 'single',
                                  );
                                pickDate(iso);
                              }
                            }}
                            className={[
                              'relative min-h-11 rounded-full py-2 text-center text-meta tabular transition-colors',
                              selected
                                ? 'bg-brand-600 font-bold text-white'
                                : open
                                  ? 'font-medium text-ink-900 hover:bg-brand-50 hover:text-brand-700'
                                  : 'text-ink-300',
                              pending && !selected && 'animate-pulse bg-ink-50 text-ink-500',
                              (isPast || open === false) &&
                                'cursor-not-allowed line-through decoration-ink-300',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          >
                            {cell.getUTCDate()}
                            {iso === today && !selected ? (
                              <span className="absolute inset-x-0 -bottom-0.5 mx-auto size-1 rounded-full bg-brand-600" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <Legend
                state={state}
                nextDates={nextDates}
                slot={slot}
                onRetry={() => {
                  setRetry((value) => value + 1);
                }}
              />
            </div>
            <ul aria-label="Selected visits" className="mt-3 flex flex-wrap gap-2">
              {dates.map((day) => (
                <li key={day}>
                  <button
                    type="button"
                    aria-label={`Remove ${formatDayLabel(day)}`}
                    onClick={() => removeDate(day)}
                    className="min-h-11 rounded-full border border-brand-200 bg-brand-50 px-3 text-meta"
                  >
                    {formatDayLabel(day)} ×
                    {conflicts.some((c) => c.date === day) ||
                    (availability?.[day] && openOn(day) === false)
                      ? ' · needs attention'
                      : ''}
                  </button>
                </li>
              ))}
            </ul>
            {dates.length ? (
              <button
                type="button"
                onClick={clearDates}
                className="min-h-11 text-meta text-brand-700 underline"
              >
                Clear dates
              </button>
            ) : null}
            <div className="sticky -bottom-4 mt-4 flex items-center justify-between border-t border-border bg-card py-3 sm:-bottom-8">
              <p className="text-xs text-ink-500">{dates.length} of 10 visits selected</p>
              <Dialog.Close className="min-h-11 rounded-lg bg-brand-700 px-7 text-sm font-semibold text-white hover:bg-brand-800">
                Done
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
          <button
            type="button"
            onClick={onRetry}
            className="ml-1 min-h-11 font-semibold text-brand-700 underline"
          >
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
      {state === 'loading' ? (
        <RentraLoader className="ml-auto" label="Checking live dates" />
      ) : null}
    </div>
  );
}

const startOfMonth = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

/** Month as a flat cell list, Monday-first, padded with nulls. */
function buildMonth(cursor) {
  const first = startOfMonth(cursor);
  const lead = (first.getUTCDay() + 6) % 7; // shift Sunday-first to Monday-first
  const total = new Date(
    Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0),
  ).getUTCDate();

  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from(
      { length: total },
      (_, i) => new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), i + 1)),
    ),
  ];
}
