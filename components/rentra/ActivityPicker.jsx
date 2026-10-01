'use client';

import { useState } from 'react';
import { Select } from '@/components/ui/field';
import Link from '@/components/navigation/NavigationLink';
import { ActivityIcon } from './icons/activity-icons';

/**
 * "What are you playing?" on the Entertainment home (entertainment plan, Phase 6).
 * Replaces the occasion picker. Only cities with live venues are offered, and
 * only activities that city actually has; each tile opens `/{city}/{activity}`.
 *
 * `cities`: [{ slug, name, activities: [{ slug, name, iconKey, count, more }] }],
 * counted on the server from the city's venue cards (`more` when the read was capped).
 */
export default function ActivityPicker({ cities }) {
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const city = cities.find((row) => row.slug === citySlug);
  if (!city) return null;

  return (
    <section
      className="mx-auto max-w-(--container-page) px-4 py-14 sm:px-6"
      aria-labelledby="activity-heading"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
        <div>
          <h2 id="activity-heading" className="text-h1 font-semibold">
            What are you playing?
          </h2>
          <p className="mt-3 text-body text-ink-600">
            Pick an activity to see venues and free times.
          </p>
          {cities.length > 1 ? (
            <label className="mt-6 flex items-center gap-4 text-meta text-ink-600">
              Venues in
              <Select
                value={citySlug}
                onChange={(event) => setCitySlug(event.target.value)}
                className="w-auto min-w-40 rounded-full"
              >
                {cities.map((row) => (
                  <option key={row.slug} value={row.slug}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </label>
          ) : (
            <p className="mt-6 text-meta text-ink-600">Venues in {city.name}</p>
          )}
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {city.activities.map((activity) => (
            <li key={activity.slug}>
              <Link
                href={`/${city.slug}/${activity.slug}`}
                className="flex min-h-24 flex-col justify-between gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-brand-300 hover:bg-brand-50"
              >
                <ActivityIcon iconKey={activity.iconKey} className="size-7 text-brand-700" />
                <span>
                  <span className="block text-meta font-semibold text-ink-900">
                    {activity.name}
                  </span>
                  <span className="block text-tiny text-ink-600 tabular">
                    {activity.count}
                    {activity.more ? '+' : ''} {activity.count === 1 ? 'venue' : 'venues'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
