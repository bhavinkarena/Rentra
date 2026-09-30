'use client';
import NavigationProgress from '@/components/navigation/NavigationProgress';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useSyncExternalStore, useTransition } from 'react';
import { Search } from 'lucide-react';
import { SLOTS } from '@/lib/domain/pricing';
import { measureBrowser } from '@/lib/domain/browser-measurement';

/**
 * Where / When / Slot / Guests — four cells, which is the maximum that stays
 * usable on mobile. The Slot cell is what no reference site has.
 *
 * These are local form drafts driving a navigation. It does NOT fetch
 * listings — results are rendered by a Server Component at the target route,
 * so the results page stays indexable.
 *
 * `dock` marks the home hero copy: once its top edge scrolls up under the
 * header it sets data-search-docked on <html>, fades out, and HeaderSearch
 * shows the compact pill in its place.
 */
export default function SearchBar({ dock = false }) {
  const router = useRouter();
  const [{ area, date, slot, guests }, setField] = useSearchDraft();
  const [pending, startNavigation] = useTransition();
  const sentinel = useRef(null);

  useEffect(() => {
    if (!dock) return;
    const root = document.documentElement;
    const offset = document.querySelector('[data-site-header]')?.offsetHeight ?? 68;
    const observer = new IntersectionObserver(
      ([entry]) =>
        root.toggleAttribute(
          'data-search-docked',
          !entry.isIntersecting && entry.boundingClientRect.top < offset,
        ),
      { rootMargin: `-${offset}px 0px 0px 0px` },
    );
    observer.observe(sentinel.current);
    return () => {
      observer.disconnect();
      root.removeAttribute('data-search-docked');
    };
  }, [dock]);

  function destination() {
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (slot) params.set('slot', slot);
    if (guests) params.set('guests', String(guests));
    if (area.trim()) params.set('q', area.trim());
    return `/search?${params.toString()}`;
  }
  function onSubmit(e) {
    e.preventDefault();
    measureBrowser('search_submitted');
    startNavigation(() => router.push(destination()));
  }

  return (
    <>
      {/* Outside the form, so the form's exit transform never moves the trigger line. */}
      {dock ? <div ref={sentinel} aria-hidden="true" /> : null}
      <form
        data-surface="light"
        onSubmit={onSubmit}
        aria-label="Find your next visit"
        className={`flex max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg md:flex-row md:items-stretch md:rounded-full ${
          dock
            ? 'origin-top transition-[opacity,scale,translate] duration-250 ease-out-strong docked:pointer-events-none docked:-translate-y-4 docked:scale-95 docked:opacity-0'
            : ''
        }`}
      >
        <NavigationProgress active={pending} />
        <Cell label="Where">
          <input
            name="q"
            autoComplete="off"
            value={area}
            onChange={(e) => setField('area', e.target.value)}
            placeholder="Kamrej, Surat"
            className="w-full bg-transparent text-base text-ink-900 md:text-sm placeholder:text-muted-foreground focus:outline-none focus:shadow-none"
          />
        </Cell>

        <Cell label="When">
          <input
            name="date"
            type="date"
            value={date}
            onChange={(e) => setField('date', e.target.value)}
            className="w-full bg-transparent text-base text-ink-900 md:text-sm tabular focus:outline-none focus:shadow-none"
          />
        </Cell>

        <Cell label="Slot">
          <select
            name="slot"
            value={slot}
            onChange={(e) => setField('slot', e.target.value)}
            className="w-full bg-transparent text-base text-ink-900 md:text-sm focus:outline-none focus:shadow-none"
          >
            {Object.values(SLOTS).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Cell>

        <Cell label="Guests" last>
          <input
            name="guests"
            type="number"
            min={1}
            max={500}
            value={guests}
            onChange={(e) => setField('guests', Number(e.target.value))}
            className="w-full bg-transparent text-base text-ink-900 md:text-sm tabular focus:outline-none focus:shadow-none"
          />
        </Cell>

        <div className="flex items-center p-2">
          <button
            onPointerEnter={() => router.prefetch(destination())}
            onFocus={() => router.prefetch(destination())}
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-meta font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:bg-muted disabled:text-muted-foreground"
          >
            <Search className="size-4" aria-hidden="true" />
            {pending ? 'Searching…' : 'Search'}
          </button>
        </div>
      </form>
    </>
  );
}

/* One draft shared by the hero bar and the header copy, so what the guest
   typed above the fold is still there when they open search from the header. */
const INITIAL_DRAFT = { area: '', date: '', slot: 'day', guests: 2 };
let draft = INITIAL_DRAFT;
const listeners = new Set();
const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
function setDraftField(field, value) {
  draft = { ...draft, [field]: value };
  listeners.forEach((listener) => listener());
}
export function useSearchDraft() {
  const fields = useSyncExternalStore(
    subscribe,
    () => draft,
    () => INITIAL_DRAFT,
  );
  return [fields, setDraftField];
}

function Cell({ label, children, last }) {
  return (
    <label
      className={`min-w-0 flex-1 cursor-text px-5 py-3 focus-within:bg-accent focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary transition-colors hover:bg-ink-50 ${
        last ? '' : 'border-b border-border md:border-b-0 md:border-r'
      }`}
    >
      <span className="block text-tiny font-bold tracking-wider text-ink-700 uppercase">
        {label}
      </span>
      <span className="mt-0.5 block">{children}</span>
    </label>
  );
}
