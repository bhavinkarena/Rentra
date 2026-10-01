'use client';

import { useId, useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { useBookingQuote } from './booking-context';
import { addLocalDays, formatLocalDate, parseLocalDate } from '@/lib/domain/booking-dates';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { clock12, unitName } from '@/lib/domain/vertical-ui';

/**
 * Activity → date strip → duration → start times → court → players (entertainment
 * plan, Phase 9). Used in the desktop rail and the phone sheet; state lives in
 * HourlyQuoteProvider, so both show the same selection.
 */

const field = 'mb-1.5 block text-meta font-bold text-ink-900';
const select =
  'min-h-11 w-full rounded-md border border-input bg-card px-3 text-base text-foreground md:text-sm';
const hours = (minutes) => `${minutes / 60} hr`;

export default function TimeSlotPicker({ activities, horizonDays = 60 }) {
  const ctx = useBookingQuote();
  const id = useId();
  const unit = unitName(activities.find((a) => a.slug === ctx.activity)?.iconKey).toLowerCase();
  const day = formatLocalDate(ctx.date);
  const lastDay = addLocalDays(ctx.today, horizonDays);

  return (
    <div className="space-y-4">
      {activities.length > 1 ? (
        <div>
          <label htmlFor={`${id}-activity`} className={field}>
            Activity
          </label>
          <select
            id={`${id}-activity`}
            className={select}
            value={ctx.activity}
            onChange={(event) => ctx.setActivity(event.target.value)}
          >
            {activities.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <DateStrip
        id={id}
        today={ctx.today}
        count={ctx.stripDays}
        lastDay={lastDay}
        value={ctx.date}
        days={ctx.days?.days}
        onChange={ctx.setDate}
      />

      <DurationStepper
        id={id}
        value={ctx.durationMinutes}
        durations={ctx.times?.durations}
        onChange={ctx.setDuration}
      />

      <div>
        <p id={`${id}-times`} className={field}>
          Start time
        </p>
        <TimeGrid id={id} day={day} unit={unit} ctx={ctx} />
      </div>

      <CourtAndPlayers id={id} unit={unit} ctx={ctx} />
    </div>
  );
}

/* ------------------------------------------------------------ date strip */

function DateStrip({ id, today, count, lastDay, value, days, onChange }) {
  const strip = [];
  for (let i = 0; i < count; i += 1) {
    const date = addLocalDays(today, i);
    if (date > lastDay) break;
    strip.push(date);
  }
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p id={`${id}-date`} className="text-meta font-bold text-ink-900">
          Date
        </p>
        {/* Native date input: the farther future without a second calendar component. */}
        <label className="text-tiny font-semibold text-brand-700">
          <span className="sr-only">Pick any date</span>
          <input
            type="date"
            min={today}
            max={lastDay}
            value={value}
            onChange={(event) => event.target.value && onChange(event.target.value)}
            className="min-h-9 rounded-md border border-border bg-card px-2 text-tiny"
          />
        </label>
      </div>
      <div
        role="group"
        aria-labelledby={`${id}-date`}
        className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:thin]"
      >
        {strip.map((date) => {
          const info = days?.[date];
          const state = !info ? null : !info.open ? 'Closed' : info.freeStarts ? null : 'Full';
          const d = parseLocalDate(date);
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              aria-pressed={selected}
              aria-label={`${formatLocalDate(date, { weekday: 'long' })}${state ? `, ${state.toLowerCase()}` : ''}`}
              onClick={() => onChange(date)}
              className={`flex min-h-16 w-14 shrink-0 snap-start flex-col items-center justify-center rounded-lg border text-tiny transition-colors ${
                selected
                  ? 'border-primary bg-primary text-white'
                  : state
                    ? 'border-border text-ink-400'
                    : 'border-border text-ink-600 hover:border-brand-300'
              }`}
            >
              <span>{d.toLocaleDateString('en-IN', { weekday: 'short', timeZone: 'UTC' })}</span>
              <span className="text-h4 font-bold tabular">{d.getUTCDate()}</span>
              {state ? <span className="text-[11px] leading-none">{state}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------- duration stepper */

function DurationStepper({ id, value, durations, onChange }) {
  const list = durations?.length ? durations : [value];
  const index = list.indexOf(value);
  const button =
    'grid size-11 place-items-center rounded-full border border-ink-300 text-ink-800 hover:bg-ink-50 disabled:opacity-40';
  if (list.length < 2) return null;
  return (
    <div>
      <p id={`${id}-duration`} className={field}>
        Duration
      </p>
      <div
        role="group"
        aria-labelledby={`${id}-duration`}
        className="flex items-center justify-between rounded-full border border-ink-400 p-1"
      >
        <button
          type="button"
          className={button}
          aria-label="Shorter"
          disabled={index <= 0}
          onClick={() => onChange(list[index - 1])}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <output aria-live="polite" className="text-base font-bold tabular">
          {hours(value)}
        </output>
        <button
          type="button"
          className={button}
          aria-label="Longer"
          disabled={index === -1 || index >= list.length - 1}
          onClick={() => onChange(list[index + 1])}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- time grid */

const chipLabel = (t, unit) =>
  `${clock12(t.start)} to ${clock12(t.end)}${t.endsNextDay ? ' next day' : ''}, ${formatINRMinor(
    t.rentMinor,
  )}${t.peak ? ', Peak' : ''}, ${t.freeResourceIds.length} ${unit}${
    t.freeResourceIds.length === 1 ? '' : 's'
  } free`;

/** Chips with a roving tabindex: Tab enters once, arrow keys move. */
function TimeGrid({ id, day, unit, ctx }) {
  const grid = useRef(null);
  if (ctx.timesLoading)
    return (
      <div className="grid grid-cols-3 gap-2" aria-busy="true" aria-label="Loading start times">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    );
  if (ctx.timesError)
    return (
      <div className="rounded-md bg-ink-50 p-3 text-meta" role="status">
        {ctx.timesError === 'ACTIVITY_UNAVAILABLE'
          ? 'No court takes this many players for this activity.'
          : 'Start times could not load.'}{' '}
        <button
          type="button"
          onClick={ctx.retry}
          className="font-semibold text-brand-700 underline"
        >
          Try again
        </button>
      </div>
    );
  const times = ctx.times.times;
  if (!times.length)
    return (
      <div className="rounded-md bg-ink-50 p-3 text-meta" role="status">
        <p>No times left on {day}.</p>
        {ctx.times.nextOpenDate ? (
          <button
            type="button"
            onClick={() => ctx.setDate(ctx.times.nextOpenDate)}
            className="mt-2 inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 font-semibold text-brand-700"
          >
            Next open: {formatLocalDate(ctx.times.nextOpenDate)}
          </button>
        ) : null}
      </div>
    );
  const focusIndex = Math.max(
    0,
    times.findIndex((t) => t.start === ctx.start),
  );
  const move = (event, index) => {
    const delta = { ArrowRight: 1, ArrowDown: 3, ArrowLeft: -1, ArrowUp: -3 }[event.key];
    const to =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? times.length - 1
          : delta
            ? index + delta
            : null;
    if (to == null) return;
    event.preventDefault();
    grid.current?.querySelectorAll('button')[Math.min(Math.max(to, 0), times.length - 1)]?.focus();
  };
  return (
    <div
      ref={grid}
      role="group"
      aria-labelledby={`${id}-times`}
      aria-describedby={`${id}-times-day`}
      className="grid grid-cols-3 gap-2"
    >
      <span id={`${id}-times-day`} className="sr-only">
        {day}
      </span>
      {times.map((t, index) => {
        const selected = t.start === ctx.start;
        return (
          <button
            key={t.start}
            type="button"
            aria-pressed={selected}
            aria-label={chipLabel(t, unit)}
            tabIndex={index === focusIndex ? 0 : -1}
            onKeyDown={(event) => move(event, index)}
            onClick={() => ctx.setStart(t.start)}
            className={`flex min-h-14 flex-col items-center justify-center rounded-lg border text-meta font-semibold tabular transition-colors ${
              selected
                ? 'border-2 border-primary bg-brand-50'
                : 'border-ink-300 hover:border-brand-400'
            }`}
          >
            {clock12(t.start)}
            <span className="flex items-center gap-1 text-tiny font-medium text-ink-600">
              {t.peak ? (
                <span className="size-1.5 rounded-full bg-warning" aria-hidden="true" />
              ) : null}
              {formatINRMinor(t.rentMinor)}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------- court and players */

function CourtAndPlayers({ id, unit, ctx }) {
  const resources = ctx.times?.resources ?? [];
  const free = ctx.chosenTime?.freeResourceIds ?? [];
  const max = Math.max(ctx.guests, ...resources.map((r) => r.capacity));
  const button =
    'grid size-11 place-items-center rounded-full border border-ink-300 text-ink-800 hover:bg-ink-50 disabled:opacity-40';
  return (
    <>
      {ctx.chosenTime && resources.length > 1 ? (
        <div>
          <label htmlFor={`${id}-court`} className={field}>
            {unit.charAt(0).toUpperCase() + unit.slice(1)}
          </label>
          <select
            id={`${id}-court`}
            className={select}
            value={ctx.resourceId ?? ''}
            onChange={(event) => ctx.setResource(event.target.value)}
          >
            <option value="">
              Any available {unit} ({free.length} free)
            </option>
            {resources
              .filter((r) => free.includes(r.id))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </div>
      ) : resources.length === 1 ? (
        <p className="text-meta text-ink-600">1 {unit}</p>
      ) : null}
      <div>
        <p id={`${id}-players`} className={field}>
          Players
        </p>
        <div
          role="group"
          aria-labelledby={`${id}-players`}
          className="flex items-center justify-between rounded-full border border-ink-400 p-1"
        >
          <button
            type="button"
            className={button}
            aria-label="Fewer players"
            disabled={ctx.guests <= 1}
            onClick={() => ctx.setGuests(ctx.guests - 1)}
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <output aria-live="polite" className="text-base font-bold tabular">
            {ctx.guests}
          </output>
          <button
            type="button"
            className={button}
            aria-label="More players"
            disabled={ctx.guests >= max}
            onClick={() => ctx.setGuests(ctx.guests + 1)}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </>
  );
}
