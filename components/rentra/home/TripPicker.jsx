'use client';
import { useState } from 'react';
import { ArrowUpRight, Sun, Waves, Flame, Camera, Users } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import Image from '@/components/rentra/PropertyImage';
import { DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import styles from './home.module.css';
import picnic from '@/public/images/occasions/day-picnic.webp';
import pool from '@/public/images/occasions/with-pool.webp';
import bonfire from '@/public/images/occasions/bonfire-allowed.webp';
import wedding from '@/public/images/occasions/pre-wedding-shoot.webp';
import offsite from '@/public/images/occasions/corporate-offsite.webp';
const icons = [Sun, Waves, Flame, Camera, Users];
const stories = [
  {
    title: 'A whole day,\nwell spent.',
    text: 'Gather your favourite people. Swap the usual plan for a farmhouse day out.',
    image: picnic,
    alt: 'A picnic basket and cups on a checked tablecloth among trees',
    credit: 'Bonnie Kittle',
    source: 'https://unsplash.com/photos/xBFEhnAMlFI',
  },
  {
    title: 'Take the\nscenic dip.',
    text: 'Long conversations. A little sunshine. Find a place with a pool and make a day of it.',
    image: pool,
    alt: 'Turquoise swimming pool with a waterfall beside a villa',
    credit: 'Alef Morais',
    source: 'https://unsplash.com/photos/w1BuW8zMNpw',
  },
  {
    title: 'Stay for\none more story.',
    text: 'Bring everyone together around a bonfire. Explore places for an evening outdoors.',
    image: bonfire,
    alt: 'Friends gathered around a glowing bonfire at dusk',
    credit: 'Tim Arterbury',
    source: 'https://unsplash.com/photos/l5UZWEJpQPM',
  },
  {
    title: 'A setting for\nyour story.',
    text: 'Find an open-air backdrop for the moments you want to keep.',
    image: wedding,
    alt: 'A couple posing together in a sunlit garden',
    credit: 'Ben Atkins',
    source: 'https://unsplash.com/photos/JYR7DNdUqo4',
  },
  {
    title: 'Out of office.\nInto good company.',
    text: 'Give the team a change of scene. Explore spaces to gather beyond the meeting room.',
    image: offsite,
    alt: 'A team sharing ideas around a wooden table',
    credit: 'Parabol',
    source: 'https://unsplash.com/photos/e5ob6fBTi64',
  },
];
export default function TripPicker({ cities, category }) {
  const [active, setActive] = useState(0);
  const [city, setCity] = useState(
    cities.find((item) => item.slug === 'surat')?.slug || cities[0]?.slug || '',
  );
  const intent = DISCOVERY_INTENTS[active];
  const story = stories[active];
  const href = city && category ? `/${city}/${category}/intent/${intent.slug}` : '/search';
  function selectTab(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % DISCOVERY_INTENTS.length;
    if (event.key === 'ArrowLeft')
      next = (index - 1 + DISCOVERY_INTENTS.length) % DISCOVERY_INTENTS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = DISCOVERY_INTENTS.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setActive(next);
    document.getElementById(`trip-tab-${next}`)?.focus();
  }
  return (
    <section className={styles.tripSection} aria-labelledby="trip-heading">
      <div className={styles.sectionHeading}>
        <h2 id="trip-heading">
          What does your
          <br className="hidden sm:block" /> kind of day look like?
        </h2>
        <p>
          Start with the feeling.
          <br />
          We’ll help you find the place.
        </p>
      </div>
      <div className={styles.tripTabs} role="tablist" aria-label="Choose your occasion">
        {DISCOVERY_INTENTS.map((item, index) => {
          const Icon = icons[index];
          return (
            <button
              key={item.slug}
              type="button"
              role="tab"
              id={`trip-tab-${index}`}
              aria-selected={active === index}
              aria-controls="trip-panel"
              tabIndex={active === index ? 0 : -1}
              onClick={() => setActive(index)}
              onKeyDown={(event) => selectTab(event, index)}
            >
              <Icon size={19} aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        id="trip-panel"
        role="tabpanel"
        aria-labelledby={`trip-tab-${active}`}
        className={styles.tripPanel}
        data-occasion={intent.slug}
      >
        <div className={styles.tripCopy}>
          <h3>{story.title}</h3>
          <p>{story.text}</p>
          <div className={styles.tripAction}>
            {cities.length > 0 && (
              <label>
                Explore around
                <select value={city} onChange={(event) => setCity(event.target.value)}>
                  {cities.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Link href={href} className={styles.tripLink}>
              Explore {intent.label.toLowerCase()}
              <ArrowUpRight size={21} aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.tripNote}>{intent.description}</p>
        </div>
        <div className={styles.tripPhoto} key={intent.slug}>
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
            className={styles.photoCredit}
          >
            {intent.label} inspiration · {story.credit}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}
