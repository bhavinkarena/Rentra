'use client';

import { useAppDispatch, useAppSelector } from '@/lib/store/hooks';
import { setField, setSlot, selectSearch } from '@/lib/store/slices/searchSlice';

/**
 * The date/slot selection shared by the three booking surfaces on a listing
 * page — the picker in the content column, the sticky price box in the rail,
 * and the mobile bottom bar.
 *
 * They are three separate client islands, so the selection cannot live in one
 * component's state. It lives in the search slice, which is also what carries
 * a date the guest already chose in the header search bar: arriving from
 * "Sat 14 Feb / Day picnic" and landing on a listing that has forgotten both
 * is the kind of small betrayal that loses a booking.
 */

/** Local-midnight Date from a YYYY-MM-DD string, with no timezone drift. */
export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const toISODate = (date) => {
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
};

/**
 * Saturday and Sunday carry the weekend rate. This is the one place that
 * decides it — the picker, the price box and the bar must never disagree
 * about whether a date is peak.
 */
export function isWeekendDate(iso) {
  if (!iso) return false;
  const day = parseISODate(iso).getDay();
  return day === 0 || day === 6;
}

export const formatDayLabel = (iso) =>
  iso
    ? parseISODate(iso).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
    : null;

/**
 * Resolve the rent for a date + slot.
 *
 * Precedence: the owner's per-date override beats the weekend rate, which
 * beats the weekday rate. `prices` is the {slot: {weekday, weekend}} map from
 * getListingByCode; `override` is the per-date figure the availability
 * endpoint returns, when the owner has set one.
 */
export function rentFor({ prices, slot, date, override }) {
  if (override != null) return override;
  const band = prices?.[slot];
  if (!band) return null;
  return isWeekendDate(date) ? band.weekend : band.weekday;
}

export function useBookingSelection({ defaultDate = '', defaultSlot = 'night' } = {}) {
  const dispatch = useAppDispatch();
  const { date, slot } = useAppSelector(selectSearch);

  return {
    /**
     * Falls back to the first bookable date the server found, so the panel
     * always opens on a real price rather than an empty state. A guest who
     * has not chosen anything yet is still shown what this costs.
     */
    date: date || defaultDate,
    slot: slot || defaultSlot,
    isExplicitDate: Boolean(date),
    setDate: (value) => dispatch(setField({ field: 'date', value })),
    setSlot: (value) => dispatch(setSlot(value)),
  };
}
