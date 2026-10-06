'use client';
import { useEffect, useId, useState } from 'react';
import {
  Search,
  Building2,
  CalendarDays,
  LifeBuoy,
  Star,
  ShieldAlert,
  Users,
  Compass,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from '@/components/navigation/NavigationLink';
import LoaderCircle from '@/components/ui/rentra-loader';
import Skeleton from '@/components/ui/skeleton';
import { partnerApi } from '@/lib/api/endpoints';

const pages = [
  ['Dashboard', '/partner'],
  ['Properties', '/partner/listings'],
  ['Bookings', '/partner/bookings'],
  ['Calendar', '/partner/calendar'],
  ['Earnings', '/partner/earnings'],
  ['Reviews', '/partner/reviews'],
  ['Inbox', '/partner/updates'],
  ['Caretakers', '/partner/team'],
  ['Help & support', '/partner/help'],
  ['Settings', '/partner/settings'],
];
const types = {
  property: { label: 'Properties', icon: Building2, style: 'bg-brand-50 text-brand-600' },
  booking: { label: 'Bookings', icon: CalendarDays, style: 'bg-info-bg text-info' },
  support: { label: 'Support', icon: LifeBuoy, style: 'bg-warning-bg text-warning' },
  review: { label: 'Reviews', icon: Star, style: 'bg-amber-100 text-amber-700' },
  dispute: { label: 'Disputes', icon: ShieldAlert, style: 'bg-danger-bg text-danger' },
  caretaker: {
    label: 'Caretakers',
    icon: Users,
    style: 'bg-event-adjustment-bg text-event-adjustment',
  },
};
const filters = [
  ['all', 'All'],
  ['property', 'Property'],
  ['booking', 'Booking'],
];
const ownerSearch = async (q, type) => ({
  items: (await partnerApi.search({ q, type, page: 1 }))?.items ?? [],
});

/**
 * Header live search. Owner workspace by default; the admin shell passes its
 * own `search`, `types`, `filters` and `pages` so both portals share one UI.
 * `search` resolves `{ items, totals?, failed? }`; items carry type, id,
 * title, reference, status and href.
 */
export default function OwnerGlobalSearch({
  search = ownerSearch,
  pages: pageLinks = pages,
  types: sections = types,
  filters: chips = filters,
  label = 'Search owner workspace',
  placeholder = 'Search properties, bookings and more',
  moreHref,
}) {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const id = useId();
  const router = useRouter();
  const q = value.trim();
  const visible = open && q.length >= 3;
  const suggestions = pageLinks.filter(([title]) => title.toLowerCase().includes(q.toLowerCase()));
  const current = result?.q === q && result?.filter === filter ? result : null;

  useEffect(() => {
    if (q.length < 3) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const data = await search(q, filter);
        if (active) setResult({ q, filter, ...data, error: false });
      } catch {
        if (active) setResult({ q, filter, items: [], error: true });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, filter, search]);

  return (
    <div
      role="search"
      className="relative w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'Enter' && event.target.tagName === 'INPUT' && moreHref && q) {
          setOpen(false);
          router.push(moreHref(q, filter));
        }
        if (event.key === 'ArrowDown' && event.target.tagName === 'INPUT' && visible) {
          const first = event.currentTarget.querySelector('a');
          if (first) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div
        data-field-shell
        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-ink-25 px-3 focus-within:border-brand-600"
      >
        {visible && !current ? (
          <LoaderCircle className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
        ) : (
          <Search className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
        )}
        <input
          type="search"
          name="q"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          maxLength={100}
          aria-label={label}
          aria-controls={visible ? id : undefined}
          placeholder={placeholder}
          className="min-h-11 min-w-0 flex-1 bg-transparent text-meta outline-none focus-visible:outline-none!"
        />
      </div>
      {visible && (
        <div
          id={id}
          className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(32rem,70dvh)] overflow-y-auto rounded-xl border border-border bg-card shadow-lg"
        >
          <div
            role="group"
            aria-label="Search filters"
            className="sticky top-0 z-10 flex gap-2 overflow-x-auto border-b border-border bg-card p-3"
          >
            {chips.map(([type, chip]) => (
              <button
                key={type}
                type="button"
                aria-pressed={filter === type}
                onClick={() => setFilter(type)}
                className={`min-h-11 shrink-0 whitespace-nowrap rounded-lg border px-4 text-meta font-semibold ${filter === type ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-transparent text-ink-500 hover:bg-ink-25'}`}
              >
                {chip}
              </button>
            ))}
          </div>
          {filter === 'all' && suggestions.length > 0 && (
            <>
              <h3 className="flex items-center gap-2 bg-ink-25 px-4 py-2 text-tiny font-semibold uppercase tracking-wide text-ink-600">
                <Compass className="size-4" aria-hidden="true" />
                Pages
              </h3>
              {suggestions.map(([title, href]) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center rounded-md px-3 text-meta hover:bg-ink-25 focus-visible:bg-ink-25"
                >
                  {title}
                </Link>
              ))}
            </>
          )}
          <div role="status" className="text-meta text-ink-600">
            {!current && (
              <>
                <span className="sr-only">Searching…</span>
                <div className="space-y-1 p-2">
                  {[0, 1, 2].map((row) => (
                    <div key={row} className="flex items-center gap-3 px-3 py-3">
                      <span className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-3.5 w-2/5" />
                        <Skeleton className="h-3 w-3/5" />
                      </span>
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  ))}
                </div>
              </>
            )}
            {current?.error && <p className="px-3 py-2">Could not load results. Try again.</p>}
            {current && !current.error && !current.items.length && (
              <p className="px-3 py-2">No matching results.</p>
            )}
            {current?.failed?.length > 0 && (
              <p className="px-3 py-2">
                {current.failed.map((type) => sections[type]?.label).join(', ')} could not load.
              </p>
            )}
          </div>
          {Object.entries(sections).map(([type, { label: heading, icon: Icon, style }]) => {
            const items = current?.items.filter((row) => row.type === type) ?? [];
            if (!items.length || (filter !== 'all' && filter !== type)) return null;
            const total = current.totals?.[type] ?? items.length;
            return (
              <section
                key={type}
                aria-label={`${heading} results`}
                className="border-t border-border"
              >
                <h3
                  className={`flex items-center gap-2 px-4 py-3 text-tiny font-semibold uppercase tracking-wide ${style}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {heading}
                  <span className="ml-auto">{total}</span>
                </h3>
                <div className="space-y-1 p-2">
                  {items.map((row) => (
                    <Link
                      key={row.type + row.id}
                      href={row.href}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 hover:bg-ink-25 focus-visible:bg-ink-25"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-meta font-semibold text-ink-900">
                          {row.title}
                        </span>
                        {row.reference && (
                          <span className="block truncate text-tiny text-ink-500">
                            {row.reference}
                          </span>
                        )}
                      </span>
                      {row.status && (
                        <span className="shrink-0 rounded-full bg-ink-50 px-2 py-1 text-tiny capitalize text-ink-600">
                          {row.status.replaceAll('_', ' ')}
                        </span>
                      )}
                    </Link>
                  ))}
                  {moreHref && total > items.length && (
                    <Link
                      href={moreHref(q, type)}
                      onClick={() => setOpen(false)}
                      className="flex min-h-11 items-center rounded-lg px-3 text-meta font-semibold text-brand-700 hover:bg-ink-25 focus-visible:bg-ink-25"
                    >
                      View all {total} {heading.toLowerCase()}
                    </Link>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
