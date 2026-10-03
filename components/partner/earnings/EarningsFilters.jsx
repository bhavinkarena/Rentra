'use client';
import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from '@/components/navigation/NavigationLink';
import { earningsQuery, environmentLabel } from '@/lib/domain/owner-earnings';
function adjacentMonth(month, offset) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

export default function EarningsFilters({ data, statement = false }) {
  const [expanded, setExpanded] = useState(false);
  const f = data.filters,
    path = statement ? '/partner/earnings/statements' : '/partner/earnings';
  const previous = adjacentMonth(f.month, -1),
    next = adjacentMonth(f.month, 1);
  return (
    <form
      method="get"
      action={path}
      className={`grid grid-cols-2 items-end gap-3 rounded-lg border border-border bg-card p-4 print:hidden sm:grid-cols-2 ${data.environments.length > 1 ? 'xl:grid-cols-[auto_minmax(0,1fr)_auto_auto]' : 'xl:grid-cols-[auto_minmax(0,1fr)_auto]'}`}
    >
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <label htmlFor="earnings-month" className="mb-1.5 block text-tiny font-medium text-ink-500">
          Month (IST)
        </label>
        <div className="flex items-center gap-1">
          {previous >= '2000-01' ? (
            <Link
              href={`${path}?${earningsQuery({ ...f, month: previous, page: undefined })}`}
              aria-label="Previous month"
              className="grid size-11 shrink-0 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-11 shrink-0" />
          )}
          <input
            id="earnings-month"
            type="month"
            name="month"
            required
            min="2000-01"
            max="2100-12"
            defaultValue={f.month}
            className="h-11 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-base text-ink-900 sm:w-52"
          />
          {next <= '2100-12' ? (
            <Link
              href={`${path}?${earningsQuery({ ...f, month: next, page: undefined })}`}
              aria-label="Next month"
              className="grid size-11 shrink-0 place-items-center rounded-full text-ink-600 hover:bg-ink-100"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-11 shrink-0" />
          )}
        </div>
      </div>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="earnings-extra-filters"
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-11 items-center gap-2 text-meta font-semibold text-ink-700 sm:hidden"
      >
        Filters{f.propertyId ? ' (1)' : ''}
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      <div
        id="earnings-extra-filters"
        className={`${expanded ? 'grid' : 'hidden'} order-last col-span-2 gap-3 border-t border-border pt-3 sm:order-none sm:contents`}
      >
        <label className="grid min-w-0 gap-1.5 text-tiny font-medium text-ink-500">
          Property
          <select
            name="propertyId"
            defaultValue={f.propertyId}
            className="h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-ink-900"
          >
            <option value="">All properties</option>
            {data.properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title || 'Untitled draft'}
              </option>
            ))}
            {f.propertyId && !data.properties.some((p) => p.id === f.propertyId) ? (
              <option value={f.propertyId}>Selected property</option>
            ) : null}
          </select>
        </label>
        {data.environments.length > 1 ? (
          <label className="grid min-w-0 gap-1.5 text-tiny font-medium text-ink-500">
            Booking type
            <select
              name="environment"
              defaultValue={f.environment}
              className="h-11 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base text-ink-900"
            >
              {data.environments.map((v) => (
                <option key={v} value={v}>
                  {environmentLabel(v)}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="environment" value={f.environment} />
        )}
      </div>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-600 px-5 text-meta font-semibold text-white hover:bg-brand-700"
      >
        Apply
      </button>
    </form>
  );
}
