'use client';
import { useState } from 'react';
import { ArrowUpRight, ArrowLeft, ArrowRight, MapPin } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import Image from '@/components/rentra/PropertyImage';
import styles from './home.module.css';

/** Manual controls keep the photograph still while guests read. */
export default function HomeHero({ places }) {
  const [active, setActive] = useState(0);
  const place = places[active];
  const change = (delta) =>
    setActive((current) => (current + delta + places.length) % places.length);
  return (
    <div className={styles.hero} aria-label="Getaway inspiration">
      {place?.photo && (
        <div key={place.id} className={styles.heroImage}>
          <Image
            src={place.photo.url}
            alt={place.photo.alt || place.title}
            fill
            preload={active === 0}
            sizes="(min-width: 1440px) 1392px, 100vw"
            quality={75}
            className="object-cover"
          />
        </div>
      )}
      <div className={styles.heroShade} />
      <div className={styles.heroCopy}>
        <h1>
          Good times.
          <br />
          Great places.
          <br />
          <span>Your people.</span>
        </h1>
        <p>
          A pool day. A night away. A reason to get everyone together. Find your next escape with
          Rentra.
        </p>
        <Link href="#find-a-place" className={styles.heroCta}>
          Find your escape <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </div>
      {place && (
        <div className={styles.heroBottom}>
          <Link href={place.href} className={styles.heroPlace}>
            <MapPin size={17} aria-hidden="true" />
            <span>
              <strong>{place.title}</strong>
              <span>{place.area}</span>
            </span>
            <ArrowUpRight size={20} aria-hidden="true" />
          </Link>
          {places.length > 1 && (
            <div className={styles.heroControls}>
              <button type="button" onClick={() => change(-1)} aria-label="Previous featured place">
                <ArrowLeft size={18} aria-hidden="true" />
              </button>
              <span aria-live="polite" aria-atomic="true">
                {String(active + 1).padStart(2, '0')} / {String(places.length).padStart(2, '0')}
                <span className="sr-only">: {place.title}</span>
              </span>
              <button type="button" onClick={() => change(1)} aria-label="Next featured place">
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
