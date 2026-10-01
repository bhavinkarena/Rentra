'use client';

import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { SLOTS } from '@/lib/domain/pricing';
import { clock12 } from '@/lib/domain/vertical-ui';
import Form from '@/components/navigation/NavigationForm';
import { measureBrowser } from '@/lib/domain/browser-measurement';
import SearchBar, { useDiscovery, useSearchDraft } from './SearchBar';
import SearchFields from './SearchFields';

const PANEL_ID = 'header-search-panel';
const noSubscribe = () => () => {};

/**
 * Airbnb-style docked search on home and discovery pages. Hidden until the
 * page's bar scrolls up under the header (data-search-docked, set by
 * useSearchDock), then a
 * compact pill rises into the header. Any part of the pill expands the full
 * bar beneath the header, over a dimmed page, focused on the field tapped.
 * It collapses on Escape, an outside tap, focus leaving, or a real scroll.
 */
export default function HeaderSearch({ registry }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // document.body after hydration, null on the server — no mount effect needed.
  const portal = useSyncExternalStore(
    noSubscribe,
    () => document.body,
    () => null,
  );
  // Discovery searches stay on the same path, so the query counts as a new page too.
  const url = `${pathname}?${useSearchParams()}`;
  const [seenPath, setSeenPath] = useState(url);
  const [draft] = useSearchDraft();
  const discovery = useDiscovery();
  const trigger = useRef(null);
  const panel = useRef(null);

  // A submitted search navigates away; arriving anywhere starts collapsed.
  if (seenPath !== url) {
    setSeenPath(url);
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
    const onKey = (e) => e.key === 'Escape' && !e.defaultPrevented && close(true);
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

  // The homes (`/`, `/entertainment`) and discovery pages; nowhere else.
  const playHome = !discovery && pathname === '/entertainment';
  if (pathname !== '/' && !playHome && !discovery) return null;
  // Entertainment: the home's draft, or a venue search's own filters.
  const play = playHome || discoveryVertical(discovery) === 'entertainment';
  const venue = playHome
    ? draft
    : discovery && {
        activity: discovery.route?.category?.slug ?? discovery.filters.category,
        date: discovery.filters.dates[0] ?? '',
        start: discovery.filters.start,
        duration: discovery.filters.duration ?? 60,
      };

  const { location, dates, slot, guests } = discovery
    ? discoverySummary(discovery, registry)
    : draft;

  const openAt = (field) => {
    setOpen(true);
    requestAnimationFrame(() =>
      panel.current?.querySelector(`[data-search-field="${field}"]`)?.click(),
    );
  };
  const where = location.title || 'Anywhere';
  const when =
    dates.length > 1
      ? `${dates.length} dates`
      : dates[0]
        ? formatLocalDate(dates[0], { weekday: undefined })
        : 'Any date';
  const who = `${guests || 1} ${guests === 1 ? 'guest' : 'guests'}`;
  const segment =
    'flex h-full min-w-0 cursor-pointer items-center truncate rounded-full px-4 text-meta font-medium text-ink-900 transition-colors hover:bg-ink-50';
  const expand = { 'aria-expanded': open, 'aria-controls': PANEL_ID };
  // Entertainment: What · When · Time instead of When · Visit type · Who.
  const segments = play
    ? [
        [
          'activity',
          'What',
          registry.categories.find((c) => c.slug === venue.activity)?.name || 'Any activity',
        ],
        [
          'date',
          'When',
          venue.date ? formatLocalDate(venue.date, { weekday: undefined }) : 'Any date',
        ],
        [
          'time',
          'Time',
          `${venue.start ? `From ${clock12(venue.start)}` : 'Any time'} · ${venue.duration / 60} hr`,
        ],
      ]
    : [
        ['dates', 'When', when],
        ['slot', 'Visit type', SLOTS[slot]?.label],
        ['guests', 'Guests', who],
      ];

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
            onClick={() => openAt('location')}
            aria-label={`Where: ${where}`}
            className={`${segment} max-md:flex-1 max-md:pr-2`}
            {...expand}
          >
            <span className="truncate md:hidden">{location.title || 'Where to?'}</span>
            <span className="truncate max-md:hidden">{where}</span>
          </button>
          {segments.map(([field, label, value], index) => (
            <Fragment key={field}>
              <span className="h-6 w-px shrink-0 bg-border max-md:hidden" aria-hidden="true" />
              <button
                type="button"
                onClick={() => openAt(field)}
                aria-label={`${label}: ${value}`}
                className={`${segment}${index === 2 ? ' text-ink-600' : ''} max-md:hidden`}
                {...expand}
              >
                {value}
              </button>
            </Fragment>
          ))}
          <button
            type="button"
            onClick={() => openAt('location')}
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
                  !e.relatedTarget.closest('[data-search-panel]') &&
                  e.relatedTarget !== trigger.current &&
                  close(false)
                }
                className={`fixed inset-x-0 top-15 z-40 max-h-[calc(100dvh-3.75rem)] reveal origin-top overflow-y-auto border-b border-border bg-background px-4 pt-3 pb-5 shadow-lg sm:px-6 ${
                  open
                    ? 'visible revealed translate-y-0 opacity-100'
                    : 'invisible -translate-y-3 opacity-0'
                }`}
              >
                <div className="mx-auto max-w-5xl">
                  {open &&
                    (discovery ? (
                      <DiscoveryPanel discovery={discovery} registry={registry} />
                    ) : (
                      <SearchBar
                        registry={registry}
                        vertical={play ? 'entertainment' : 'farmhouse'}
                      />
                    ))}
                </div>
              </div>
            </>,
            portal,
          )
        : null}
    </>
  );
}

function discoverySummary({ filters, route }, registry) {
  const city = registry.cities.find((item) => item.slug === filters.city);
  const area = registry.areas.find(
    (item) => item.slug === filters.area && item.cityId === city?.id,
  );
  return {
    location: { title: route?.area?.name || route?.city?.name || area?.name || city?.name || '' },
    dates: filters.dates,
    slot: filters.slot,
    guests: filters.guests,
  };
}

/* The discovery bar again, posting to the same path. The extra filters ride
   along as hidden fields so a header search never drops them. */
const discoveryVertical = (discovery) =>
  discovery ? (discovery.route?.verticalCode ?? discovery.filters.vertical) : null;

function DiscoveryPanel({ discovery, registry }) {
  const { filters, route, path } = discovery;
  const play = discoveryVertical(discovery) !== 'farmhouse';
  const kept = [
    ['q', filters.q],
    // Venues choose the activity in the fields themselves.
    ['category', route?.category || play ? '' : filters.category],
    ...(play
      ? [
          ['players', filters.players],
          ['indoor', filters.indoor],
        ]
      : []),
    ['min', filters.min],
    ['max', filters.max],
    ['cancellation', filters.cancellation],
    ['sort', filters.sort],
    ...filters.amenities.map((slug) => ['amenities', slug]),
  ].filter(([, value]) => value !== '' && value != null);
  return (
    <Form
      action={path}
      data-surface="light"
      aria-label={play ? 'Search venues' : 'Search places'}
      onSubmit={() => measureBrowser('search_submitted')}
    >
      <SearchFields
        filters={filters}
        registry={registry}
        route={route}
        vertical={discoveryVertical(discovery)}
        submitLabel={play ? 'Show venues' : 'Show places'}
      />
      {kept.map(([name, value], index) => (
        <input key={index} type="hidden" name={name} value={value} />
      ))}
    </Form>
  );
}
