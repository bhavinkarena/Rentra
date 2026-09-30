'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Popover } from 'radix-ui';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Minus,
  Plus,
  Search,
  Sun,
  Users,
  X,
} from 'lucide-react';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { BOOKING_POLICY } from '@/lib/domain/booking-policy';
import { SLOTS } from '@/lib/domain/pricing';

const roundButton =
  'grid size-11 shrink-0 place-items-center rounded-full border border-border text-ink-700 hover:border-brand-600 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-30';
const modes = [
  ['single', 'One visit'],
  ['consecutive', 'Consecutive visits'],
  ['separate', 'Separate dates'],
];

/** Shared by home and discovery. Hidden fields stay in the form while panels portal out. */
export default function SearchFields({
  filters = {},
  registry = { cities: [], areas: [] },
  route,
  submitLabel = 'Search',
  draft,
  onFieldChange,
}) {
  const [active, setActive] = useState(null);
  const [localFields, setLocalFields] = useState({
    location: { city: filters.city || '', area: filters.area || '' },
    slot: route?.intent?.slot || filters.slot || 'day',
    mode: filters.mode || 'single',
    dates: filters.dates || [],
    guests: filters.guests || 2,
  });
  const fields = draft || localFields;
  const { location, slot, mode, dates, guests } = fields;
  const setField = (name, value) => {
    const next = typeof value === 'function' ? value(fields[name]) : value;
    if (onFieldChange) onFieldChange(name, next);
    else setLocalFields((current) => ({ ...current, [name]: next }));
  };
  const setLocation = (value) => setField('location', value);
  const setSlot = (value) => setField('slot', value);
  const setMode = (value) => setField('mode', value);
  const setDates = (value) => setField('dates', value);
  const setGuests = (value) => setField('guests', value);
  const [query, setQuery] = useState('');
  const today = propertyToday();
  const lastDate = addLocalDays(today, 365);
  const [month, setMonth] = useState(() => (dates[0] || today).slice(0, 7));
  const { pending } = useFormStatus();
  const city = registry.cities.find((item) => item.slug === location.city);
  const area = registry.areas.find(
    (item) => item.slug === location.area && item.cityId === city?.id,
  );
  const where =
    route?.area?.name || route?.city?.name || area?.name || city?.name || 'Explore locations';
  const dateLabel = !dates.length
    ? 'Add dates'
    : dates.length === 1
      ? formatLocalDate(dates[0])
      : mode === 'consecutive'
        ? `${formatLocalDate(dates[0])} – ${formatLocalDate(dates.at(-1))}`
        : `${dates.length} dates selected`;
  const locations = registry.cities
    .flatMap((item) => [
      { city: item.slug, area: '', title: item.name, subtitle: `Explore places in ${item.name}` },
      ...registry.areas
        .filter((candidate) => candidate.cityId === item.id)
        .map((candidate) => ({
          city: item.slug,
          area: candidate.slug,
          title: candidate.name,
          subtitle: item.name,
        })),
    ])
    .filter((item) =>
      `${item.title} ${item.subtitle}`.toLowerCase().includes(query.trim().toLowerCase()),
    );

  function selectDate(date) {
    if (mode === 'single') setDates([date]);
    else if (mode === 'separate')
      setDates((current) =>
        current.includes(date)
          ? current.filter((item) => item !== date)
          : [...current, date].sort(),
      );
    else
      setDates((current) =>
        current.length !== 1 || date < current[0] ? [date] : [current[0], date],
      );
  }

  function panel(id, label, value, Icon, children, wide = false) {
    return (
      <Popover.Root
        open={active === id}
        onOpenChange={(open) =>
          setActive((current) => (open ? id : current === id ? null : current))
        }
      >
        <Popover.Trigger asChild>
          <button
            data-search-field={id}
            type="button"
            className="group flex min-h-20 min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 data-[state=open]:bg-white data-[state=open]:shadow-md md:rounded-full md:px-5"
          >
            <Icon className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block text-tiny font-semibold text-ink-900">{label}</span>
              <span className="mt-1 block truncate text-meta text-ink-600">{value}</span>
            </span>
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="bottom"
            align={id === 'guests' ? 'end' : 'start'}
            sideOffset={12}
            collisionPadding={16}
            aria-label={label}
            data-search-panel
            data-surface="light"
            onCloseAutoFocus={(event) => {
              if (active && active !== id) event.preventDefault();
            }}
            className={`z-[80] max-h-[min(720px,var(--radix-popover-content-available-height))] w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-3xl border border-border bg-card p-5 text-ink-900 shadow-lg outline-none sm:p-7 ${wide ? 'sm:w-[720px]' : 'sm:w-[390px]'}`}
          >
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-h4">
                {label === 'Where'
                  ? 'Where would you like to go?'
                  : label === 'When'
                    ? 'Choose your visit dates'
                    : label === 'Who'
                      ? 'Who’s coming along?'
                      : 'Make a day of it'}
              </h2>
              <Popover.Close
                className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-ink-50"
                aria-label={`Close ${label.toLowerCase()} panel`}
              >
                <X className="size-4" />
              </Popover.Close>
            </div>
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <div className="grid grid-cols-2 items-center rounded-3xl border border-border bg-ink-50 p-1.5 shadow-sm md:flex md:rounded-full">
      {!route?.city && <input type="hidden" name="city" value={location.city} />}
      {!route?.area && <input type="hidden" name="area" value={route?.city ? '' : location.area} />}
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="guests" value={guests} />
      {mode === 'separate' ? (
        <input type="hidden" name="dates" value={dates.join(',')} />
      ) : (
        <>
          <input type="hidden" name="date" value={dates[0] || ''} />
          {mode === 'consecutive' && <input type="hidden" name="end" value={dates.at(-1) || ''} />}
        </>
      )}

      {panel(
        'location',
        'Where',
        where,
        MapPin,
        route?.city ? (
          <p className="text-meta text-ink-600">
            Showing places in {where}. Use the main search to explore other locations.
          </p>
        ) : (
          <>
            <label className="flex items-center gap-3 rounded-xl border border-ink-300 px-4 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
              <Search className="size-4 text-brand-600" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a city or area"
                aria-label="Search locations"
                className="min-h-12 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
            </label>
            <p className="mt-5 mb-2 text-tiny font-semibold text-ink-600">
              {query ? 'Matching locations' : 'Explore Gujarat'}
            </p>
            <div className="max-h-80 overflow-y-auto">
              {!query && (
                <LocationOption
                  title="All locations"
                  subtitle="Find your next day out"
                  selected={!location.city}
                  onClick={() => {
                    setLocation({ city: '', area: '' });
                    setActive('dates');
                  }}
                />
              )}
              {locations.map((item) => (
                <LocationOption
                  key={`${item.city}:${item.area}`}
                  {...item}
                  selected={location.city === item.city && location.area === item.area}
                  onClick={() => {
                    setLocation(item);
                    setActive('dates');
                  }}
                />
              ))}
              {!locations.length && (
                <p className="py-4 text-meta text-ink-600">
                  {query
                    ? 'No matching locations. Try another city or area.'
                    : 'Locations are unavailable right now. You can still search all places.'}
                </p>
              )}
            </div>
          </>
        ),
      )}

      {panel(
        'dates',
        'When',
        dateLabel,
        CalendarDays,
        <>
          <div className="mb-6 flex flex-wrap gap-1 rounded-2xl bg-ink-50 p-1">
            {modes.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={mode === value}
                onClick={() => {
                  setMode(value);
                  setDates([]);
                }}
                className={`min-h-11 flex-1 rounded-xl px-3 text-tiny font-semibold ${mode === value ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-600 hover:bg-white'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={month <= today.slice(0, 7)}
              className={roundButton}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="px-2 text-center text-tiny text-ink-600">
              {mode === 'single'
                ? 'Choose a date for your visit'
                : mode === 'consecutive'
                  ? 'Choose the first and last visit'
                  : `Choose up to ${BOOKING_POLICY.maxVisits} visit dates`}
            </p>
            <button
              type="button"
              aria-label="Next month"
              disabled={month >= lastDate.slice(0, 7)}
              className={roundButton}
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <div className="grid gap-7 sm:grid-cols-2">
            {[month, shiftMonth(month, 1)].map((value, index) => (
              <div key={value} className={index ? 'hidden sm:block' : ''}>
                <CalendarMonth
                  month={value}
                  today={today}
                  lastDate={lastDate}
                  dates={dates}
                  mode={mode}
                  onSelect={selectDate}
                />
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setDates([])}
              className="min-h-11 text-meta font-semibold text-ink-600 underline underline-offset-4"
            >
              Clear dates
            </button>
            <span className="text-tiny text-ink-600" aria-live="polite">
              {dates.length ? dateLabel : 'Any date works'}
            </span>
            <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700">
              Done
            </Popover.Close>
          </div>
        </>,
        true,
      )}

      {panel(
        'slot',
        'Visit type',
        SLOTS[slot].label,
        Sun,
        <div className="space-y-2">
          {Object.values(SLOTS)
            .filter((item) => !route?.intent?.slot || item.id === route.intent.slot)
            .map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={slot === item.id}
                onClick={() => {
                  setSlot(item.id);
                  setActive('guests');
                }}
                className={`flex min-h-20 w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${slot === item.id ? 'border-brand-600 bg-brand-50' : 'border-border hover:bg-ink-50'}`}
              >
                <span>
                  <span className="block text-meta font-semibold">{item.label}</span>
                  <span className="mt-1 block text-tiny text-ink-600">{item.window}</span>
                </span>
                {slot === item.id && <Check className="size-5 text-brand-600" aria-hidden="true" />}
              </button>
            ))}
        </div>,
      )}

      {panel(
        'guests',
        'Who',
        `${guests} ${guests === 1 ? 'guest' : 'guests'}`,
        Users,
        <>
          <div className="flex items-center justify-between gap-3 py-4">
            <div>
              <p className="font-semibold">Guests</p>
              <p className="mt-1 text-tiny text-ink-600">Everyone joining your visit</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Remove guest"
                className={roundButton}
                disabled={guests <= 1}
                onClick={() => setGuests(guests - 1)}
              >
                <Minus className="size-4" />
              </button>
              <input
                aria-label="Number of guests"
                type="number"
                min="1"
                max="500"
                value={guests}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setGuests(Math.min(500, Math.max(1, Math.trunc(value) || 1)));
                }}
                className="min-h-11 w-14 rounded-md bg-transparent text-center text-base outline-brand-600"
              />
              <button
                type="button"
                aria-label="Add guest"
                className={roundButton}
                disabled={guests >= 500}
                onClick={() => setGuests(guests + 1)}
              >
                <Plus className="size-4" />
              </button>
            </div>
          </div>
          <p className="border-t border-border pt-4 text-meta text-ink-600">
            Find a place with room for your whole group.
          </p>
          <div className="mt-5 flex justify-end">
            <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-6 text-meta font-semibold text-white hover:bg-brand-700">
              Done
            </Popover.Close>
          </div>
        </>,
      )}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        onClick={() => setActive(null)}
        className="col-span-2 m-1 flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-meta font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
      >
        <Search className="size-5" aria-hidden="true" />
        {pending ? 'Searching…' : submitLabel}
      </button>
    </div>
  );
}

function LocationOption({ title, subtitle, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-20 w-full items-center gap-4 rounded-2xl p-3 text-left hover:bg-brand-50 focus-visible:outline-brand-600"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <MapPin className="size-5" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block text-meta font-semibold">{title}</span>
        <span className="mt-1 block text-tiny text-ink-600">{subtitle}</span>
      </span>
      {selected && <Check className="size-4 text-brand-600" aria-label="Selected" />}
    </button>
  );
}

function shiftMonth(month, delta) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

function CalendarMonth({ month, today, lastDate, dates, mode, onSelect }) {
  const start = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  return (
    <div>
      <h3 className="mb-5 text-center text-meta font-semibold">
        {start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
      </h3>
      <div className="grid grid-cols-7 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day} className="pb-3 text-tiny text-ink-600">
            {day}
          </span>
        ))}
        {Array.from({ length: start.getUTCDay() }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`;
          const selected = dates.includes(date);
          const inRange =
            mode === 'consecutive' && dates.length === 2 && date > dates[0] && date < dates[1];
          const disabled =
            date < today ||
            date > lastDate ||
            (mode === 'separate' && dates.length >= BOOKING_POLICY.maxVisits && !selected) ||
            (mode === 'consecutive' &&
              dates.length === 1 &&
              date > addLocalDays(dates[0], BOOKING_POLICY.maxVisits - 1));
          return (
            <button
              key={date}
              type="button"
              disabled={disabled}
              aria-label={formatLocalDate(date, { year: 'numeric' })}
              aria-pressed={selected || inRange}
              aria-current={date === today ? 'date' : undefined}
              onClick={() => onSelect(date)}
              className={`my-0.5 aspect-square min-h-10 rounded-full text-meta font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:text-ink-300 ${selected ? 'bg-brand-600 text-white' : inRange ? 'bg-brand-100 text-brand-800' : 'hover:bg-brand-50 aria-[current=date]:underline aria-[current=date]:underline-offset-4'}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
