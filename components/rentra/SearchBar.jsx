'use client';

import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setField, selectSearch } from '@/lib/store/slices/searchSlice';
import { SLOTS } from '@/lib/domain/pricing';

/**
 * Where / When / Slot / Guests — four cells, which is the maximum that stays
 * usable on mobile. The Slot cell is what no reference site has.
 *
 * This is client state (Redux) driving a navigation. It does NOT fetch
 * listings — results are rendered by a Server Component at the target route,
 * so the results page stays indexable.
 */
export default function SearchBar() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { area, date, slot, guests } = useAppSelector(selectSearch);

  function onSubmit(e) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (slot) params.set('slot', slot);
    if (guests) params.set('guests', String(guests));
    const city = area.trim() ? area.trim().toLowerCase().replace(/\s+/g, '-') : 'surat';
    router.push(`/${city}/farmhouse?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg md:flex-row md:items-stretch md:rounded-full"
    >
      <Cell label="Where">
        <input
          value={area}
          onChange={(e) => dispatch(setField({ field: 'area', value: e.target.value }))}
          placeholder="Kamrej, Surat"
          className="w-full bg-transparent text-meta text-ink-900 placeholder:text-ink-400 focus:outline-none"
        />
      </Cell>

      <Cell label="When">
        <input
          type="date"
          value={date}
          onChange={(e) => dispatch(setField({ field: 'date', value: e.target.value }))}
          className="w-full bg-transparent text-meta text-ink-900 tabular focus:outline-none"
        />
      </Cell>

      <Cell label="Slot">
        <select
          value={slot}
          onChange={(e) => dispatch(setField({ field: 'slot', value: e.target.value }))}
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
          type="number"
          min={1}
          max={500}
          value={guests}
          onChange={(e) =>
            dispatch(setField({ field: 'guests', value: Number(e.target.value) }))
          }
          className="w-full bg-transparent text-meta text-ink-900 tabular focus:outline-none"
        />
      </Cell>

      <div className="flex items-center p-2">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-meta font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <Search className="size-4" aria-hidden="true" />
          Search
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
