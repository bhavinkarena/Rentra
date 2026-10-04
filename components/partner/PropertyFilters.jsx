'use client';
import { segmentedTrack, segmentedItem } from '@/components/ui/segmented-control';
import NavigationProgress from '@/components/navigation/NavigationProgress';
import LoaderCircle from '@/components/ui/rentra-loader';

import { useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';

/** PROP-04: one segmented control; `count` reads the summary. */
const SEGMENTS = [
  { value: 'all', label: 'All', count: (s) => s.total },
  { value: 'live', label: 'Live', count: (s) => s.live },
  { value: 'needs_you', label: 'Needs you', count: (s) => s.needsYou },
  { value: 'review', label: 'In review', count: (s) => s.inReview },
  { value: 'drafts', label: 'Drafts', count: (s) => s.counts?.draft ?? 0 },
  { value: 'paused', label: 'Paused', count: (s) => s.counts?.paused ?? 0 },
];
/** Older links (Today, saved URLs) keep working and say what they filter. */
const OTHER = {
  attention: 'Drafts and sent back',
  resubmit: 'Edited, submit again',
  unbookable: 'Live, no open dates',
  hidden: 'Hidden by Rentra',
};

const KINDS = { farmhouse: 'Farmhouses', entertainment: 'Venues' };

export default function PropertyFilters({
  query = '',
  status = 'all',
  vertical = '',
  verticals = [],
  summary = {},
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(null);
  const [pending, startTransition] = useTransition();

  function navigate(nextQuery, nextStatus, nextVertical = vertical) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextStatus !== 'all') params.set('status', nextStatus);
    if (nextVertical) params.set('vertical', nextVertical);
    const suffix = params.toString();

    startTransition(() => {
      router.push(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    navigate(searchRef.current?.value ?? '', status);
  }

  // Reads the search box by id: a ref read inside a mapped handler trips react-hooks/refs.
  function choose(nextStatus, nextVertical = vertical) {
    navigate(document.getElementById('property-search')?.value ?? query, nextStatus, nextVertical);
  }

  function reset() {
    if (searchRef.current) searchRef.current.value = '';
    navigate('', 'all', '');
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
      <NavigationProgress active={pending} />
      <div
        role="group"
        aria-label="Filter by status"
        className={`${segmentedTrack} flex max-w-full overflow-x-auto [scrollbar-width:thin]`}
      >
        {SEGMENTS.map((segment) => (
          <button
            key={segment.value}
            type="button"
            aria-pressed={status === segment.value}
            disabled={pending}
            onClick={() => choose(segment.value)}
            className={`${segmentedItem(status === segment.value)} shrink-0 gap-1.5`}
          >
            {segment.label}
            <span className="tabular opacity-80">{segment.count(summary) ?? 0}</span>
          </button>
        ))}
        {OTHER[status] ? (
          <span className={`${segmentedItem(true)} shrink-0`}>{OTHER[status]}</span>
        ) : null}
      </div>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <form onSubmit={handleSubmit} className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <label htmlFor="property-search" className="sr-only">
              Search properties
            </label>
            <input
              id="property-search"
              ref={searchRef}
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search property, location or code"
              className="h-12 w-full rounded-full border border-input bg-card pr-3 pl-10 text-base text-ink-900 placeholder:text-muted-foreground focus:border-brand-600 md:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-primary px-5 text-meta font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait disabled:opacity-60"
          >
            Search
          </button>
        </form>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {verticals.length > 1 ? (
            <div role="group" aria-label="Property type" className={`${segmentedTrack} max-w-full`}>
              {verticals.length > 1
                ? // Only for owners who list both kinds.
                  [['', 'All kinds'], ...verticals.map((code) => [code, KINDS[code] ?? code])].map(
                    ([code, label]) => (
                      <button
                        key={code || 'all'}
                        type="button"
                        aria-pressed={vertical === code}
                        onClick={() => choose(status, code)}
                        disabled={pending}
                        className={segmentedItem(vertical === code)}
                      >
                        {label}
                      </button>
                    ),
                  )
                : null}
            </div>
          ) : null}

          {query || status !== 'all' || vertical ? (
            <button
              type="button"
              onClick={reset}
              disabled={pending}
              className="grid size-11 shrink-0 place-items-center rounded-md border border-border bg-card text-ink-500 hover:bg-ink-50 hover:text-ink-900"
              aria-label="Clear filters"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
          ) : null}

          {pending ? (
            <span
              className="grid size-5 shrink-0 place-items-center"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle className="size-4  text-brand-600" aria-label="Updating properties" />
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
