'use client';
import NavigationProgress from '@/components/navigation/NavigationProgress';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
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
 */
export default function SearchBar() {
  const router = useRouter();
  const [fields, setFields] = useState({ area: '', date: '', slot: 'day', guests: 2 });
  const { area, date, slot, guests } = fields;
  const [pending, startNavigation] = useTransition();
  const setField = (field, value) => setFields((previous) => ({ ...previous, [field]: value }));

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
    <form
      onSubmit={onSubmit}
      aria-label="Find your next visit"
      className="flex max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg md:flex-row md:items-stretch md:rounded-full"
    >
      <NavigationProgress active={pending} />
      <Cell label="Where">
        <input
          name="q"
          autoComplete="off"
          value={area}
          onChange={(e) => setField('area', e.target.value)}
          placeholder="Kamrej, Surat"
          className="w-full bg-transparent text-meta text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
      </Cell>

      <Cell label="When">
        <input
          name="date"
          type="date"
          value={date}
          onChange={(e) => setField('date', e.target.value)}
          className="w-full bg-transparent text-meta text-ink-900 tabular focus:outline-none"
        />
      </Cell>

      <Cell label="Slot">
        <select
          name="slot"
          value={slot}
          onChange={(e) => setField('slot', e.target.value)}
          className="w-full bg-transparent text-meta text-ink-900 focus:outline-none"
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
          className="w-full bg-transparent text-meta text-ink-900 tabular focus:outline-none"
        />
      </Cell>

      <div className="flex items-center p-2">
        <button
          onPointerEnter={() => router.prefetch(destination())}
          onFocus={() => router.prefetch(destination())}
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-meta font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-wait disabled:opacity-70"
        >
          <Search className="size-4" aria-hidden="true" />
          {pending ? 'Searching…' : 'Search'}
        </button>
      </div>
    </form>
  );
}

function Cell({ label, children, last }) {
  return (
    <label
      className={`min-w-0 flex-1 cursor-text px-5 py-3 transition-colors hover:bg-ink-50 ${
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
