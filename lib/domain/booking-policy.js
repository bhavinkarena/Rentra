/** Customer booking defaults. Property-specific hours/rates must be supplied. */
export const BOOKING_POLICY = Object.freeze({
  version: 'customer-v1',
  currency: 'INR',
  timeZone: 'Asia/Kolkata',
  maxVisits: 10,
  holdMinutes: 10,
  quoteMinutes: 10,
  /** Request to book: the owner answers within this many hours. Mirrors the API. */
  requestHours: 24,
  platformFeeBps: 800,
  illustrativeAdvanceBps: 2500,
});

export const BOOKING_SLOTS = Object.freeze(['day', 'night', 'full_day']);
