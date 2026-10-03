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
import Link from '@/components/navigation/NavigationLink';
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
  property: 'Property',
  booking: 'Booking',
  support: 'Support',
  review: 'Review',
  dispute: 'Dispute',
  caretaker: 'Caretaker',
};
const sectionStyles = {
  property: 'bg-brand-50 text-brand-600',
  booking: 'bg-info-bg text-info',
  support: 'bg-warning-bg text-warning',
  review: 'bg-amber-100 text-amber-700',
  dispute: 'bg-danger-bg text-danger',
  caretaker: 'bg-event-adjustment-bg text-event-adjustment',
};
const sectionIcons = {
  property: Building2,
  booking: CalendarDays,
  support: LifeBuoy,
  review: Star,
  dispute: ShieldAlert,
  caretaker: Users,
};
const filters = [
  ['all', 'All'],
  ['property', 'Property'],
  ['booking', 'Booking'],
];

export default function OwnerGlobalSearch() {
  const [value, setValue] = useState('');
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [filter, setFilter] = useState('all');
  const id = useId();
  const q = value.trim();
  const visible = open && q.length >= 3;
  const suggestions = pages.filter(([title]) => title.toLowerCase().includes(q.toLowerCase()));
  const current = result?.q === q && result?.filter === filter ? result : null;

  useEffect(() => {
    if (q.length < 3) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const data = await partnerApi.search({ q, type: filter, page: 1 });
        if (active) setResult({ q, filter, items: data?.items ?? [], error: false });
      } catch {
        if (active) setResult({ q, filter, items: [], error: true });
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [q, filter]);

  return (
    <div
      role="search"
      className="relative w-full"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setOpen(false);
        if (event.key === 'ArrowDown' && event.target.tagName === 'INPUT' && visible) {
          const first = event.currentTarget.querySelector('a');
          if (first) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
    >
      <div className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-input bg-ink-25 px-3 focus-within:border-brand-600">
        <Search className="size-4 shrink-0 text-ink-600" aria-hidden="true" />
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
          aria-label="Search owner workspace"
          aria-controls={visible ? id : undefined}
          placeholder="Search properties, bookings and more"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-meta outline-none"
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
            className="sticky top-0 z-10 flex gap-2 border-b border-border bg-card p-3"
          >
            {filters.map(([type, label]) => (
              <button
                key={type}
                type="button"
                aria-pressed={filter === type}
                onClick={() => setFilter(type)}
                className={`min-h-11 rounded-lg border px-4 text-meta font-semibold ${filter === type ? 'border-brand-200 bg-brand-50 text-brand-600' : 'border-transparent text-ink-500 hover:bg-ink-25'}`}
              >
                {label}
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
            {!current && <p className="px-3 py-2">Searching…</p>}
            {current?.error && <p className="px-3 py-2">Could not load results. Try again.</p>}
            {current && !current.error && !current.items.length && (
              <p className="px-3 py-2">No matching results.</p>
            )}
          </div>
          {Object.entries(types).map(([type, label]) => {
            const Icon = sectionIcons[type];
            const items = current?.items.filter((row) => row.type === type) ?? [];
            if (!items.length || (filter !== 'all' && filter !== type)) return null;
            return (
              <section
                key={type}
                aria-label={`${label} results`}
                className="border-t border-border"
              >
                <h3
                  className={`flex items-center gap-2 px-4 py-3 text-tiny font-semibold uppercase tracking-wide ${sectionStyles[type]}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label === 'Property'
                    ? 'Properties'
                    : `${label}${label === 'Support' ? '' : 's'}`}
                  <span className="ml-auto">{items.length}</span>
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
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
