'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setSlot, selectSearch } from '@/lib/store/slices/searchSlice';
import { SLOTS, formatINR } from '@/lib/domain/pricing';

/**
 * Rentra's own component, and the visible proof of the slot-based
 * availability model: a farmhouse sells a day picnic and an overnight to
 * different customers, at different prices, on the same Saturday.
 *
 * Every reference site sells nights only, so none of them have this.
 * Maps directly to availability(rentable_id, date, slot).
 */
export default function SlotSelector({ prices, disabledSlots = [] }) {
  const dispatch = useAppDispatch();
  const { slot: selected } = useAppSelector(selectSearch);

  return (
    <div
      role="group"
      aria-label="Choose a slot"
      className="flex max-w-lg overflow-hidden rounded-md border border-input"
    >
      {Object.values(SLOTS).map((s, i) => {
        const isSelected = selected === s.id;
        const isDisabled = disabledSlots.includes(s.id);
        const price = prices?.[s.id];

        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={isSelected}
            disabled={isDisabled}
            onClick={() => dispatch(setSlot(s.id))}
            className={[
              'flex-1 px-2.5 py-3 text-center transition-colors',
              i > 0 && 'border-l border-border',
              isSelected ? 'bg-brand-600' : 'bg-card hover:bg-ink-50',
              isDisabled && 'cursor-not-allowed opacity-40 hover:bg-card',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span
              className={`block text-meta font-semibold ${isSelected ? 'text-white' : 'text-ink-900'}`}
            >
              {s.label}
            </span>
            <span
              className={`mt-0.5 block text-tiny tabular ${isSelected ? 'text-brand-200' : 'text-ink-500'}`}
            >
              {price != null ? formatINR(price) : s.window}
            </span>
          </button>
        );
      })}
    </div>
  );
}
