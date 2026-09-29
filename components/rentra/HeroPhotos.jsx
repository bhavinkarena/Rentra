'use client';

import { useState } from 'react';
import { ArrowUpRight, MapPin } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import Image from './PropertyImage';

/**
 * Home hero background: featured places' own photos, cycling every 3s.
 * The active dot's fill is the timer (see .animate-hero-progress): it pauses
 * while the guest types a search or points at the dots, and under reduced
 * motion there is no autoplay.
 *
 * Photos mount on first visit (plus the next one, so "next" is usually ready).
 * The outgoing photo stays visible underneath while the new one fades in, so a
 * slow network never flashes the plain background.
 */
export default function HeroPhotos({ places, children }) {
  const [active, setActive] = useState(0);
  const [previous, setPrevious] = useState(null);
  const [mounted, setMounted] = useState(() => new Set([0, 1]));
  const place = places[active];
  const count = places.length;

  const show = (next) => {
    if (next === active) return;
    setPrevious(active);
    setActive(next);
    setMounted((seen) => new Set([...seen, next, (next + 1) % count]));
  };

  return (
    <section
      data-hero
      data-surface="inverse"
      className="relative isolate overflow-hidden border-b border-border bg-brand-900"
    >
      {places.map((p, i) =>
        mounted.has(i) ? (
          <div
            key={p.id}
            aria-hidden="true"
            className={`absolute inset-0 transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
              i === active
                ? 'z-[1] scale-100 opacity-100'
                : i === previous
                  ? 'scale-100 opacity-100'
                  : 'scale-105 opacity-0'
            }`}
          >
            <Image
              src={p.photo.url}
              alt=""
              fill
              /* Only the first frame is the LCP element, so only it preloads. */
              preload={i === 0}
              loading={i === 0 ? undefined : 'lazy'}
              quality={60}
              sizes="100vw"
              className="object-cover"
            />
          </div>
        ) : null,
      )}
      {/* Scrim, not a tint: keeps AA contrast on the headline over any
          photo while letting the photograph still read as the subject. */}
      <div className="absolute inset-0 z-[2] bg-linear-to-r from-brand-950/92 via-brand-950/75 to-brand-900/45" />

      <div className="relative z-[3] mx-auto max-w-(--container-page) px-4 pt-20 sm:px-6 pb-24 md:pt-28 md:pb-32">
        {children}
      </div>

      {/* Pinned to the hero's edge, not the page container, so it sits in the corner. */}
      {place ? (
        <div className="absolute right-4 bottom-14 z-[3] flex items-center gap-2 sm:right-6 md:bottom-18">
          <Link
            href={place.href}
            className="hidden max-w-sm items-center gap-1.5 rounded-full bg-black/35 px-3 py-2 text-tiny text-white/90 backdrop-blur transition-colors hover:bg-black/50 md:inline-flex"
          >
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {place.title} · {place.area}
            </span>
            <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
          </Link>
          {count > 1 ? (
            <div
              data-hero-dots
              role="group"
              aria-label="Featured place photos"
              className="flex items-center rounded-full bg-black/35 px-2 text-white backdrop-blur"
            >
              {places.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => show(i)}
                  aria-label={`Photo ${i + 1} of ${count}: ${p.title}`}
                  aria-current={i === active || undefined}
                  className="group/dot grid h-9 cursor-pointer place-items-center px-1"
                >
                  <span
                    className={`relative block h-1.5 overflow-hidden rounded-full transition-[width,background-color] duration-300 ease-out ${
                      i === active
                        ? 'w-6 bg-white/35'
                        : 'w-1.5 bg-white/55 group-hover/dot:bg-white'
                    }`}
                  >
                    {i === active ? (
                      <span
                        key={active}
                        onAnimationEnd={() => show((active + 1) % count)}
                        className="animate-hero-progress absolute inset-0 rounded-full bg-white"
                      />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
