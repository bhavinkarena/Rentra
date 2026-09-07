'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * @param {object} props
 * @param {'overlay'|'inline'} [props.variant] `overlay` is the heart floating
 *   on a card photo. `inline` is the labelled control in a listing's title
 *   block, where it sits next to Share and needs a visible word.
 */
export default function SaveButton({ listingTitle, variant = 'overlay' }) {
  const [saved, setSaved] = useState(false);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    toast.success(next ? `Saved ${listingTitle}` : 'Removed from saved');
  }

  const label = saved ? 'Remove from saved' : 'Save this farmhouse';

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-meta font-semibold text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:bg-ink-50 hover:text-ink-900"
      >
        <Heart
          className={`size-4 ${saved ? 'fill-danger text-danger' : ''}`}
          aria-hidden="true"
        />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={label}
      className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-white/90 backdrop-blur transition hover:bg-white"
    >
      <Heart
        className={`size-4 ${saved ? 'fill-danger text-danger' : 'text-ink-900'}`}
        aria-hidden="true"
      />
    </button>
  );
}
