'use client';

import { fieldClass as sharedFieldClass } from '@/components/ui/field';
import Form from '@/components/navigation/NavigationForm';
import { useState } from 'react';
import Link from '@/components/navigation/NavigationLink';
import { SlidersHorizontal, X } from 'lucide-react';
import SearchFields from './SearchFields';
import { DOCK_EXIT, useSearchDock, usePublishDiscovery } from './SearchBar';
import VerticalTabs from './VerticalTabs';
import { searchTabHref, verticalTabs } from '@/lib/domain/vertical-ui';
import { measureBrowser } from '@/lib/domain/browser-measurement';

/* 16px text below lg so iOS does not zoom into a focused field. */
const control = `${sharedFieldClass} mt-1 min-h-11`;
const chip =
  'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800 aria-expanded:border-brand-300 aria-expanded:bg-brand-50 aria-expanded:text-brand-800';
export default function DiscoveryFilters({ filters, registry, route, path, activeChips }) {
  const [advanced, setAdvanced] = useState(false);
  // Same docking as the home hero: the bar scrolls away and HeaderSearch's pill takes over.
  const sentinel = useSearchDock();
  usePublishDiscovery(filters, route, path);
  // Venues pick the activity in the search bar; players and indoor are their own filters.
  const vertical = route?.verticalCode ?? filters.vertical;
  const play = vertical !== 'farmhouse';
  const activeFilters =
    (filters.q ? 1 : 0) +
    (!play && !route?.category && filters.category ? 1 : 0) +
    (play && filters.players != null ? 1 : 0) +
    (play && filters.indoor != null ? 1 : 0) +
    (filters.min != null ? 1 : 0) +
    (filters.max != null ? 1 : 0) +
    (filters.cancellation ? 1 : 0) +
    filters.amenities.length;
  const ownCategories = registry.categories.filter(
    (item) => (item.vertical ?? 'farmhouse') === vertical,
  );
  const ownAmenities = registry.amenities.filter(
    (item) => !item.verticals?.length || item.verticals.includes(vertical),
  );
  return (
    /* Sort renders beside the result count, outside this element. It joins this
       form through form="discovery-filters" so one submit carries every choice.
       Search panels keep their submitted values in hidden fields. Not sticky:
       once scrolled, the header pill carries the search (HeaderSearch). */
    <Form
      id="discovery-filters"
      action={path}
      onSubmit={() => measureBrowser('search_submitted')}
      className="relative z-30 -mx-4 border-b border-border bg-background px-4 py-3 text-meta sm:-mx-6 sm:px-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && advanced) {
          setAdvanced(false);
          event.currentTarget.querySelector('[aria-controls="discovery-more-filters"]')?.focus();
        }
      }}
    >
      <div ref={sentinel} aria-hidden="true" />
      <div className={DOCK_EXIT}>
        {/* Phones: the tabs sit above the fields (md+ has them in the header). */}
        <VerticalTabs
          variant="light"
          items={verticalTabs(
            registry,
            route?.verticalCode ?? filters.vertical,
            path === '/search'
              ? (code) =>
                  searchTabHref(code, {
                    city: filters.city,
                    area: filters.area,
                    date: filters.dates[0],
                  })
              : undefined,
          )}
        />
        <SearchFields
          filters={filters}
          registry={registry}
          route={route}
          vertical={vertical}
          submitLabel={play ? 'Show venues' : 'Show places'}
        />
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setAdvanced((open) => !open)}
          aria-expanded={advanced}
          aria-controls="discovery-more-filters"
          className={`${chip} shrink-0`}
        >
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          Filters
          {activeFilters ? (
            <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-tiny text-white">
              {activeFilters}
            </span>
          ) : null}
        </button>
        {activeChips}
        <Link
          href={path}
          className="ml-auto inline-flex min-h-10 shrink-0 items-center px-2 text-tiny font-semibold text-brand-700 hover:underline"
        >
          Clear all
        </Link>
      </div>

      <div
        id="discovery-more-filters"
        hidden={!advanced}
        className="absolute inset-x-4 top-full mt-2 max-h-[calc(100dvh-24rem)] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card p-4 shadow-lg sm:inset-x-6 sm:p-5 md:max-h-[calc(100dvh-16rem)]"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-h4">Refine your search</h2>
          <button
            type="button"
            onClick={() => setAdvanced(false)}
            aria-label="Close filters"
            className="grid size-11 place-items-center rounded-full hover:bg-ink-50"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="font-medium sm:col-span-2 lg:col-span-1">
            {play ? 'Venue name or locality' : 'Property name or locality'}
            <input
              name="q"
              defaultValue={filters.q}
              maxLength={100}
              placeholder={play ? 'For example, Vesu' : 'For example, Kamrej'}
              className={control}
            />
          </label>
          {play ? (
            <>
              <label className="font-medium">
                Players
                <input
                  name="players"
                  type="number"
                  min="1"
                  max="500"
                  placeholder="Any"
                  defaultValue={filters.players ?? ''}
                  className={control}
                />
              </label>
              <label className="font-medium">
                Indoor or outdoor
                <select
                  name="indoor"
                  defaultValue={filters.indoor == null ? '' : String(filters.indoor)}
                  className={control}
                >
                  <option value="">Either</option>
                  <option value="true">Indoor</option>
                  <option value="false">Outdoor</option>
                </select>
              </label>
            </>
          ) : null}
          {!play && !route?.category && (
            <label className="font-medium">
              Property type
              <select name="category" defaultValue={filters.category} className={control}>
                <option value="">Any type</option>
                {ownCategories.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="font-medium">
            {play ? 'Minimum price per hour (₹)' : 'Minimum price (₹)'}
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
            {play ? 'Maximum price per hour (₹)' : 'Maximum price (₹)'}
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
              {ownAmenities.map((item) => (
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
