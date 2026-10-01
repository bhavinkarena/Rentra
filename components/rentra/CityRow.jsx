'use client';

import { Children, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';

/**
 * One city's places in a native horizontal scroll rail (touch, trackpad and
 * keyboard all work). The arrows are for mouse users, who cannot swipe.
 * Cards are server-rendered children; this island only moves the rail.
 */
export default function CityRow({
  id,
  city,
  href,
  children,
  title = `Near ${city}`,
  subtitle = <>Luxury farmhouses near {city} for birthday &amp; pool parties.</>,
}) {
  const rail = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = rail.current;
    const update = () =>
      setEdge({
        start: el.scrollLeft < 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, []);

  const move = (direction) => {
    const el = rail.current;
    el.scrollBy({
      // One full page of cards (rail width + the 1.25rem gap) per click.
      left: direction * (el.clientWidth + 20),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  const arrow =
    'grid size-10 place-items-center rounded-full border border-border bg-card text-ink-800 transition hover:border-brand-300 hover:bg-brand-50 active:scale-95 disabled:pointer-events-none disabled:opacity-35';

  return (
    <section aria-labelledby={id} className="mt-10 first:mt-6">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h3 id={id} className="text-h3">
            {title}
          </h3>
          <p className="mt-1 text-meta text-ink-600">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href={href}
            className="hidden text-meta font-semibold text-brand-700 hover:underline sm:inline"
          >
            View all in {city} →
          </Link>
          <div className="hidden gap-2 md:flex">
            <button
              type="button"
              className={arrow}
              onClick={() => move(-1)}
              disabled={edge.start}
              aria-label={`Previous places near ${city}`}
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className={arrow}
              onClick={() => move(1)}
              disabled={edge.end}
              aria-label={`More places near ${city}`}
            >
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={rail}
        tabIndex={0}
        aria-label={`Places near ${city}`}
        className="mt-4 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-brand-600 max-lg:-mx-4 max-lg:scroll-px-4 max-lg:px-4 sm:max-lg:-mx-6 sm:max-lg:scroll-px-6 sm:max-lg:px-6"
      >
        {Children.map(children, (card) => (
          // Peek on phones and tablets hints at swiping; desktop shows exactly 4.
          <div className="w-[80%] shrink-0 snap-start sm:w-[42%] lg:w-[calc((100%-3*1.25rem)/4)]">
            {card}
          </div>
        ))}
      </div>

      <Link
        href={href}
        className="mt-3 inline-block text-meta font-semibold text-brand-700 hover:underline sm:hidden"
      >
        View all in {city} →
      </Link>
    </section>
  );
}
