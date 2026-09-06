'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SaveButton({ listingTitle }) {
  const [saved, setSaved] = useState(false);

  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const next = !saved;
    setSaved(next);
    toast.success(next ? `Saved ${listingTitle}` : 'Removed from saved');
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved' : 'Save this farmhouse'}
      className="absolute top-2.5 right-2.5 grid size-8 place-items-center rounded-full bg-white/90 backdrop-blur transition hover:bg-white"
    >
      <Heart
        className={`size-4 ${saved ? 'fill-danger text-danger' : 'text-ink-900'}`}
        aria-hidden="true"
      />
    </button>
  );
}
