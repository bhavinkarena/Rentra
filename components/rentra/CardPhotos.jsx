'use client';

import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Image from './PropertyImage';

/** Load the gallery after its cover so browsing uses already-rendered photos. */
export default function CardPhotos({ photos, title, eager = false, placeholder }) {
  const count = photos.length;
  const offset = count > 1 ? 1 : 0;
  const [position, setPosition] = useState(offset);
  const [animate, setAnimate] = useState(true);
  const [requested, setRequested] = useState(0);
  const [mounted, setMounted] = useState(() => new Set([0]));
  const loaded = useRef(new Set());
  const requestedRef = useRef(offset);
  const active = (position - offset + count) % count;
  const busy = requested !== active;
  const wrapping = count > 1 && (position === 0 || position === count + 1);
  // End copies let either arrow wrap by one slide instead of crossing the gallery.
  const slides = count > 1 ? [count - 1, ...photos.map((_, index) => index), 0] : [0];

  const prime = (index) =>
    setMounted((seen) => (seen.has(index) ? seen : new Set([...seen, index])));
  const show = (target, motion = true) => {
    const index = (target - offset + count) % count;
    const shouldAnimate = motion && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const nextPosition = shouldAnimate ? target : index + offset;
    setAnimate(shouldAnimate);
    requestedRef.current = nextPosition;
    setRequested(index);
    prime(index);
    if (loaded.current.has(index)) setPosition(nextPosition);
  };
  const ready = (index) => {
    loaded.current.add(index);
    if (index === 0) setMounted(new Set(photos.map((_, photoIndex) => photoIndex)));
    if ((requestedRef.current - offset + count) % count === index)
      setPosition(requestedRef.current);
  };
  const step = (delta, motion = true) => show(active + offset + delta, motion);
  const dotStart = Math.max(0, Math.min(active - 2, count - 5));

  return (
    <>
      <div
        className={`absolute inset-0 flex ${animate ? 'transition-transform duration-300 ease-in-out-strong motion-reduce:transition-none' : 'transition-none'}`}
        style={{ transform: `translateX(-${position * 100}%)` }}
        onTransitionEnd={(event) => {
          if (
            event.target === event.currentTarget &&
            event.propertyName === 'transform' &&
            wrapping
          ) {
            setAnimate(false);
            requestedRef.current = active + offset;
            setPosition(active + offset);
          }
        }}
      >
        {slides.map((index, slot) => {
          const photo = photos[index];
          return (
            <div
              key={slot}
              aria-hidden={slot !== position}
              className="relative h-full w-full shrink-0"
            >
              {mounted.has(index) && (slot === index + offset || mounted.size === count) ? (
                <Image
                  src={photo.url}
                  alt={photo.alt || `${title}, photo ${index + 1}`}
                  fill
                  loading={slot === offset && !eager ? 'lazy' : 'eager'}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  placeholder={placeholder}
                  onLoad={() => ready(index)}
                  onError={() => ready(index)}
                  className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03] motion-reduce:transition-none"
                />
              ) : null}
            </div>
          );
        })}
      </div>
      {count > 1 ? (
        <>
          {[-1, 1].map((direction) => {
            const Icon = direction === -1 ? ChevronLeft : ChevronRight;
            return (
              <button
                key={direction}
                type="button"
                aria-label={`${direction === -1 ? 'Previous' : 'Next'} photo of ${title}`}
                aria-busy={busy}
                disabled={busy || wrapping}
                onPointerEnter={() => prime((active + direction + count) % count)}
                onFocus={() => prime((active + direction + count) % count)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  step(direction, event.detail > 0);
                }}
                onKeyDown={(event) => {
                  if (!busy && !wrapping && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
                    event.preventDefault();
                    event.stopPropagation();
                    step(event.key === 'ArrowLeft' ? -1 : 1, false);
                  }
                }}
                className={`card-photo-arrow absolute top-1/2 z-10 grid size-11 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-ink-900 outline-offset-2 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-wait ${direction === -1 ? 'left-1' : 'right-1'}`}
              >
                <span className="grid size-8 place-items-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition-[background-color,transform] duration-150 ease-out-strong hover:bg-white motion-safe:active:scale-95 motion-reduce:transition-none">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </button>
            );
          })}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-2.5 left-1/2 z-[1] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/20 px-2 py-1 backdrop-blur-sm"
          >
            {Array.from({ length: Math.min(count, 5) }, (_, offset) => {
              const index = dotStart + offset;
              return (
                <span
                  key={index}
                  className={`size-1.5 rounded-full transition-[opacity,transform] duration-200 ease-out-strong motion-reduce:transition-none ${index === active ? 'scale-110 bg-white opacity-100' : 'bg-white opacity-50'}`}
                />
              );
            })}
          </div>
          <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            Photo {active + 1} of {count} for {title}
          </span>
        </>
      ) : null}
    </>
  );
}
