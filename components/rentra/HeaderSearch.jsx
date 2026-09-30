'use client';

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import SearchBar, { useSearchDraft } from './SearchBar';

const PANEL_ID = 'header-search-panel';
const noSubscribe = () => () => {};

/**
 * Airbnb-style docked search, home page only. Hidden until the hero bar
 * scrolls up under the header (data-search-docked, set by SearchBar), then a
 * compact pill rises into the header. Any part of the pill expands the full
 * bar beneath the header, over a dimmed page, focused on the field tapped.
 * It collapses on Escape, an outside tap, focus leaving, or a real scroll.
 */
export default function HeaderSearch() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // document.body after hydration, null on the server — no mount effect needed.
  const portal = useSyncExternalStore(
    noSubscribe,
    () => document.body,
    () => null,
  );
  const [seenPath, setSeenPath] = useState(pathname);
  const [{ area, date, guests }] = useSearchDraft();
  const trigger = useRef(null);
  const panel = useRef(null);

  // A submitted search navigates away; arriving anywhere starts collapsed.
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const close = useCallback((restoreFocus) => {
    setOpen(false);
    // After the commit that makes the pill visible again.
    if (restoreFocus) requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }));
  }, []);

  // Layout effect: the attribute must be gone before close()'s focus frame.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.toggleAttribute('data-search-open', open);
    if (!open) return;
    const startY = window.scrollY;
    const onKey = (e) => e.key === 'Escape' && close(true);
    // A small threshold so a mobile keyboard nudging the page doesn't close it.
    const onScroll = () => Math.abs(window.scrollY - startY) > 64 && close(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
      root.removeAttribute('data-search-open');
    };
  }, [open, close]);

  if (pathname !== '/') return null;

  const openAt = (field) => {
    setOpen(true);
    requestAnimationFrame(() =>
      panel.current?.querySelector(`[name="${field}"]`)?.focus({ preventScroll: true }),
    );
  };
  const where = area.trim() || 'Anywhere';
  const when = date ? formatLocalDate(date, { weekday: undefined }) : 'Any date';
  const who = `${guests || 1} ${guests === 1 ? 'guest' : 'guests'}`;
  const segment =
    'flex h-full min-w-0 cursor-pointer items-center truncate rounded-full px-4 text-meta font-medium text-ink-900 transition-colors hover:bg-ink-50';
  const expand = { 'aria-expanded': open, 'aria-controls': PANEL_ID };

  return (
    <>
      <div className="pointer-events-none flex min-w-0 flex-1 justify-center px-2 md:absolute md:inset-x-0 md:top-0 md:h-full md:items-center md:px-0">
        <div
          role="group"
          aria-label="Search"
          className="reveal pointer-events-auto invisible flex h-11 min-w-0 translate-y-6 scale-[1.15] items-center rounded-full border border-border bg-card opacity-0 shadow-sm docked:visible docked:revealed docked:translate-y-0 docked:scale-100 docked:opacity-100 search-open:invisible search-open:concealed search-open:translate-y-3 search-open:scale-[1.15] search-open:opacity-0 max-md:w-full md:max-w-md lg:max-w-lg"
        >
          <button
            ref={trigger}
            type="button"
            onClick={() => openAt('q')}
            aria-label={`Where: ${where}`}
            className={`${segment} max-md:flex-1 max-md:pr-2`}
            {...expand}
          >
            <span className="truncate md:hidden">{area.trim() || 'Where to?'}</span>
            <span className="truncate max-md:hidden">{where}</span>
          </button>
          <span className="h-6 w-px shrink-0 bg-border max-md:hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={() => openAt('date')}
            aria-label={`When: ${when}`}
            className={`${segment} max-md:hidden`}
            {...expand}
          >
            {when}
          </button>
          <span className="h-6 w-px shrink-0 bg-border max-md:hidden" aria-hidden="true" />
          <button
            type="button"
            onClick={() => openAt('guests')}
            aria-label={`Guests: ${who}`}
            className={`${segment} text-ink-600 max-md:hidden`}
            {...expand}
          >
            {who}
          </button>
          <button
            type="button"
            onClick={() => openAt('q')}
            aria-label="Open search"
            className="mr-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-white transition-colors hover:bg-primary-hover"
            {...expand}
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {portal
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                onClick={() => close(false)}
                className={`fixed inset-0 z-40 bg-ink-900/30 transition-opacity duration-250 ease-out-strong ${
                  open ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
              />
              <div
                ref={panel}
                id={PANEL_ID}
                inert={!open}
                onBlur={(e) =>
                  e.relatedTarget &&
                  !e.currentTarget.contains(e.relatedTarget) &&
                  e.relatedTarget !== trigger.current &&
                  close(false)
                }
                className={`fixed inset-x-0 top-15 z-40 max-h-[calc(100dvh-3.75rem)] reveal origin-top overflow-y-auto border-b border-border bg-background px-4 pt-3 pb-5 shadow-lg sm:px-6 ${
                  open
                    ? 'visible revealed translate-y-0 opacity-100'
                    : 'invisible -translate-y-3 opacity-0'
                }`}
              >
                <div className="mx-auto max-w-3xl">
                  <SearchBar />
                </div>
              </div>
            </>,
            portal,
          )
        : null}
    </>
  );
}
