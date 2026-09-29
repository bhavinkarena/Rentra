'use client';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Form from '@/components/navigation/NavigationForm';
import { useState } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { ChevronDown, MapPin, Plus, Search, SlidersHorizontal, X } from 'lucide-react';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { measureBrowser } from '@/lib/domain/browser-measurement';
import { SLOTS } from '@/lib/domain/pricing';

/* 16px text below lg so iOS does not zoom into a focused field. */
const control = `${sharedFieldClass} mt-1 min-h-11`;
/* Inside the search bar on desktop, cells match the home SearchBar. */
const cell =
  'font-medium xl:min-w-0 xl:flex-1 xl:border-r xl:border-border xl:px-5 xl:py-2.5 xl:text-tiny xl:font-bold xl:tracking-wider xl:text-ink-700 xl:uppercase xl:transition-colors xl:hover:bg-ink-50';
const barControl = `${control} xl:mt-0.5 xl:min-h-8 xl:border-0 xl:bg-transparent xl:p-0 xl:font-normal xl:tracking-normal xl:normal-case xl:focus:ring-0`;
const chip =
  'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 aria-expanded:border-brand-300 aria-expanded:bg-brand-50 aria-expanded:text-brand-800';
// One source for slot names (B10): the same labels as the booking box.
const slots = Object.values(SLOTS).map((slot) => [slot.id, slot.label]);

export default function DiscoveryFilters({ filters, registry, route, path }) {
  const today = propertyToday();
  const lastDate = addLocalDays(today, 365);
  const initialLocation = route?.area
    ? `area:${route.city.slug}:${route.area.slug}`
    : route?.city
      ? `city:${route.city.slug}`
      : filters.area
        ? `area:${filters.city}:${filters.area}`
        : filters.city
          ? `city:${filters.city}`
          : '';
  const [location, setLocation] = useState(initialLocation);
  const [mode, setMode] = useState(filters.mode);
  const [dates, setDates] = useState(filters.dates.length ? filters.dates : ['']);
  const [advanced, setAdvanced] = useState(
    Boolean(
      filters.category ||
      filters.min != null ||
      filters.max != null ||
      filters.cancellation ||
      filters.amenities.length,
    ),
  );
  const [kind, city = '', area = ''] = location.split(':');
  // Phones see a one-line summary first so results start in the first screen.
  const [editing, setEditing] = useState(false);
  const activeFilters =
    (filters.q ? 1 : 0) +
    (!route?.category && filters.category ? 1 : 0) +
    (filters.min != null ? 1 : 0) +
    (filters.max != null ? 1 : 0) +
    (filters.cancellation ? 1 : 0) +
    filters.amenities.length;
  const where =
    route?.area?.name ||
    route?.city?.name ||
    (kind === 'area'
      ? registry.areas.find((item) => item.slug === area)?.name
      : kind === 'city'
        ? registry.cities.find((item) => item.slug === city)?.name
        : null) ||
    'Anywhere';
  const summary = [
    slots.find(([value]) => value === filters.slot)?.[1],
    filters.dates.length
      ? filters.dates.length === 1
        ? formatLocalDate(filters.dates[0])
        : `${filters.dates.length} dates`
      : 'Any date',
    `${filters.guests} ${filters.guests === 1 ? 'guest' : 'guests'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  function updateDate(index, value) {
    setDates((current) => current.map((date, position) => (position === index ? value : date)));
  }

  return (
    /* Sort renders beside the result count, outside this element. It joins this
       form through form="discovery-filters" so one submit carries every choice.
       Collapsed fields use display:none, which still submits their values. */
    <Form
      id="discovery-filters"
      action={path}
      onSubmit={() => measureBrowser('search_submitted')}
      className="mt-6 text-meta"
    >
      {!route?.city && <input type="hidden" name="city" value={kind ? city : ''} />}
      {!route?.area && <input type="hidden" name="area" value={kind === 'area' ? area : ''} />}
      {mode === 'separate' && (
        <input type="hidden" name="dates" value={dates.filter(Boolean).join(',')} />
      )}

      <button
        type="button"
        onClick={() => setEditing((open) => !open)}
        aria-expanded={editing}
        aria-controls="discovery-search-fields"
        className="flex min-h-14 w-full items-center gap-3 rounded-full border border-border bg-card py-2 pr-2 pl-4 text-left shadow-sm lg:hidden"
      >
        <Search className="size-5 shrink-0 text-brand-700" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-ink-900">{where}</span>
          <span className="block truncate text-tiny text-ink-600">{summary}</span>
        </span>
        <span className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-brand-50 px-4 font-semibold text-brand-800">
          {editing ? 'Close' : 'Edit'}
          <ChevronDown
            className={`size-4 transition-transform duration-150 ${editing ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </span>
      </button>

      <div id="discovery-search-fields" className={editing ? 'mt-3 lg:mt-0' : 'max-lg:hidden'}>
        <div
          className={`grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-3 shadow-sm lg:grid-cols-3 lg:items-end xl:flex xl:items-stretch xl:gap-0 xl:overflow-hidden xl:p-0 xl:pl-1 ${
            // Several date rows make the bar tall; a pill would clip its corners.
            mode === 'separate' ? '' : 'xl:rounded-full'
          }`}
        >
          <label className={`col-span-2 ${cell} lg:col-span-1`}>
            Where
            {route?.city ? (
              <span className={`${barControl} flex items-center gap-2 bg-ink-50`}>
                <MapPin className="size-4 text-brand-700" aria-hidden="true" />
                {route.area?.name || route.city.name}
              </span>
            ) : (
              <select
                aria-label="Location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                className={barControl}
              >
                <option value="">All locations</option>
                {registry.cities.map((item) => (
                  <optgroup key={item.id} label={item.name}>
                    <option value={`city:${item.slug}`}>Anywhere in {item.name}</option>
                    {registry.areas
                      .filter((candidate) => candidate.cityId === item.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={`area:${item.slug}:${candidate.slug}`}>
                          {candidate.name}, {item.name}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            )}
          </label>

          <label className={cell}>
            Visit type
            <select
              aria-label="Slot"
              name="slot"
              defaultValue={filters.slot}
              className={barControl}
            >
              {(route?.intent?.slot
                ? slots.filter(([value]) => value === route.intent.slot)
                : slots
              ).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className={cell}>
            Date choice
            <select
              aria-label="Date mode"
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className={barControl}
            >
              <option value="single">One visit</option>
              <option value="consecutive">Consecutive visits</option>
              <option value="separate">Separate dates</option>
            </select>
          </label>

          <div className={`col-span-2 ${cell} lg:col-span-1 xl:flex-[1.4]`}>
            {mode === 'single' && (
              <label className="block">
                Visit date
                <input
                  type="date"
                  name="date"
                  defaultValue={dates[0]}
                  min={today}
                  max={lastDate}
                  className={barControl}
                />
              </label>
            )}
            {mode === 'consecutive' && (
              <div className="grid grid-cols-2 gap-2">
                <label>
                  First visit
                  <input
                    type="date"
                    name="date"
                    defaultValue={dates[0]}
                    min={today}
                    max={lastDate}
                    className={barControl}
                  />
                </label>
                <label>
                  Last visit
                  <input
                    type="date"
                    name="end"
                    defaultValue={dates.at(-1)}
                    min={today}
                    max={lastDate}
                    className={barControl}
                  />
                </label>
              </div>
            )}
            {mode === 'separate' && (
              <fieldset>
                <legend>Visit dates</legend>
                <div className="mt-1 flex flex-wrap gap-2">
                  {dates.map((date, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 rounded-full bg-brand-50 p-1 pl-3"
                    >
                      <label className="sr-only" htmlFor={`visit-date-${index}`}>
                        Visit date {index + 1}
                      </label>
                      <input
                        id={`visit-date-${index}`}
                        aria-label={`Visit date ${index + 1}`}
                        type="date"
                        value={date}
                        min={today}
                        max={lastDate}
                        onChange={(event) => updateDate(index, event.target.value)}
                        className="min-h-10 bg-transparent text-base font-normal tracking-normal normal-case lg:text-meta"
                      />
                      {dates.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setDates((current) =>
                              current.filter((_, position) => position !== index),
                            )
                          }
                          className="grid size-10 place-items-center rounded-full hover:bg-white"
                          aria-label={`Remove ${date ? formatLocalDate(date) : `date ${index + 1}`}`}
                        >
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  {dates.length < 10 && (
                    <button
                      type="button"
                      onClick={() => setDates((current) => [...current, ''])}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 font-medium tracking-normal normal-case"
                    >
                      <Plus className="size-4" />
                      Add date
                    </button>
                  )}
                </div>
              </fieldset>
            )}
          </div>

          <label className={`col-span-2 ${cell} lg:col-span-1 xl:max-w-32 xl:border-r-0`}>
            Guests
            <input
              type="number"
              name="guests"
              min="1"
              max="500"
              defaultValue={filters.guests}
              className={barControl}
            />
          </label>

          <div className="col-span-2 lg:col-span-1 xl:flex xl:items-center xl:p-2">
            <button
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-semibold whitespace-nowrap text-white transition-colors hover:bg-primary-hover"
              type="submit"
            >
              <Search className="size-4" aria-hidden="true" />
              Show places
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setAdvanced((open) => !open)}
          aria-expanded={advanced}
          aria-controls="discovery-more-filters"
          className={chip}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeFilters ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-tiny text-white">
              {activeFilters}
            </span>
          ) : null}
        </button>
        <Link
          href={path}
          className="inline-flex min-h-10 items-center px-3 font-semibold text-brand-700 hover:underline"
        >
          Clear all
        </Link>
      </div>

      <div
        id="discovery-more-filters"
        hidden={!advanced}
        className="mt-3 rounded-xl border border-border bg-card p-4 sm:p-5"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="font-medium sm:col-span-2 lg:col-span-1">
            Property name or locality
            <input
              name="q"
              defaultValue={filters.q}
              maxLength={100}
              placeholder="For example, Kamrej"
              className={control}
            />
          </label>
          {!route?.category && (
            <label className="font-medium">
              Property type
              <select name="category" defaultValue={filters.category} className={control}>
                <option value="">Any type</option>
                {registry.categories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="font-medium">
            Minimum price (₹)
            <input
              name="min"
              type="number"
              min="0"
              max="100000000"
              defaultValue={filters.min ?? ''}
              className={control}
            />
          </label>
          <label className="font-medium">
            Maximum price (₹)
            <input
              name="max"
              type="number"
              min="0"
              max="100000000"
              defaultValue={filters.max ?? ''}
              className={control}
            />
          </label>
          <label className="font-medium">
            Cancellation
            <select name="cancellation" defaultValue={filters.cancellation} className={control}>
              <option value="">Any policy</option>
              {['flexible', 'moderate', 'strict'].map((value) => (
                <option key={value} value={value}>
                  {value[0].toUpperCase() + value.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="sm:col-span-2 lg:col-span-4">
            <legend className="font-medium">Amenities</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {registry.amenities.map((item) => (
                <label
                  className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-border px-3 has-checked:border-brand-300 has-checked:bg-brand-50 has-checked:text-brand-800"
                  key={item.slug}
                >
                  <input
                    className="size-4 accent-brand-600"
                    type="checkbox"
                    name="amenities"
                    value={item.slug}
                    defaultChecked={filters.amenities.includes(item.slug)}
                  />
                  {item.name}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <button
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 font-semibold text-white transition-colors hover:bg-primary-hover"
          type="submit"
        >
          Apply filters
        </button>
      </div>
    </Form>
  );
}
