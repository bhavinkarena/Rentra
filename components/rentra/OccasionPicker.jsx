'use client';

import { useState } from 'react';
import { ArrowUpRight, Sun, Waves, Flame, Camera, Users, ChevronDown } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import Image from './PropertyImage';
import { DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import picnic from '@/public/images/occasions/day-picnic.webp';
import pool from '@/public/images/occasions/with-pool.webp';
import bonfire from '@/public/images/occasions/bonfire-allowed.webp';
import wedding from '@/public/images/occasions/pre-wedding-shoot.webp';
import offsite from '@/public/images/occasions/corporate-offsite.webp';

/** Keyed by intent slug so a reordered DISCOVERY_INTENTS cannot mismatch a story. */
const STORIES = {
  'day-picnic': {
    Icon: Sun,
    title: 'A whole day,\nwell spent.',
    text: 'Gather your favourite people. Swap the usual plan for a farmhouse day out.',
    image: picnic,
    alt: 'A picnic basket and cups on a checked tablecloth among trees',
    credit: 'Bonnie Kittle',
    source: 'https://unsplash.com/photos/xBFEhnAMlFI',
    tint: 'bg-accent',
  },
  'with-pool': {
    Icon: Waves,
    title: 'Take the\nscenic dip.',
    text: 'Long conversations. A little sunshine. Find a place with a pool and make a day of it.',
    image: pool,
    alt: 'Turquoise swimming pool with a waterfall beside a villa',
    credit: 'Alef Morais',
    source: 'https://unsplash.com/photos/w1BuW8zMNpw',
    tint: 'bg-accent',
  },
  'bonfire-allowed': {
    Icon: Flame,
    title: 'Stay for\none more story.',
    text: 'Bring everyone together around a bonfire. Explore places for an evening outdoors.',
    image: bonfire,
    alt: 'Friends gathered around a glowing bonfire at dusk',
    credit: 'Tim Arterbury',
    source: 'https://unsplash.com/photos/l5UZWEJpQPM',
    tint: 'bg-champagne-subtle',
  },
  'pre-wedding-shoot': {
    Icon: Camera,
    title: 'A setting for\nyour story.',
    text: 'Find an open-air backdrop for the moments you want to keep.',
    image: wedding,
    alt: 'A couple posing together in a sunlit garden',
    credit: 'Ben Atkins',
    source: 'https://unsplash.com/photos/JYR7DNdUqo4',
    tint: 'bg-champagne-subtle',
  },
  'corporate-offsite': {
    Icon: Users,
    title: 'Out of office.\nInto good company.',
    text: 'Give the team a change of scene. Explore spaces to gather beyond the meeting room.',
    image: offsite,
    alt: 'A team sharing ideas around a wooden table',
    credit: 'Parabol',
    source: 'https://unsplash.com/photos/e5ob6fBTi64',
    tint: 'bg-secondary',
  },
};

const INTENTS = DISCOVERY_INTENTS.filter((intent) => STORIES[intent.slug]);

export default function OccasionPicker({ cities, category }) {
  const [active, setActive] = useState(0);
  const [city, setCity] = useState(
    cities.find((c) => c.slug === 'surat')?.slug || cities[0]?.slug || '',
  );
  const intent = INTENTS[active];
  const story = STORIES[intent.slug];
  const href = city && category ? `/${city}/${category}/intent/${intent.slug}` : '/search';

  // Tabs pattern: arrow keys move between occasions, Tab leaves the list.
  function onKeyDown(event, index) {
    const last = INTENTS.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`occasion-tab-${next}`)?.focus();
  }

  return (
    <section
      className="mx-auto max-w-(--container-page) px-6 py-14"
      aria-labelledby="occasion-heading"
    >
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <h2 id="occasion-heading" className="text-h1 font-semibold">
          What does your
          <br className="hidden sm:block" /> kind of day look like?
        </h2>
        <p className="text-body text-ink-600 md:text-right">
          Start with the feeling.
          <br />
          We’ll help you find the place.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Choose your occasion"
        className="-mx-4 mt-8 flex gap-3 overflow-x-auto px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] md:mx-0 md:px-0"
      >
        {INTENTS.map((item, index) => {
          const { Icon } = STORIES[item.slug];
          const selected = active === index;
          return (
            <button
              key={item.slug}
              type="button"
              role="tab"
              id={`occasion-tab-${index}`}
              aria-selected={selected}
              aria-controls="occasion-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={`flex min-h-12 flex-[1_0_auto] items-center justify-center gap-2.5 rounded-full border px-5 text-meta font-medium whitespace-nowrap transition-colors ${
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-ink-200 text-ink-700 hover:border-brand-300 hover:bg-brand-50'
              }`}
            >
              <Icon className="size-4.5" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>

      <div
        id="occasion-panel"
        role="tabpanel"
        aria-labelledby={`occasion-tab-${active}`}
        className={`mt-5 grid overflow-hidden rounded-xl transition-colors duration-300 md:grid-cols-[1fr_1.05fr] ${story.tint}`}
      >
        <div className="p-7 sm:p-10 lg:p-12">
          <h3 className="text-[clamp(1.875rem,3.4vw,3rem)] leading-[1.12] font-medium tracking-[-0.035em] whitespace-pre-line text-ink-900">
            {story.title}
          </h3>
          <p className="mt-6 max-w-md text-body-lg text-ink-700">{story.text}</p>

          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3">
            {cities.length > 0 ? (
              <label className="flex items-center gap-4 text-meta text-ink-600">
                Explore around
                <span className="relative">
                  <select
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    className="min-h-11 min-w-40 appearance-none border-b border-ink-500 bg-transparent py-1 pr-8 pl-1 text-body font-medium text-ink-900 focus-visible:outline-2 focus-visible:outline-brand-600 text-base md:text-sm"
                  >
                    {cities.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="pointer-events-none absolute top-1/2 right-1 size-4 -translate-y-1/2"
                    aria-hidden="true"
                  />
                </span>
              </label>
            ) : null}
          </div>
          <Link
            href={href}
            className="mt-5 inline-flex min-h-12 items-center gap-6 rounded-full bg-primary px-5 text-body font-medium text-white transition-colors hover:bg-primary-hover active:bg-primary-active"
          >
            Explore {intent.label.toLowerCase()}
            <ArrowUpRight className="size-5" aria-hidden="true" />
          </Link>
          <p className="mt-6 max-w-md text-meta text-ink-600">{intent.description}</p>
        </div>

        <div
          key={intent.slug}
          className="relative min-h-72 animate-in duration-300 fade-in md:min-h-[26rem]"
        >
          <Image
            src={story.image}
            alt={story.alt}
            fill
            placeholder="blur"
            sizes="(min-width: 1024px) 650px, (min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
          <a
            href={story.source}
            target="_blank"
            rel="noopener noreferrer"
            data-surface="inverse"
            className="absolute bottom-4 left-4 inline-flex min-h-11 items-center gap-3 rounded-md bg-ink-900/85 px-3.5 text-tiny text-white backdrop-blur transition-colors hover:bg-ink-900"
          >
            {intent.label} inspiration · {story.credit}
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
