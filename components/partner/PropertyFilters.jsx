'use client';

import { useRef, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LoaderCircle, RotateCcw, Search } from 'lucide-react';

const OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'live', label: 'Live' },
  { value: 'review', label: 'In review' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'paused', label: 'Paused' },
  { value: 'hidden', label: 'Hidden' },
];

export default function PropertyFilters({ query = '', status = 'all' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchRef = useRef(null);
  const [pending, startTransition] = useTransition();

  function navigate(nextQuery, nextStatus) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set('q', nextQuery.trim());
    if (nextStatus !== 'all') params.set('status', nextStatus);
    const suffix = params.toString();

    startTransition(() => {
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
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
    navigate('', 'all');
  }

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-ink-25/55 p-4 sm:flex-row sm:items-center">
      <form onSubmit={handleSubmit} className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search property, location or code"
          className="h-11 w-full rounded-md border border-input bg-card pr-24 pl-10 text-meta text-ink-900 placeholder:text-ink-400 focus:border-brand-600 focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="absolute top-1.5 right-1.5 h-8 rounded-sm bg-ink-900 px-3 text-tiny font-semibold text-white transition-colors hover:bg-ink-800 disabled:cursor-wait"
        >
          Search
        </button>
      </form>

      <div className="flex items-center gap-2">
        <label htmlFor="property-status" className="sr-only">Filter by status</label>
        <select
          id="property-status"
          value={status}
          onChange={handleStatus}
          disabled={pending}
          className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-meta font-medium text-ink-700 focus:border-brand-600 focus:outline-none sm:w-44"
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>

        {(query || status !== 'all') ? (
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
            <LoaderCircle className="size-4 animate-spin text-brand-600" aria-label="Updating properties" />
          ) : null}
        </span>
      </div>
    </div>
  );
}
