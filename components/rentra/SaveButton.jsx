'use client';
import RentraLoader from '@/components/ui/rentra-loader';

import { startTransition } from 'react';
import { useSavedPlaces } from '@/components/customer/SavedPlacesProvider';
import { useAppSelector } from '@/lib/store/hooks';
import { useBookingQuote } from './listing/BookingQuoteProvider';
import { Heart } from 'lucide-react';

/**
 * @param {object} props
 * @param {'overlay'|'inline'} [props.variant] `overlay` is the heart floating
 *   on a card photo. `inline` is the labelled control in a listing's title
 *   block, where it sits next to Share and needs a visible word.
 */
export default function SaveButton({
  rentableId,
  listingTitle,
  variant = 'overlay',
  selection: suppliedSelection,
}) {
  const places = useSavedPlaces();
  const search = useAppSelector((state) => state.search);
  const context = useBookingQuote();
  const booking = context?.rentableId === rentableId ? context : null;
  const saved = Boolean(places.entries?.some((e) => e.rentableId === rentableId));
  function onClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const date = booking?.date ?? search.date;
    const selection =
      suppliedSelection !== undefined
        ? suppliedSelection
        : date
          ? {
              rentableId,
              dates: booking?.dates ?? [date],
              slot: booking?.slot ?? search.slot,
              guests: booking?.guests ?? search.guests,
            }
          : null;
    startTransition(() => places.change(rentableId, !saved, selection));
  }

  const label = `${saved ? 'Remove from saved:' : 'Save:'} ${listingTitle}`;

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        disabled={!places.ready || places.busy || (Boolean(booking) && !booking.selectionReady)}
        title={places.error ?? undefined}
        className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-meta font-semibold text-ink-700 underline decoration-ink-300 underline-offset-4 transition-colors hover:bg-ink-50 hover:text-ink-900"
      >
        <Heart className={`size-4 ${saved ? 'fill-danger text-danger' : ''}`} aria-hidden="true" />
        {places.busy ? <RentraLoader label="Updating saved place" /> : saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      disabled={!places.ready || places.busy || (Boolean(booking) && !booking.selectionReady)}
      title={places.error ?? undefined}
      aria-label={label}
      className="absolute top-2.5 right-2.5 grid size-11 place-items-center rounded-full bg-white/90 backdrop-blur transition hover:bg-white"
    >
      {places.busy ? (
        <RentraLoader label="Updating saved place" />
      ) : (
        <Heart
          className={`size-4 ${saved ? 'fill-danger text-danger' : 'text-ink-900'}`}
          aria-hidden="true"
        />
      )}
    </button>
  );
}
