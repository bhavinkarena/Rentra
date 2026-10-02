'use client';

import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Select } from '@/components/ui/field';
import Link from '@/components/navigation/NavigationLink';
import Image from './PropertyImage';
import { ActivityIcon } from './icons/activity-icons';
import cricketPhoto from '@/public/images/activities/box-cricket.png';

const STORIES = {
  cricket: [
    'Bring the team.\nPlay your innings.',
    'Get everyone together for a game. Find a box cricket venue and choose a time that suits your team.',
  ],
  pickleball: [
    'Meet your next\nrally.',
    'Make room for a little friendly competition. Explore pickleball courts for your next game.',
  ],
  badminton: [
    'Your next rally\nstarts here.',
    'Bring a partner or make it doubles. Find a badminton court and plan your next match.',
  ],
  bowling: [
    'Make a night\nof it.',
    'Bring your favourite people together for a game. Explore bowling venues and choose your next session.',
  ],
  football: [
    'Get your team\nback on the turf.',
    'Swap the group chat for a game. Find a sports turf and pick a time to play together.',
  ],
  gaming: [
    'A little friendly\ncompetition.',
    'Make your next hangout a game. Explore gaming zones and find a session for your group.',
  ],
  trampoline: [
    'Put a little bounce\nin your day.',
    'Change up the usual plan. Explore trampoline parks and choose a time for your next visit.',
  ],
  kart: [
    'Make your next\nlap count.',
    'Bring your friends for a change of pace. Explore go-karting venues and plan your next session.',
  ],
};

/** Farmhouse-style story tabs, using activities and venue photos offered in each city. */
export default function ActivityPicker({ cities }) {
  const [citySlug, setCitySlug] = useState(cities[0]?.slug ?? '');
  const [activeSlug, setActiveSlug] = useState(cities[0]?.activities[0]?.slug ?? '');
  const city = cities.find((row) => row.slug === citySlug);
  const activity = city?.activities.find((item) => item.slug === activeSlug) ?? city?.activities[0];
  if (!activity) return null;
  const active = city.activities.indexOf(activity);
  const [title, text] = STORIES[activity.iconKey] ?? [
    `${activity.name}.\nYour kind of play.`,
    `Explore ${activity.name.toLowerCase()} venues and choose a date and time for your next visit.`,
  ];

  function onKeyDown(event, index) {
    const last = city.activities.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActiveSlug(city.activities[next].slug);
    document.getElementById(`activity-tab-${next}`)?.focus();
  }

  return (
    <section
      className="mx-auto max-w-(--container-page) px-6 py-14"
      aria-labelledby="activity-heading"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <h2 id="activity-heading" className="text-h1 font-semibold">
          What are you
          <br className="hidden sm:block" /> playing?
        </h2>
        <p className="text-body text-ink-600 md:text-right">
          Pick your activity.
          <br />
          Find a place and time to play.
        </p>
      </div>
      <div
        role="tablist"
        aria-label="Choose your activity"
        className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {city.activities.map((item, index) => (
          <button
            key={item.slug}
            type="button"
            role="tab"
            id={`activity-tab-${index}`}
            aria-selected={item === activity}
            aria-controls="activity-panel"
            tabIndex={item === activity ? 0 : -1}
            onClick={() => setActiveSlug(item.slug)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`flex min-h-12 flex-[1_0_auto] items-center justify-center gap-2.5 rounded-full border px-5 text-meta font-medium whitespace-nowrap transition-colors ${item === activity ? 'border-primary bg-primary text-primary-foreground' : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50'}`}
          >
            <ActivityIcon iconKey={item.iconKey} className="size-4.5" />
            {item.name}
          </button>
        ))}
      </div>
      <div
        id="activity-panel"
        role="tabpanel"
        aria-labelledby={`activity-tab-${active}`}
        className="mt-5 grid overflow-hidden rounded-xl bg-accent md:grid-cols-[1fr_1.05fr]"
      >
        <div className="p-7 sm:p-10 lg:p-12">
          <h3 className="text-[clamp(1.875rem,3.4vw,3rem)] leading-[1.12] font-medium tracking-[-0.035em] whitespace-pre-line text-ink-900">
            {title}
          </h3>
          <p className="mt-6 max-w-md text-body-lg text-ink-700">{text}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            <label className="flex items-center gap-4 text-meta text-ink-600">
              Explore around
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
          </div>
          <Link
            href={`/${city.slug}/${activity.slug}`}
            className="mt-5 inline-flex min-h-12 items-center gap-6 rounded-full bg-primary px-5 text-body font-medium text-white transition-colors hover:bg-primary-hover active:bg-brand-900"
          >
            Explore {activity.name.toLowerCase()}
            <ArrowUpRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="mt-6 max-w-md text-meta text-ink-600 tabular">
            {activity.count}
            {activity.more ? '+' : ''} {activity.count === 1 ? 'venue' : 'venues'} in {city.name}.
            Choose a date and time to check availability.
          </p>
        </div>
        <div className="relative min-h-72 bg-ink-100 md:min-h-[26rem]">
          {city.activities.map((item) => (
            <div
              key={`${city.slug}/${item.slug}`}
              aria-hidden={item !== activity}
              className={`absolute inset-0 transition-opacity duration-300 ease-in-out-strong motion-reduce:transition-none ${item === activity ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              {item.iconKey === 'cricket' || item.photo ? (
                <Image
                  src={item.iconKey === 'cricket' ? cricketPhoto : item.photo.url}
                  alt={
                    item.iconKey === 'cricket'
                      ? 'Friends playing box cricket on artificial turf inside a fully netted enclosure, with a bat and yellow stumps'
                      : item.photo.alt || `${item.name} venue in ${city.name}`
                  }
                  fill
                  loading="lazy"
                  sizes="(min-width: 1024px) 650px, (min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-brand-700">
                  <ActivityIcon iconKey={item.iconKey} className="size-20" />
                  <span className="text-body font-medium">
                    {item.name} in {city.name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
