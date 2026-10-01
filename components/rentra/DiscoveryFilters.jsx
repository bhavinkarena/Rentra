'use client';

import { fieldClass } from '@/components/ui/field';
import Form from '@/components/navigation/NavigationForm';
import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from '@/components/navigation/NavigationLink';
import {
  SlidersHorizontal,
  X,
  Waves,
  ShieldCheck,
  Flame,
  Trees,
  BedDouble,
  Wallet,
  Check,
} from 'lucide-react';
import SearchFields from './SearchFields';
import { discoveryQuery } from '@/lib/domain/discovery';
import { DOCK_EXIT, useSearchDock, usePublishDiscovery } from './SearchBar';
import { measureBrowser } from '@/lib/domain/browser-measurement';

const control = `${fieldClass} mt-1.5`;
const choice =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-meta transition-colors hover:border-brand-300 has-checked:border-brand-600 has-checked:bg-brand-50 has-checked:text-brand-800';
const quickChoices = [
  ['swimming_pool', 'With pool', Waves],
  ['open_lawn', 'Open lawn', Trees],
  ['bonfire', 'Bonfire', Flame],
];
const amenityGroups = [
  [
    'Outdoors & activities',
    [
      'swimming_pool',
      'rain_dance',
      'open_lawn',
      'bonfire',
      'cricket_pitch',
      'dj_allowed',
      'banquet_lawn',
    ],
  ],
  ['Comfort & essentials', ['ac_bedrooms', 'modular_kitchen', 'generator', 'parking', 'caretaker']],
];

export default function DiscoveryFilters({ filters, registry, route, path, activeChips }) {
  const [advanced, setAdvanced] = useState(false);
  const [budget, setBudget] = useState({ min: filters.min ?? '', max: filters.max ?? '' });
  const [amenities, setAmenities] = useState(filters.amenities);
  const budgetInvalid =
    budget.min !== '' && budget.max !== '' && Number(budget.min) > Number(budget.max);
  // Same docking as the home hero: the bar scrolls away and HeaderSearch's pill takes over.
  const sentinel = useSearchDock();
  usePublishDiscovery(filters, route, path);
  const activeFilters =
    Number(Boolean(filters.q)) +
    Number(!route?.category && Boolean(filters.category)) +
    Number(filters.min != null || filters.max != null) +
    Number(Boolean(filters.cancellation)) +
    Number(Boolean(filters.bedrooms)) +
    Number(filters.verified === '1') +
    filters.amenities.length;
  const assigned = amenityGroups.flatMap(([, slugs]) => slugs);
  const groups = [
    ...amenityGroups.map(([title, slugs]) => [
      title,
      registry.amenities.filter((item) => slugs.includes(item.slug)),
    ]),
    [
      'More facilities & accessibility',
      registry.amenities.filter((item) => !assigned.includes(item.slug)),
    ],
  ];
  const href = (changes) => `${path}?${discoveryQuery(filters, { page: 1, ...changes })}`;
  function closeFilters(event) {
    setAdvanced(false);
    event.currentTarget
      .closest('form')
      .querySelector('[aria-controls="discovery-more-filters"]')
      ?.focus();
  }
  return (
    <Form
      id="discovery-filters"
      action={path}
      onSubmit={(event) => {
        if (budgetInvalid) {
          event.preventDefault();
          setAdvanced(true);
          return;
        }
        measureBrowser('search_submitted');
      }}
      className="relative z-30 -mx-4 border-b border-border bg-background px-4 py-3 text-meta sm:-mx-6 sm:px-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && advanced) closeFilters(event);
      }}
    >
      <div ref={sentinel} aria-hidden="true" />
      <div className={DOCK_EXIT}>
        <SearchFields
          filters={filters}
          registry={registry}
          route={route}
          submitLabel="Show places"
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAdvanced((open) => !open)}
          aria-expanded={advanced}
          aria-controls="discovery-more-filters"
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-brand-200 bg-card px-4 font-semibold text-brand-800 hover:bg-brand-50 aria-expanded:bg-brand-50"
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" /> Filters
          {activeFilters > 0 && (
            <span className="grid min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-tiny text-white">
              {activeFilters}
            </span>
          )}
        </button>
        <div
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
          aria-label="Popular filters"
        >
          {quickChoices
            .filter(
              ([slug]) =>
                registry.amenities.some((item) => item.slug === slug) &&
                (filters.amenities.includes(slug) || filters.amenities.length < 10) &&
                route?.intent?.amenity !== slug,
            )
            .map(([slug, label, Icon]) => {
              const selected = filters.amenities.includes(slug);
              return (
                <Link
                  key={slug}
                  href={href({
                    amenities: selected
                      ? filters.amenities.filter((item) => item !== slug)
                      : [...filters.amenities, slug].slice(0, 10),
                  })}
                  aria-label={`${selected ? 'Remove' : 'Add'} ${label} filter`}
                  aria-current={selected ? 'true' : undefined}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3 text-tiny font-medium hover:border-brand-300 ${selected ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-border bg-card text-ink-700'}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                  {selected && <Check className="size-3.5" aria-hidden="true" />}
                </Link>
              );
            })}
        </div>
        {activeFilters > 0 && (
          <Link
            href={path}
            className="inline-flex min-h-11 shrink-0 items-center px-2 text-tiny font-semibold text-brand-700 hover:underline"
          >
            Clear all
          </Link>
        )}
      </div>
      {activeChips && <div className="mt-2">{activeChips}</div>}
      <div
        id="discovery-more-filters"
        hidden={!advanced}
        className={`${advanced ? 'flex' : 'hidden'} fixed inset-x-4 top-20 bottom-4 z-40 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:inset-x-6 md:absolute md:top-full md:bottom-auto md:mt-2 md:max-h-[calc(100dvh-20rem)] lg:left-auto lg:w-[820px]`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3">
          <div>
            <h2 className="text-h4">Make it your kind of place</h2>
            <p className="mt-1 text-tiny text-ink-600">Choose what matters for your visit.</p>
          </div>
          <button
            type="button"
            onClick={closeFilters}
            aria-label="Close filters"
            className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-ink-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5">
          <section aria-labelledby="filter-budget">
            <h3 id="filter-budget" className="flex items-center gap-2 font-semibold">
              <Wallet className="size-4 text-brand-600" aria-hidden="true" />
              Your budget
            </h3>
            <p className="mt-1 text-tiny text-ink-600">
              Select dates for a total including rent and platform fees. Without dates, filters use
              base rent. Refundable deposits are extra.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <label className="text-tiny font-medium">
                Minimum price (₹)
                <input
                  name="min"
                  type="number"
                  min="0"
                  max="100000000"
                  placeholder="No minimum"
                  value={budget.min}
                  onChange={(event) => setBudget({ ...budget, min: event.target.value })}
                  className={control}
                />
              </label>
              <label className="text-tiny font-medium">
                Maximum price (₹)
                <input
                  name="max"
                  type="number"
                  min="0"
                  max="100000000"
                  placeholder="No maximum"
                  value={budget.max}
                  aria-invalid={budgetInvalid}
                  aria-describedby={budgetInvalid ? 'budget-error' : undefined}
                  onChange={(event) => setBudget({ ...budget, max: event.target.value })}
                  className={control}
                />
              </label>
            </div>
            {budgetInvalid && (
              <p id="budget-error" role="alert" className="mt-2 text-tiny text-danger">
                Maximum price must be at least the minimum price.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ['Any budget', '', ''],
                ['Up to ₹5,000', '', 5000],
                ['₹5,000–₹10,000', 5000, 10000],
                ['₹10,000+', 10000, ''],
              ].map(([label, min, max]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={
                    String(budget.min) === String(min) && String(budget.max) === String(max)
                  }
                  onClick={() => setBudget({ min, max })}
                  className="min-h-10 rounded-full border border-border px-3 text-tiny hover:border-brand-300 aria-pressed:border-brand-600 aria-pressed:bg-brand-50 aria-pressed:text-brand-800"
                >
                  {label}
                </button>
              ))}
            </div>
          </section>
          <section className="border-t border-border pt-5" aria-labelledby="filter-place">
            <h3 id="filter-place" className="flex items-center gap-2 font-semibold">
              <BedDouble className="size-4 text-brand-600" aria-hidden="true" />
              The right space
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {!route?.category && (
                <label className="text-tiny font-medium">
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
              <label className="text-tiny font-medium">
                Minimum bedrooms
                <select name="bedrooms" defaultValue={filters.bedrooms ?? ''} className={control}>
                  <option value="">Any number</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}+ {n === 1 ? 'bedroom' : 'bedrooms'}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-tiny font-medium">
                Property name or locality
                <input
                  name="q"
                  defaultValue={filters.q}
                  maxLength={100}
                  placeholder="For example, Kamrej"
                  className={control}
                />
              </label>
              <label className="text-tiny font-medium">
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
            </div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-xl bg-brand-50 p-3">
              <ShieldCheck className="size-5 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-semibold">Physically verified places</span>
                <span className="mt-1 block text-tiny text-ink-600">
                  Only places with a completed, passed in-person verification.
                </span>
              </span>
              <input
                type="checkbox"
                name="verified"
                value="1"
                defaultChecked={filters.verified === '1'}
                className="size-5 shrink-0"
              />
            </label>
          </section>
          <section className="space-y-4 border-t border-border pt-5" aria-label="Amenities">
            <div>
              <h3 className="font-semibold">Facilities for your visit</h3>
              <p className="mt-1 text-tiny text-ink-600">
                Places must include every selected facility. Choose up to 10.
              </p>
            </div>
            {groups
              .filter(([, items]) => items.length)
              .map(([title, items]) => (
                <fieldset key={title}>
                  <legend className="mb-2 text-tiny font-semibold text-ink-600">{title}</legend>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item) => (
                      <label
                        key={item.slug}
                        className={`${choice} has-disabled:cursor-not-allowed has-disabled:opacity-50`}
                      >
                        <input
                          type="checkbox"
                          name="amenities"
                          value={item.slug}
                          checked={amenities.includes(item.slug)}
                          disabled={!amenities.includes(item.slug) && amenities.length >= 10}
                          onChange={(event) =>
                            setAmenities((current) =>
                              event.target.checked
                                ? [...current, item.slug]
                                : current.filter((slug) => slug !== item.slug),
                            )
                          }
                          className="size-4 shrink-0"
                        />
                        {item.name}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
          </section>
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-card px-5 py-3">
          <Link
            href={path}
            className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 underline underline-offset-4"
          >
            Clear all
          </Link>
          <ApplyFilters disabled={budgetInvalid} />
        </div>
      </div>
    </Form>
  );
}

function ApplyFilters({ disabled }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={disabled || pending}
      className="min-h-11 rounded-full bg-primary px-6 font-semibold text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
      type="submit"
    >
      {pending ? 'Finding places…' : 'Apply filters'}
    </button>
  );
}
