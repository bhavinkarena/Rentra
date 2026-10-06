'use client';

import { SLOTS } from '@/lib/domain/pricing';
import { SLOT_ICONS } from './slot-icons';

export default function VisitTypeFilter({
  value,
  onChange,
  items = Object.values(SLOTS),
  disabled = false,
  prices,
  label = 'Visit type',
  className = '',
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`grid gap-1 rounded-[24px] bg-ink-50 p-1.5 ${className}`}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => {
        const Icon = SLOT_ICONS[item.id];
        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={value === item.id}
            disabled={disabled || (prices != null && !prices[item.id])}
            onClick={() => onChange(item.id)}
            className="inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-[19px] px-1.5 py-2 text-xs font-semibold whitespace-nowrap text-ink-600 transition-[color,background-color,box-shadow] duration-200 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-pressed:bg-white aria-pressed:text-brand-800 aria-pressed:shadow-sm disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none sm:text-meta"
          >
            <Icon className="size-4 shrink-0 sm:size-5" aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
