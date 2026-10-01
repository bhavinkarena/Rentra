'use client';
import NavigationProgress from '@/components/navigation/NavigationProgress';
import LoaderCircle from '@/components/ui/rentra-loader';

import { useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RotateCcw, Search } from 'lucide-react';

const OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'live', label: 'Live' },
  { value: 'review', label: 'In review' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'resubmit', label: 'Edited, resubmit' },
  { value: 'unbookable', label: 'Live, not bookable' },
  { value: 'paused', label: 'Paused' },
  { value: 'hidden', label: 'Hidden by Rentra' },
];

const KINDS = { farmhouse: 'Farmhouses', entertainment: 'Venues' };

export default function PropertyFilters({
  query = '',
  status = 'all',
  vertical = '',
  verticals = [],
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

  function handleStatus(event) {
    navigate(searchRef.current?.value ?? query, event.target.value);
  }

  function reset() {
    if (searchRef.current) searchRef.current.value = '';
    navigate('', 'all', '');
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-ink-25/55 p-4 sm:flex-row sm:items-center">
      <NavigationProgress active={pending} />
      <form onSubmit={handleSubmit} className="relative min-w-0 flex-1">
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
          className="h-14 w-full rounded-md border border-input bg-card pr-24 pl-10 text-base md:text-sm text-ink-900 placeholder:text-muted-foreground focus:border-brand-600"
        />
        <button
          type="submit"
          disabled={pending}
          className="absolute top-1.5 right-1.5 h-11 rounded-md bg-primary px-3 text-tiny font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-wait"
        >
          Search
        </button>
      </form>

      <div className="flex items-center gap-2">
        <label htmlFor="property-status" className="sr-only">
          Filter by status
        </label>
        <select
          id="property-status"
          value={status}
          onChange={handleStatus}
          disabled={pending}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base md:text-sm font-medium text-ink-700 focus:border-brand-600 sm:w-44"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {verticals.length > 1 ? (
          // Entertainment plan, Phase 11: only for owners who list both kinds.
          <>
            <label htmlFor="property-kind" className="sr-only">
              Filter by kind of place
            </label>
            <select
              id="property-kind"
              value={vertical}
              onChange={(event) =>
                navigate(searchRef.current?.value ?? query, status, event.target.value)
              }
              disabled={pending}
              className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base md:text-sm font-medium text-ink-700 focus:border-brand-600 sm:w-36"
            >
              <option value="">All kinds</option>
              {verticals.map((code) => (
                <option key={code} value={code}>
                  {KINDS[code] ?? code}
                </option>
              ))}
            </select>
          </>
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

        <span className="grid size-5 shrink-0 place-items-center" role="status" aria-live="polite">
          {pending ? (
            <LoaderCircle className="size-4  text-brand-600" aria-label="Updating properties" />
          ) : null}
        </span>
      </div>
    </div>
  );
}
