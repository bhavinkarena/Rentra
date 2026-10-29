/** Guest-facing hotel words (hotel plan, Phase 6). Owner screens keep their own wizard copy. */
export const MEAL_LABELS = {
  EP: 'Room only',
  CP: 'Breakfast included',
  MP: 'Breakfast and one meal',
  AP: 'All meals',
};
export const BED_LABELS = {
  king: 'King bed',
  queen: 'Queen bed',
  double: 'Double bed',
  single: 'Single bed',
  sofa_bed: 'Sofa bed',
  bunk: 'Bunk bed',
};
export const ID_LABELS = {
  aadhaar: 'Aadhaar',
  passport: 'Passport',
  driving_licence: 'Driving licence',
  voter_id: 'Voter ID',
};

/** "2 King beds · 1 Sofa bed". */
export const bedsLine = (beds = []) =>
  beds
    .map(({ type, count }) => `${count} ${BED_LABELS[type] ?? type}${count > 1 ? 's' : ''}`)
    .join(' · ');

/** wifi_free → "Wifi free"; room amenity slugs are owner-chosen. */
export const humanize = (slug) => {
  const text = String(slug).replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** "18 Nov, 12:00 pm" in property time. */
export const formatInstant = (iso) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });

/**
 * The API's party split (booking/hotel-stays.js splitParty): adults as evenly
 * as possible, children one by one. Rooms chosen on the page take guests in order.
 */
export function splitParty({ rooms, adults, childAges = [] }) {
  return Array.from({ length: rooms }, (_, index) => ({
    adults: Math.floor(adults / rooms) + (index < adults % rooms ? 1 : 0),
    childAges: childAges.filter((_, child) => child % rooms === index),
  }));
}

/** First `n` humanized facilities plus how many are left for the disclosure. */
export const facilitySummary = (amenities = [], n = 4) => ({
  shown: amenities.slice(0, n).map(humanize),
  more: Math.max(0, amenities.length - n),
});

/** "Photo 2 of 5" for a zero-based index. */
export const photoLabel = (i, total) => `Photo ${i + 1} of ${total}`;
