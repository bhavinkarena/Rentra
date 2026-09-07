'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Grid2x2, X } from 'lucide-react';

/**
 * 1 large + 4 small, every photo in a lightbox.
 *
 * A client component, but it still server-renders: the hero <img> is in the
 * HTML Google and the browser receive, so the LCP element does not wait for
 * hydration. The hero is the only image here that earns `preload` — Next's
 * own guidance is not to preload when several images compete to be the LCP.
 */
const BLUR =
  'data:image/svg+xml;base64,'
  + btoaSafe(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3">'
    + '<rect width="4" height="3" fill="#EBEEEB"/></svg>',
  );

export default function PhotoGallery({ photos = [], title }) {
  const [openAt, setOpenAt] = useState(null);
  const isOpen = openAt !== null;
  const count = photos.length;

  const step = useCallback(
    (delta) => setOpenAt((i) => (i === null ? null : (i + delta + count) % count)),
    [count],
  );

  // Keyboard is the whole point of a lightbox on desktop, and locking the
  // page behind it stops the gallery scrolling away underneath.
  useEffect(() => {
    if (!isOpen) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') setOpenAt(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, step]);

  if (!count) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg bg-ink-100 text-tiny font-semibold tracking-widest text-ink-400 uppercase">
        photos pending
      </div>
    );
  }

  const [hero, ...rest] = photos;
  const tiles = rest.slice(0, 4);

  return (
    <>
      {/**
        * 4 columns x 2 rows: the hero takes 2x2, the four small tiles fill the
        * rest. The 8/3 container ratio is what makes every tile land on 4:3 —
        * the aspect the listing card already uses, so a photo does not change
        * shape between the grid and this page.
        *
        * One column on a phone: a five-tile mosaic at 390px is five thumbnails.
        */}
      <div className="grid gap-2 sm:aspect-8/3 sm:grid-cols-4 sm:grid-rows-2">
        <Tile
          photo={hero}
          onClick={() => setOpenAt(0)}
          className="aspect-4/3 sm:col-span-2 sm:row-span-2 sm:aspect-auto sm:h-full"
          sizes="(max-width: 640px) 100vw, 50vw"
          preload
        />
        {tiles.map((photo, i) => (
          <Tile
            key={`${photo.url}-${i}`}
            photo={photo}
            onClick={() => setOpenAt(i + 1)}
            sizes="25vw"
            className="hidden sm:block sm:h-full"
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpenAt(0)}
          className="inline-flex items-center gap-2 rounded-md border border-ink-300 bg-card px-4 py-2.5 text-meta font-semibold text-ink-900 transition-colors hover:bg-ink-50"
        >
          <Grid2x2 className="size-4" aria-hidden="true" />
          View all {count} photos
        </button>
        {/* Hidden on a phone: next to the button at 390px it turns into three
            cramped lines and pushes the button into a wrap. */}
        <p className="hidden text-tiny text-ink-500 sm:block">
          Every photo taken by Rentra on the verification visit.
        </p>
      </div>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photos of ${title}`}
          className="fixed inset-0 z-100 flex flex-col bg-ink-900/95 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-4 px-5 py-4 text-white">
            <p className="text-meta tabular">{openAt + 1} / {count}</p>
            <button
              type="button"
              onClick={() => setOpenAt(null)}
              autoFocus
              className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              aria-label="Close photos"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="relative min-h-0 flex-1">
            <Image
              key={photos[openAt].url}
              src={photos[openAt].url}
              alt={photos[openAt].alt ?? ''}
              fill
              sizes="100vw"
              quality={75}
              className="object-contain"
            />
          </div>

          <div className="flex items-center justify-center gap-4 px-5 py-5">
            <LightboxNav label="Previous photo" onClick={() => step(-1)} Icon={ChevronLeft} />
            <LightboxNav label="Next photo" onClick={() => step(1)} Icon={ChevronRight} />
          </div>

          <p className="px-5 pb-5 text-center text-tiny text-white/70">
            {photos[openAt].alt}
          </p>
        </div>
      ) : null}
    </>
  );
}

function Tile({ photo, onClick, className = '', sizes, preload = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-md bg-ink-100 ${className}`}
    >
      <Image
        src={photo.url}
        alt={photo.alt ?? ''}
        fill
        sizes={sizes}
        quality={60}
        placeholder={BLUR}
        {...(preload ? { preload: true } : { loading: 'lazy' })}
        className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
      />
    </button>
  );
}

function LightboxNav({ label, onClick, Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-12 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  );
}

/** btoa exists in both runtimes here, but this file also renders on the server. */
function btoaSafe(str) {
  return typeof btoa === 'function'
    ? btoa(str)
    : Buffer.from(str).toString('base64');
}
