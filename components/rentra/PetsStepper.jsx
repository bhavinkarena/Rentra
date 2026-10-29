'use client';

import { useId } from 'react';
import { Minus, PawPrint, Plus } from 'lucide-react';

const roundButton =
  'grid size-11 shrink-0 place-items-center rounded-full border border-border text-ink-700 hover:border-brand-600 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-brand-600 aria-disabled:cursor-not-allowed aria-disabled:opacity-30';

/**
 * Story 3.9: ordinary pets in the party, 0–5. Assistance animals are never counted.
 * The bound buttons stay focusable (aria-disabled), so keyboard focus is not lost at 0 or 5.
 */
export default function PetsStepper({ value = 0, onChange, max = 5, className = '' }) {
  const id = useId();
  const step = (next) => {
    if (next >= 0 && next <= max) onChange(next);
  };
  return (
    <div
      role="group"
      aria-labelledby={`${id}-label`}
      aria-describedby={`${id}-hint`}
      className={`flex items-center justify-between gap-3 py-2 ${className}`}
    >
      <div>
        <p id={`${id}-label`} className="flex items-center gap-1.5 font-semibold">
          <PawPrint className="size-4 text-ink-600" aria-hidden="true" />
          Pets
        </p>
        <p id={`${id}-hint`} className="mt-1 text-tiny text-ink-600">
          Don’t count assistance animals
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Fewer pets"
          className={roundButton}
          aria-disabled={value <= 0}
          onClick={() => step(value - 1)}
        >
          <Minus className="size-4" />
        </button>
        <span className="w-8 text-center text-meta font-semibold tabular" aria-live="polite">
          {value}
        </span>
        <button
          type="button"
          aria-label="More pets"
          className={roundButton}
          aria-disabled={value >= max}
          onClick={() => step(value + 1)}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
