'use client';

import { useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Popover } from 'radix-ui';
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Building2,
  Clock,
  Landmark,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  Sun,
  Trophy,
  Users,
  X,
  BedDouble,
} from 'lucide-react';
import {
  addLocalDays,
  formatLocalDate,
  parseLocalDate,
  propertyToday,
} from '@/lib/domain/booking-dates';
import { BOOKING_POLICY } from '@/lib/domain/booking-policy';
import { SLOTS } from '@/lib/domain/pricing';
import VisitTypeFilter from './VisitTypeFilter';
import PetsStepper from './PetsStepper';
import { discoveryApi } from '@/lib/api/endpoints';
import { ActivityIcon } from './icons/activity-icons';
import { clock12 as clock } from '@/lib/domain/vertical-ui';

const roundButton =
  'grid size-11 shrink-0 place-items-center rounded-full border border-border text-ink-700 hover:border-brand-600 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-30';
const modes = [
  ['single', 'One visit'],
  ['consecutive', 'Consecutive visits'],
  ['separate', 'Separate dates'],
];
/* Time-booked venues (entertainment plan): the earliest start a guest wants. */
const TIME_BUCKETS = [
  ['', 'Any time'],
  ['06:00', 'Morning'],
  ['12:00', 'Afternoon'],
  ['17:00', 'Evening'],
  ['21:00', 'Late'],
];
const START_TIMES = Array.from(
  { length: 48 },
  (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`,
);
const DURATIONS = [60, 90, 120, 150, 180, 210, 240];
const PLAY_HORIZON_DAYS = 60;
const hoursLabel = (minutes) => `${minutes / 60} hr`;

/** Shared by home and discovery. Hidden fields stay in the form while panels portal out. */
export default function SearchFields({
  filters = {},
  registry = { cities: [], areas: [] },
  route,
  submitLabel,
  draft,
  onFieldChange,
  vertical = 'farmhouse',
}) {
  // Entertainment searches one date, an activity and a time instead of visit dates and guests.
  const play = vertical === 'entertainment';
  // Hotels search a check-in/check-out range, rooms and guests (hotel plan, Phase 6).
  const stayMode = vertical === 'hotel';
  // Story 3.9: pets are a stay party field (farm/villa and hotel), never a venue one.
  const petsOffered = vertical === 'farmhouse' || stayMode;
  const [active, setActive] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);
  const dismissedByScroll = useRef(false);
  const nearbyRequest = useRef(0);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(
    () => () => {
      nearbyRequest.current += 1;
    },
    [active],
  );

  useEffect(() => {
    if (!active) return;
    dismissedByScroll.current = false;
    const startY = window.scrollY;
    const closeOnPageScroll = () => {
      if (window.scrollY === startY) return;
      dismissedByScroll.current = true;
      setActive(null);
    };
    // Listen only to page scrolling, not scrolling inside a search panel.
    window.addEventListener('scroll', closeOnPageScroll, { passive: true });
    return () => window.removeEventListener('scroll', closeOnPageScroll);
  }, [active]);
  const [localFields, setLocalFields] = useState({
    location: { city: filters.city || '', area: filters.area || '', near: filters.near || '' },
    slot: route?.intent?.slot || filters.slot || 'day',
    mode: filters.mode || 'single',
    dates: filters.dates || [],
    guests: filters.guests || 2,
    activity: filters.category || '',
    date: filters.dates?.[0] || '',
    start: filters.start || '',
    duration: filters.duration || 60,
    stay: filters.checkin ? [filters.checkin, filters.checkout] : [],
    rooms: filters.rooms || 1,
    adults: filters.adults || 2,
    childAges: filters.children || [],
    pets: filters.pets || 0,
  });
  const fields = draft || localFields;
  const { location, slot, mode, dates, guests, activity, date, start, duration } = fields;
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
  const [month, setMonth] = useState(() => ((play ? date : dates[0]) || today).slice(0, 7));
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
      {
        city: item.slug,
        area: '',
        title: item.name,
        subtitle: `Explore ${play ? 'venues' : 'places'} in ${item.name}`,
      },
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

  async function findNearby() {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Location is unavailable in this browser. Choose a city or area below.');
      return;
    }
    const request = ++nearbyRequest.current;
    setLocating(true);
    try {
      const position = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          maximumAge: 60000,
        }),
      );
      if (request !== nearbyRequest.current) return;
      const places = await discoveryApi.nearby({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        km: 25,
        limit: 1,
      });
      if (request !== nearbyRequest.current) return;
      // Nearby cards expose the public area/city label, not private property coordinates.
      const match = registry.areas.find((candidate) => {
        const parent = registry.cities.find((item) => item.id === candidate.cityId);
        return parent && `${candidate.name}, ${parent.name}` === places?.[0]?.area;
      });
      if (!match) {
        setLocationError('No supported places found within 25 km. Choose a city or area below.');
        return;
      }
      const parent = registry.cities.find((item) => item.id === match.cityId);
      setLocation({ city: parent.slug, area: match.slug, title: match.name });
      setQuery('');
      setActive(play ? 'activity' : 'dates');
    } catch (error) {
      if (request !== nearbyRequest.current) return;
      setLocationError(
        error.code === 1
          ? 'Location permission was denied. Allow location in your browser or choose an area below.'
          : 'Could not find your location or nearby places. Try again or choose an area below.',
      );
    } finally {
      setLocating(false);
    }
  }

  function selectDate(date) {
    setHoverDate(null);
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

  function panel(id, label, value, Icon, children, wide = false, heading = null) {
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
            className="group flex min-h-16 min-w-0 flex-1 items-center gap-2.5 rounded-2xl px-4 py-2 text-left transition-colors hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 data-[state=open]:bg-white data-[state=open]:shadow-md md:rounded-full md:px-5"
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
            align={id === 'guests' || id === 'time' ? 'end' : 'start'}
            sideOffset={8}
            collisionPadding={16}
            aria-label={label}
            data-search-panel
            data-surface="light"
            onCloseAutoFocus={(event) => {
              // Restoring focus to the hero after scrolling would jump the page back.
              if (dismissedByScroll.current || (active && active !== id)) event.preventDefault();
            }}
            className={`z-[80] max-h-[min(560px,var(--radix-popover-content-available-height))] w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-3xl border border-border bg-card p-4 text-ink-900 shadow-lg outline-none sm:p-5 ${wide ? 'sm:w-[640px]' : 'sm:w-[360px]'}`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-h4">
                {heading ??
                  (label === 'Where'
                    ? 'Where would you like to go?'
                    : label === 'When'
                      ? 'Choose your visit dates'
                      : label === 'Who' || label === 'Rooms & guests'
                        ? 'Who’s coming along?'
                        : 'Make a day of it')}
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

  const wherePanel = panel(
    'location',
    'Where',
    where,
    MapPin,
    route?.city ? (
      <p className="text-meta text-ink-600">
        Showing {play ? 'venues' : 'places'} in {where}. Use the main search to explore other
        locations.
      </p>
    ) : (
      <>
        <label
          data-field-shell
          className="flex items-center gap-3 rounded-xl border border-ink-300 px-4 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100"
        >
          <Search className="size-4 text-brand-600" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a city or area"
            aria-label="Search locations"
            className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
          />
        </label>
        <p className="mt-3 mb-1 text-tiny font-semibold text-ink-600">
          {query ? 'Matching locations' : 'Explore Gujarat'}
        </p>
        <div>
          <LocationOption
            title={locating ? 'Finding nearby places…' : 'Nearby me'}
            subtitle="Use my location · areas within 25 km"
            Icon={Navigation}
            disabled={locating}
            onClick={findNearby}
          />
          <p role="status" className="px-2 text-tiny text-ink-600">
            {locationError}
          </p>
          {!query && (
            <LocationOption
              title="All locations"
              subtitle={play ? 'Find a place to play' : 'Find your next day out'}
              selected={!location.city}
              onClick={() => {
                setLocation({ city: '', area: '' });
                setActive(play ? 'activity' : 'dates');
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
                setActive(play ? 'activity' : 'dates');
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
    false,
    play ? 'Where would you like to play?' : null,
  );

  const submit = (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      onClick={() => setActive(null)}
      className="col-span-2 m-1 flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-meta font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
    >
      <Search className="size-5" aria-hidden="true" />
      {pending
        ? 'Searching…'
        : (submitLabel ?? (play ? 'Find venues' : stayMode ? 'Find hotels' : 'Search'))}
    </button>
  );

  if (stayMode)
    return (
      <StayFields
        {...{
          fields,
          setField,
          route,
          registry,
          filters,
          panel,
          submit,
          setActive,
          today,
          month,
          setMonth,
        }}
      />
    );

  if (play) {
    const activities = registry.categories?.filter((item) => item.vertical === vertical) ?? [];
    const chosen = activities.find((item) => item.slug === activity);
    const horizon = addLocalDays(today, PLAY_HORIZON_DAYS);
    // Today, tomorrow and the coming weekend; a day already listed is not repeated.
    const toSaturday = (6 - parseLocalDate(today).getUTCDay() + 7) % 7;
    const quick = [
      ['Today', today],
      ['Tomorrow', addLocalDays(today, 1)],
      [null, addLocalDays(today, toSaturday)],
      [null, addLocalDays(today, toSaturday + 1)],
    ].filter(([, day], i, all) => all.findIndex(([, other]) => other === day) === i);
    const timeLabel = `${
      TIME_BUCKETS.find(([value]) => value === start)?.[1] ?? `From ${clock(start)}`
    } · ${hoursLabel(duration)}`;
    const option = (selected) =>
      `flex min-h-12 items-center gap-2.5 rounded-xl border px-3 text-left text-meta font-medium ${selected ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-border hover:bg-ink-50'}`;

    return (
      <div className="grid grid-cols-2 items-center rounded-3xl border border-border bg-ink-50 p-1.5 shadow-sm md:flex md:rounded-full">
        <input type="hidden" name="vertical" value={vertical} />
        {!route?.city && <input type="hidden" name="city" value={location.city} />}
        {!route?.area && (
          <input type="hidden" name="area" value={route?.city ? '' : location.area} />
        )}
        {!route?.category && <input type="hidden" name="category" value={activity} />}
        <input type="hidden" name="date" value={date} />
        <input type="hidden" name="start" value={start} />
        <input type="hidden" name="duration" value={duration} />

        {wherePanel}

        {panel(
          'activity',
          'What',
          route?.category?.name || chosen?.name || 'Any activity',
          Trophy,
          route?.category ? (
            <p className="text-meta text-ink-600">
              Showing {route.category.name} venues. Use the main search for other activities.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[{ slug: '', name: 'Any activity' }, ...activities].map((item) => (
                <button
                  key={item.slug || 'any'}
                  type="button"
                  aria-pressed={activity === item.slug}
                  onClick={() => {
                    setField('activity', item.slug);
                    setActive('date');
                  }}
                  className={option(activity === item.slug)}
                >
                  <ActivityIcon iconKey={item.iconKey} className="size-6 shrink-0 text-brand-700" />
                  {item.name}
                </button>
              ))}
            </div>
          ),
          true,
          'What are you playing?',
        )}

        {panel(
          'date',
          'When',
          date ? formatLocalDate(date) : 'Any date',
          CalendarDays,
          <>
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Quick dates">
              {quick.map(([label, day]) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={date === day}
                  onClick={() => {
                    setField('date', day);
                    setActive('time');
                  }}
                  className={`min-h-11 rounded-full border px-4 text-meta font-medium ${date === day ? 'border-brand-600 bg-brand-50 text-brand-800' : 'border-border hover:bg-ink-50'}`}
                >
                  {label ?? formatLocalDate(day)}
                </button>
              ))}
            </div>
            <div className="mb-2 flex items-center justify-between">
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
                Bookable up to {PLAY_HORIZON_DAYS} days ahead
              </p>
              <button
                type="button"
                aria-label="Next month"
                disabled={month >= horizon.slice(0, 7)}
                className={roundButton}
                onClick={() => setMonth(shiftMonth(month, 1))}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            <CalendarMonth
              month={month}
              today={today}
              lastDate={horizon}
              dates={date ? [date] : []}
              mode="single"
              onSelect={(day) => {
                setField('date', day);
                setActive('time');
              }}
              hoverDate={null}
              onPreview={() => {}}
            />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setField('date', '')}
                className="min-h-11 text-meta font-semibold text-ink-600 underline underline-offset-4"
              >
                Clear date
              </button>
              <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700">
                Done
              </Popover.Close>
            </div>
          </>,
          false,
          'When do you want to play?',
        )}

        {panel(
          'time',
          'Time',
          timeLabel,
          Clock,
          <>
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="Start time">
              {TIME_BUCKETS.map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={start === value}
                  onClick={() => setField('start', value)}
                  className={option(start === value)}
                >
                  {label}
                  {value ? (
                    <span className="ml-auto text-tiny text-ink-500">from {clock(value)}</span>
                  ) : null}
                </button>
              ))}
            </div>
            <label className="mt-3 block text-tiny font-semibold text-ink-700">
              Specific start time
              <select
                value={start}
                onChange={(event) => setField('start', event.target.value)}
                className="mt-1 min-h-11 w-full rounded-xl border border-ink-300 bg-card px-3 text-base"
              >
                <option value="">Any time</option>
                {START_TIMES.map((value) => (
                  <option key={value} value={value}>
                    {clock(value)}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <div>
                <p className="font-semibold">How long</p>
                <p className="mt-1 text-tiny text-ink-600">Per court, lane or station</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Shorter"
                  className={roundButton}
                  disabled={duration <= DURATIONS[0]}
                  onClick={() => setField('duration', duration - 30)}
                >
                  <Minus className="size-4" />
                </button>
                <span
                  className="w-14 text-center text-meta font-semibold tabular"
                  aria-live="polite"
                >
                  {hoursLabel(duration)}
                </span>
                <button
                  type="button"
                  aria-label="Longer"
                  className={roundButton}
                  disabled={duration >= DURATIONS.at(-1)}
                  onClick={() => setField('duration', duration + 30)}
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-6 text-meta font-semibold text-white hover:bg-brand-700">
                Done
              </Popover.Close>
            </div>
          </>,
          false,
          'What time suits you?',
        )}
        {submit}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 items-center rounded-3xl border border-border bg-ink-50 p-1.5 shadow-sm md:flex md:rounded-full">
      {!route?.city && <input type="hidden" name="city" value={location.city} />}
      {!route?.area && <input type="hidden" name="area" value={route?.city ? '' : location.area} />}
      <input type="hidden" name="slot" value={slot} />
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="guests" value={guests} />
      {petsOffered && fields.pets ? <input type="hidden" name="pets" value={fields.pets} /> : null}
      {mode === 'separate' ? (
        <input type="hidden" name="dates" value={dates.join(',')} />
      ) : (
        <>
          <input type="hidden" name="date" value={dates[0] || ''} />
          {mode === 'consecutive' && <input type="hidden" name="end" value={dates.at(-1) || ''} />}
        </>
      )}

      {wherePanel}

      {panel(
        'dates',
        'When',
        dateLabel,
        CalendarDays,
        <>
          <div className="mb-3 flex flex-wrap gap-1 rounded-2xl bg-ink-50 p-1">
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
          <div className="mb-2 flex items-center justify-between">
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
          <div className="grid gap-5 sm:grid-cols-2" onPointerLeave={() => setHoverDate(null)}>
            {[month, shiftMonth(month, 1)].map((value, index) => (
              <div key={value} className={index ? 'hidden sm:block' : ''}>
                <CalendarMonth
                  month={value}
                  today={today}
                  lastDate={lastDate}
                  dates={dates}
                  mode={mode}
                  onSelect={selectDate}
                  hoverDate={hoverDate}
                  onPreview={setHoverDate}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
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
        <div>
          <VisitTypeFilter
            value={slot}
            items={Object.values(SLOTS).filter(
              (item) => !route?.intent?.slot || item.id === route.intent.slot,
            )}
            onChange={(value) => {
              setSlot(value);
              setActive('guests');
            }}
          />
          <p className="mt-3 text-center text-tiny text-ink-600">
            {SLOTS[slot].label} · {SLOTS[slot].window}
          </p>
        </div>,
      )}

      {panel(
        'guests',
        'Who',
        `${guests} ${guests === 1 ? 'guest' : 'guests'}${petsOffered && fields.pets ? ` · ${fields.pets} ${fields.pets === 1 ? 'pet' : 'pets'}` : ''}`,
        Users,
        <>
          <div className="flex items-center justify-between gap-3 py-2">
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
          {petsOffered ? (
            <PetsStepper
              value={fields.pets || 0}
              onChange={(value) => setField('pets', value)}
              className="border-t border-border"
            />
          ) : null}
          <p className="mt-2 border-t border-border pt-3 text-meta text-ink-600">
            Find a place with room for your whole group.
          </p>
          <div className="mt-3 flex justify-end">
            <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-6 text-meta font-semibold text-white hover:bg-brand-700">
              Done
            </Popover.Close>
          </div>
        </>,
      )}
      {submit}
    </div>
  );
}

function LocationOption({ title, subtitle, selected, onClick, Icon = MapPin, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled}
      className="flex min-h-16 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-brand-50 focus-visible:outline-brand-600 disabled:cursor-wait disabled:opacity-60"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="flex-1">
        <span className="block text-meta font-semibold">{title}</span>
        <span className="mt-1 block text-tiny text-ink-600">{subtitle}</span>
      </span>
      {selected && <Check className="size-4 text-brand-600" aria-label="Selected" />}
    </button>
  );
}

export function shiftMonth(month, delta) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return date.toISOString().slice(0, 7);
}

export function CalendarMonth({
  month,
  today,
  lastDate,
  dates,
  mode,
  onSelect,
  hoverDate,
  onPreview,
  maxSpan = BOOKING_POLICY.maxVisits - 1,
}) {
  const start = new Date(`${month}-01T00:00:00Z`);
  const count = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  return (
    <div>
      <h3 className="mb-2 text-center text-meta font-semibold">
        {start.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
      </h3>
      <div className="grid grid-cols-7 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day} className="pb-2 text-tiny text-ink-600">
            {day}
          </span>
        ))}
        {Array.from({ length: start.getUTCDay() }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`;
          const rangeStart = dates[0];
          const previewing =
            mode === 'consecutive' &&
            dates.length === 1 &&
            hoverDate > rangeStart &&
            hoverDate <= lastDate &&
            hoverDate <= addLocalDays(rangeStart, maxSpan);
          const rangeEnd = previewing ? hoverDate : dates.at(-1);
          const selected =
            mode === 'consecutive'
              ? date === rangeStart || date === rangeEnd
              : dates.includes(date);
          const inRange =
            mode === 'consecutive' &&
            (dates.length > 1 || previewing) &&
            date >= rangeStart &&
            date <= rangeEnd;
          const weekday = (start.getUTCDay() + index) % 7;
          const disabled =
            date < today ||
            date > lastDate ||
            (mode === 'separate' && dates.length >= BOOKING_POLICY.maxVisits && !selected) ||
            (mode === 'consecutive' &&
              dates.length === 1 &&
              date > addLocalDays(dates[0], maxSpan));
          return (
            <div
              key={date}
              className={`my-0.5 ${inRange ? `bg-brand-50 ${date === rangeStart ? 'rounded-l-full' : weekday === 0 || index === 0 ? 'rounded-l-lg' : ''} ${date === rangeEnd ? 'rounded-r-full' : weekday === 6 || index === count - 1 ? 'rounded-r-lg' : ''}` : ''}`}
            >
              <button
                type="button"
                disabled={disabled}
                aria-label={formatLocalDate(date, { year: 'numeric' })}
                aria-pressed={
                  dates.includes(date) ||
                  (mode === 'consecutive' &&
                    dates.length > 1 &&
                    date >= rangeStart &&
                    date <= dates.at(-1))
                }
                aria-current={date === today ? 'date' : undefined}
                onClick={() => onSelect(date)}
                onPointerEnter={() => onPreview(disabled ? null : date)}
                onFocus={() => onPreview(disabled ? null : date)}
                onBlur={() => onPreview(null)}
                className={`grid h-10 w-full place-items-center rounded-full text-meta font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:text-ink-300 ${selected ? 'text-white' : inRange ? 'text-brand-800 hover:bg-brand-100' : 'hover:bg-brand-50 aria-[current=date]:underline aria-[current=date]:underline-offset-4'}`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full ${selected ? 'bg-brand-600' : ''}`}
                >
                  {index + 1}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const MAX_NIGHTS = 30;
const MAX_ROOMS = 8;
const LANDMARK_ICON = { station: Navigation, airport: Navigation };

/**
 * Hotel search cells (hotel plan §4.4): Where (city, area, landmark or hotel
 * name, grouped), Check-in – Check-out (one range, up to 30 nights) and Rooms &
 * guests (children need an age: hotel child rules depend on it).
 */
function StayFields({
  fields,
  setField,
  route,
  registry,
  filters,
  panel,
  submit,
  setActive,
  today,
  month,
  setMonth,
}) {
  const { location, stay, rooms, adults, childAges, pets = 0 } = fields;
  const [query, setQuery] = useState('');
  const [hoverDate, setHoverDate] = useState(null);
  const lastDate = addLocalDays(today, 365);
  const [checkin, checkout] = stay;

  const [answer, setFound] = useState(null);
  useEffect(() => {
    const text = query.trim();
    if (text.length < 2) return;
    let live = true;
    const timer = setTimeout(() => {
      discoveryApi
        .suggest({ q: text, vertical: 'hotel' })
        .then((result) => live && setFound({ text, ...result }))
        .catch(() => live && setFound({ text, error: true }));
    }, 200);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query]);
  // Suggestions for an older query never show under a newer one.
  const found = answer?.text === query.trim() ? answer : null;

  const city = registry.cities.find((item) => item.slug === location.city);
  const area = registry.areas.find(
    (item) => item.slug === location.area && item.cityId === city?.id,
  );
  const landmark = (registry.landmarks ?? []).find((item) => item.slug === location.near);
  const where =
    route?.area?.name ||
    route?.city?.name ||
    landmark?.name ||
    area?.name ||
    city?.name ||
    'Anywhere';
  const nights =
    checkin && checkout ? Math.round((Date.parse(checkout) - Date.parse(checkin)) / 86400000) : 0;
  const stayLabel = checkin
    ? checkout
      ? `${formatLocalDate(checkin)} – ${formatLocalDate(checkout)} · ${nights} night${nights === 1 ? '' : 's'}`
      : `${formatLocalDate(checkin)} – choose check-out`
    : 'Add dates';
  const children = childAges.length;
  const partyLabel = `${rooms} room${rooms === 1 ? '' : 's'} · ${adults} adult${adults === 1 ? '' : 's'}${children ? ` · ${children} child${children === 1 ? '' : 'ren'}` : ''}${pets ? ` · ${pets} pet${pets === 1 ? '' : 's'}` : ''}`;

  const choose = (value) => {
    setField('location', value);
    setQuery('');
    setActive('stay');
  };
  function selectNight(date) {
    setHoverDate(null);
    setField('stay', (current) =>
      current.length !== 1 || date <= current[0] ? [date] : [current[0], date],
    );
    if (stay.length === 1 && date > stay[0]) setActive('party');
  }
  const stepper = (label, value, min, max, onChange, hint) => (
    <div className="flex items-center justify-between gap-3 py-2">
      <div>
        <p className="font-semibold">{label}</p>
        {hint ? <p className="mt-1 text-tiny text-ink-600">{hint}</p> : null}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          className={roundButton}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          <Minus className="size-4" />
        </button>
        <span
          className="w-8 text-center text-meta font-semibold tabular"
          aria-live="polite"
          aria-label={`${value} ${label.toLowerCase()}`}
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          className={roundButton}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
  const group = (title, items) =>
    items?.length ? (
      <div className="mt-2">
        <p className="mb-1 px-2 text-tiny font-semibold text-ink-600">{title}</p>
        {items}
      </div>
    ) : null;
  const landmarksIn = (registry.landmarks ?? []).slice(0, 6);

  return (
    <div className="grid grid-cols-2 items-center rounded-3xl border border-border bg-ink-50 p-1.5 shadow-sm md:flex md:rounded-full">
      <input type="hidden" name="vertical" value="hotel" />
      {!route?.city && (
        <input type="hidden" name="city" value={location.near ? '' : location.city} />
      )}
      {!route?.area && (
        <input
          type="hidden"
          name="area"
          value={route?.city || location.near ? '' : location.area}
        />
      )}
      {!route?.city && location.near ? (
        <input type="hidden" name="near" value={location.near} />
      ) : null}
      {filters.category && !route?.category ? (
        <input type="hidden" name="category" value={filters.category} />
      ) : null}
      <input type="hidden" name="checkin" value={checkout ? checkin : ''} />
      <input type="hidden" name="checkout" value={checkout || ''} />
      <input type="hidden" name="rooms" value={rooms} />
      <input type="hidden" name="adults" value={adults} />
      {children ? <input type="hidden" name="children" value={childAges.join(',')} /> : null}
      {pets ? <input type="hidden" name="pets" value={pets} /> : null}

      <div className="col-span-2 min-w-0 md:flex-[1.3]">
        {panel(
          'location',
          'Where',
          where,
          MapPin,
          route?.city ? (
            <p className="text-meta text-ink-600">
              Showing hotels in {where}. Use the main search to explore other places.
            </p>
          ) : (
            <>
              <label
                data-field-shell
                className="flex items-center gap-3 rounded-xl border border-ink-300 px-4 focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100"
              >
                <Search className="size-4 text-brand-600" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="City, area, landmark or hotel"
                  aria-label="Search city, area, landmark or hotel"
                  className="min-h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
                />
              </label>
              <div role="status" className="sr-only">
                {found && !found.error
                  ? `${found.cities.length + found.areas.length + found.landmarks.length + found.hotels.length} suggestions`
                  : ''}
              </div>
              {query.trim().length >= 2 ? (
                found?.error ? (
                  <p className="py-4 text-meta text-ink-600">
                    Suggestions could not load. Try again.
                  </p>
                ) : found ? (
                  <>
                    {group(
                      'Cities',
                      found.cities.map((item) => (
                        <LocationOption
                          key={item.slug}
                          title={item.name}
                          subtitle="City"
                          Icon={MapPin}
                          onClick={() => choose({ city: item.slug, area: '' })}
                        />
                      )),
                    )}
                    {group(
                      'Areas',
                      found.areas.map((item) => (
                        <LocationOption
                          key={`${item.city}:${item.slug}`}
                          title={item.name}
                          subtitle={item.cityName}
                          Icon={MapPin}
                          onClick={() => choose({ city: item.city, area: item.slug })}
                        />
                      )),
                    )}
                    {group(
                      'Landmarks',
                      found.landmarks.map((item) => (
                        <LocationOption
                          key={item.slug}
                          title={item.name}
                          subtitle={`${item.cityName} · within 5 km`}
                          Icon={LANDMARK_ICON[item.kind] ?? Landmark}
                          onClick={() => choose({ city: item.city, area: '', near: item.slug })}
                        />
                      )),
                    )}
                    {group(
                      'Hotels',
                      found.hotels.map((item) => (
                        <a
                          key={item.href}
                          href={item.href}
                          className="flex min-h-16 w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-brand-50 focus-visible:outline-brand-600"
                        >
                          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                            <Building2 className="size-5" aria-hidden="true" />
                          </span>
                          <span className="flex-1">
                            <span className="block text-meta font-semibold">{item.name}</span>
                            <span className="mt-1 block text-tiny text-ink-600">{item.place}</span>
                          </span>
                        </a>
                      )),
                    )}
                    {!found.cities.length &&
                    !found.areas.length &&
                    !found.landmarks.length &&
                    !found.hotels.length ? (
                      <p className="py-4 text-meta text-ink-600">
                        No matches. Try a city, an area or a hotel name.
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="py-4 text-meta text-ink-600">Searching…</p>
                )
              ) : (
                <>
                  <LocationOption
                    title="Anywhere"
                    subtitle="All hotels on Rentra"
                    selected={!location.city && !location.near}
                    onClick={() => choose({ city: '', area: '' })}
                  />
                  {group(
                    'Cities',
                    registry.cities.map((item) => (
                      <LocationOption
                        key={item.slug}
                        title={item.name}
                        subtitle="City"
                        selected={location.city === item.slug && !location.area && !location.near}
                        onClick={() => choose({ city: item.slug, area: '' })}
                      />
                    )),
                  )}
                  {group(
                    'Popular landmarks',
                    landmarksIn.map((item) => (
                      <LocationOption
                        key={item.slug}
                        title={item.name}
                        subtitle="Hotels within 5 km"
                        Icon={LANDMARK_ICON[item.kind] ?? Landmark}
                        selected={location.near === item.slug}
                        onClick={() =>
                          choose({
                            city: registry.cities.find((c) => c.id === item.cityId)?.slug ?? '',
                            area: '',
                            near: item.slug,
                          })
                        }
                      />
                    )),
                  )}
                </>
              )}
            </>
          ),
          false,
          'Where are you staying?',
        )}
      </div>

      {panel(
        'stay',
        'Check-in – Check-out',
        stayLabel,
        CalendarDays,
        <>
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous month"
              disabled={month <= today.slice(0, 7)}
              className={roundButton}
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="px-2 text-center text-tiny text-ink-600" aria-live="polite">
              {!checkin || checkout
                ? 'Choose your check-in date'
                : `Choose check-out (up to ${MAX_NIGHTS} nights)`}
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
          <div className="grid gap-5 sm:grid-cols-2" onPointerLeave={() => setHoverDate(null)}>
            {[month, shiftMonth(month, 1)].map((value, index) => (
              <div key={value} className={index ? 'hidden sm:block' : ''}>
                <CalendarMonth
                  month={value}
                  today={today}
                  lastDate={checkin && !checkout ? addLocalDays(lastDate, 1) : lastDate}
                  dates={stay}
                  mode="consecutive"
                  maxSpan={MAX_NIGHTS}
                  onSelect={selectNight}
                  hoverDate={hoverDate}
                  onPreview={setHoverDate}
                />
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
            <button
              type="button"
              onClick={() => setField('stay', [])}
              className="min-h-11 text-meta font-semibold text-ink-600 underline underline-offset-4"
            >
              Clear dates
            </button>
            <span className="text-tiny text-ink-600">
              {nights ? `${nights} night${nights === 1 ? '' : 's'}` : 'Add dates for exact prices'}
            </span>
            <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700">
              Done
            </Popover.Close>
          </div>
        </>,
        true,
        'When are you staying?',
      )}

      {panel(
        'party',
        'Rooms & guests',
        partyLabel,
        BedDouble,
        <>
          {stepper('Rooms', rooms, 1, MAX_ROOMS, (value) => {
            setField('rooms', value);
            if (adults < value) setField('adults', value);
          })}
          {stepper(
            'Adults',
            adults,
            rooms,
            Math.min(48, rooms * 6),
            (value) => setField('adults', value),
            'Age 18 or over',
          )}
          {stepper(
            'Children',
            children,
            0,
            Math.min(16, rooms * 4),
            (value) =>
              setField(
                'childAges',
                value > children ? [...childAges, ''] : childAges.slice(0, value),
              ),
            'Age 0–17',
          )}
          {children ? (
            <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-3">
              {childAges.map((age, index) => (
                <label key={index} className="text-tiny font-semibold text-ink-700">
                  Child {index + 1} age
                  <select
                    required
                    value={age}
                    onChange={(event) =>
                      setField(
                        'childAges',
                        childAges.map((value, i) =>
                          i === index ? Number(event.target.value) : value,
                        ),
                      )
                    }
                    className="mt-1 min-h-11 w-full rounded-xl border border-ink-300 bg-card px-3 text-base"
                  >
                    <option value="">Age</option>
                    {Array.from({ length: 18 }, (_, value) => (
                      <option key={value} value={value}>
                        {value === 0 ? 'Under 1' : `${value} year${value === 1 ? '' : 's'}`}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          ) : null}
          <PetsStepper
            value={pets}
            onChange={(value) => setField('pets', value)}
            className="border-t border-border"
          />
          <p className="mt-2 border-t border-border pt-3 text-meta text-ink-600">
            Child prices depend on age. Hotels confirm extra beds and cots.
          </p>
          <div className="mt-3 flex justify-end">
            <Popover.Close className="min-h-11 rounded-full bg-brand-600 px-6 text-meta font-semibold text-white hover:bg-brand-700">
              Done
            </Popover.Close>
          </div>
        </>,
      )}
      {submit}
    </div>
  );
}
