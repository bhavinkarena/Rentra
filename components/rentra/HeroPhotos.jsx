'use client';

import { useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, MapPin } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import Image from './PropertyImage';

/**
 * Home hero background: featured places' own photos, changed by the guest.
 * Manual only — the photo stays still while people read and type a search.
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

  const change = (delta) => {
    const next = (active + delta + count) % count;
    setPrevious(active);
    setActive(next);
    setMounted((seen) => new Set([...seen, next, (next + 1) % count]));
  };

  return (
    <section className="relative isolate overflow-hidden border-b border-border bg-brand-900">
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

      <div className="relative z-[3] mx-auto max-w-(--container-page) px-6 pt-20 pb-24 md:pt-28 md:pb-32">
        {children}

        {place ? (
          <div className="absolute right-6 bottom-14 flex items-center gap-2 md:bottom-18">
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
              <div className="flex items-center gap-1 rounded-full bg-black/35 p-1 text-white backdrop-blur">
                <button
                  type="button"
                  onClick={() => change(-1)}
                  aria-label="Previous photo"
                  className="grid size-8 place-items-center rounded-full transition hover:bg-white/20 active:scale-95"
                >
                  <ArrowLeft className="size-4" aria-hidden="true" />
                </button>
                <span className="min-w-10 text-center text-tiny tabular" aria-live="polite">
                  {active + 1} / {count}
                  <span className="sr-only">: {place.title}</span>
                </span>
                <button
                  type="button"
                  onClick={() => change(1)}
                  aria-label="Next photo"
                  className="grid size-8 place-items-center rounded-full transition hover:bg-white/20 active:scale-95"
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
