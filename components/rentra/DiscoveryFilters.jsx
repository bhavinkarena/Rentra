'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Filter, Plus, Search, X } from 'lucide-react';
import { addLocalDays, formatLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { SEARCH_SORTS } from '@/lib/domain/discovery';

const control = 'mt-1 min-h-11 w-full rounded-md border border-border bg-white px-3 py-2 text-ink-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100';
const slots = [['day', 'Day visit'], ['night', 'Overnight'], ['full_day', 'Full day']];

export default function DiscoveryFilters({ filters, registry, route, path }) {
  const today = propertyToday();
  const lastDate = addLocalDays(today, 365);
  const initialLocation = route?.area ? `area:${route.city.slug}:${route.area.slug}`
    : route?.city ? `city:${route.city.slug}`
      : filters.area ? `area:${filters.city}:${filters.area}`
        : filters.city ? `city:${filters.city}` : '';
  const [location, setLocation] = useState(initialLocation);
  const [mode, setMode] = useState(filters.mode);
  const [dates, setDates] = useState(filters.dates.length ? filters.dates : ['']);
  const [advanced, setAdvanced] = useState(Boolean(
    filters.category || filters.min != null || filters.max != null
    || filters.cancellation || filters.amenities.length,
  ));
  const [kind, city = '', area = ''] = location.split(':');

  function updateDate(index, value) {
    setDates(current => current.map((date, position) => position === index ? value : date));
  }

  return (
    <form action={path} className="mt-6 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      {!route?.city && <input type="hidden" name="city" value={kind ? city : ''} />}
      {!route?.area && <input type="hidden" name="area" value={kind === 'area' ? area : ''} />}
      {mode === 'separate' && <input type="hidden" name="dates" value={dates.filter(Boolean).join(',')} />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <label className="font-medium">Where
          {route?.city ? <span className={`${control} block bg-ink-50`}>{route.area?.name || route.city.name}</span> : (
            <select aria-label="Location" value={location} onChange={event => setLocation(event.target.value)} className={control}>
              <option value="">All locations</option>
              {registry.cities.map(item => <optgroup key={item.id} label={item.name}>
                <option value={`city:${item.slug}`}>Anywhere in {item.name}</option>
                {registry.areas.filter(candidate => candidate.cityId === item.id).map(candidate => (
                  <option key={candidate.id} value={`area:${item.slug}:${candidate.slug}`}>{candidate.name}, {item.name}</option>
                ))}
              </optgroup>)}
            </select>
          )}
        </label>

        <label className="font-medium">Visit type
          <select aria-label="Slot" name="slot" defaultValue={filters.slot} className={control}>
            {(route?.intent?.slot ? slots.filter(([value]) => value === route.intent.slot) : slots)
              .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>

        <label className="font-medium">Date choice
          <select aria-label="Date mode" name="mode" value={mode} onChange={event => setMode(event.target.value)} className={control}>
            <option value="single">One visit</option>
            <option value="consecutive">Consecutive visits</option>
            <option value="separate">Separate dates</option>
          </select>
        </label>

        <label className="font-medium">Guests
          <input type="number" name="guests" min="1" max="500" defaultValue={filters.guests} className={control} />
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="font-medium">Property name or locality
          <input name="q" defaultValue={filters.q} maxLength={100} placeholder="For example, Kamrej" className={control} />
        </label>
        {mode === 'single' && <label className="font-medium">Visit date
          <input type="date" name="date" defaultValue={dates[0]} min={today} max={lastDate} className={control} />
        </label>}
        {mode === 'consecutive' && <div className="grid grid-cols-2 gap-3">
          <label className="font-medium">First visit<input type="date" name="date" defaultValue={dates[0]} min={today} max={lastDate} className={control} /></label>
          <label className="font-medium">Last visit<input type="date" name="end" defaultValue={dates.at(-1)} min={today} max={lastDate} className={control} /></label>
        </div>}
        {mode === 'separate' && <fieldset>
          <legend className="font-medium">Visit dates</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {dates.map((date, index) => <div key={index} className="flex items-center gap-1 rounded-full bg-brand-50 p-1 pl-3">
              <label className="sr-only" htmlFor={`visit-date-${index}`}>Visit date {index + 1}</label>
              <input id={`visit-date-${index}`} aria-label={`Visit date ${index + 1}`} type="date" value={date} min={today} max={lastDate} onChange={event => updateDate(index, event.target.value)} className="min-h-10 bg-transparent" />
              {dates.length > 1 && <button type="button" onClick={() => setDates(current => current.filter((_, position) => position !== index))} className="grid size-10 place-items-center rounded-full hover:bg-white" aria-label={`Remove ${date ? formatLocalDate(date) : `date ${index + 1}`}`}><X className="size-4" /></button>}
            </div>)}
            {dates.length < 10 && <button type="button" onClick={() => setDates(current => [...current, ''])} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 font-medium"><Plus className="size-4" />Add date</button>}
          </div>
        </fieldset>}
      </div>

      <details className="mt-5" open={advanced} onToggle={event => setAdvanced(event.currentTarget.open)}>
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-border px-4 font-semibold"><Filter className="size-4" />Filters{advanced ? ' · open' : ''}</summary>
        <div className="mt-4 grid gap-4 rounded-lg bg-ink-25 p-4 sm:grid-cols-2 lg:grid-cols-4">
          {!route?.category && <label className="font-medium">Property type<select name="category" defaultValue={filters.category} className={control}><option value="">Any type</option>{registry.categories.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>}
          <label className="font-medium">Minimum price (₹)<input name="min" type="number" min="0" max="100000000" defaultValue={filters.min ?? ''} className={control} /></label>
          <label className="font-medium">Maximum price (₹)<input name="max" type="number" min="0" max="100000000" defaultValue={filters.max ?? ''} className={control} /></label>
          <label className="font-medium">Cancellation<select name="cancellation" defaultValue={filters.cancellation} className={control}><option value="">Any policy</option>{['flexible', 'moderate', 'strict'].map(value => <option key={value} value={value}>{value[0].toUpperCase() + value.slice(1)}</option>)}</select></label>
          <fieldset className="sm:col-span-2 lg:col-span-4"><legend className="font-medium">Amenities</legend><div className="mt-2 flex flex-wrap gap-x-5 gap-y-3">{registry.amenities.map(item => <label className="inline-flex min-h-11 items-center gap-2" key={item.slug}><input className="size-5 accent-brand-600" type="checkbox" name="amenities" value={item.slug} defaultChecked={filters.amenities.includes(item.slug)} />{item.name}</label>)}</div></fieldset>
        </div>
      </details>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-600 px-6 font-semibold text-white hover:bg-brand-700" type="submit"><Search className="size-4" />Show places</button>
        <Link href={path} className="inline-flex min-h-11 items-center text-brand-700 underline">Clear all</Link>
      </div>
      <p className="mt-3 text-tiny text-ink-600">With dates, prices include rent and the platform fee for every visit and guest. Refundable deposits are shown separately.</p>
    </form>
  );
}
