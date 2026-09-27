import { formatLocalDate, isWeekendLocalDate, parseLocalDate } from '@/lib/domain/booking-dates';

/** UTC calendar container; this does not represent a guest's arrival time. */
export const parseISODate = parseLocalDate;
export const toISODate = (date) => date.toISOString().slice(0, 10);

/**
 * Saturday and Sunday carry the weekend rate. This is the one place that
 * decides it — the picker, the price box and the bar must never disagree
 * about whether a date is peak.
 */
export function isWeekendDate(iso) {
  if (!iso) return false;
  return isWeekendLocalDate(iso);
}

export const formatDayLabel = (iso) => (iso ? formatLocalDate(iso) : null);

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
