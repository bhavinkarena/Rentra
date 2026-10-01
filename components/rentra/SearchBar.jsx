'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import Form from '@/components/navigation/NavigationForm';
import SearchFields from './SearchFields';
import { measureBrowser } from '@/lib/domain/browser-measurement';

export default function SearchBar({ registry, dock = false }) {
  const [draft, setField] = useSearchDraft();
  const sentinel = useSearchDock(dock);

  return (
    <>
      {dock && <div ref={sentinel} aria-hidden="true" />}
      <Form
        action="/search"
        data-surface="light"
        aria-label="Find your next visit"
        onSubmit={() => measureBrowser('search_submitted')}
        className={`max-w-5xl ${dock ? DOCK_EXIT : ''}`}
      >
        <SearchFields registry={registry} draft={draft} onFieldChange={setField} />
      </Form>
    </>
  );
}

/* The docking bar fades up and away while HeaderSearch's pill rises in. */
export const DOCK_EXIT =
  'origin-top transition-[opacity,scale,translate] duration-250 ease-out-strong docked:invisible docked:pointer-events-none docked:-translate-y-4 docked:scale-95 docked:opacity-0';

/** Attach the returned ref to an empty div just above the docking bar. Once
    it scrolls up under the header, data-search-docked goes on <html>. */
export function useSearchDock(enabled = true) {
  const sentinel = useRef(null);
  useEffect(() => {
    if (!enabled) return;
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
  }, [enabled]);
  return sentinel;
}

/* One draft shared by the hero bar and the header copy, so what the guest
   typed above the fold is still there when they open search from the header. */
const INITIAL_DRAFT = {
  location: { city: '', area: '' },
  dates: [],
  mode: 'single',
  slot: 'day',
  guests: 2,
};
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

/* A discovery page publishes its filters here while mounted, so the header
   pill can summarise them and reopen the same search in the header panel. */
let discovery = null;
const discoveryListeners = new Set();
const subscribeDiscovery = (listener) => {
  discoveryListeners.add(listener);
  return () => discoveryListeners.delete(listener);
};
function setDiscovery(value) {
  discovery = value;
  discoveryListeners.forEach((listener) => listener());
}
export function usePublishDiscovery(filters, route, path) {
  useEffect(() => {
    setDiscovery({ filters, route, path });
    return () => setDiscovery(null);
  }, [filters, route, path]);
}
export function useDiscovery() {
  return useSyncExternalStore(
    subscribeDiscovery,
    () => discovery,
    () => null,
  );
}
