/**
 * The owner-facing words for the backend's TRUST_FIELDS (PROP-03). The API
 * sends the field list with every listing, so the copy names exactly what the
 * server reviews; these are only the labels and the form inputs behind them.
 */
export const TRUST_FIELD_LABELS = {
  title: 'the title',
  categoryId: 'the category',
  location: 'the map pin',
  exactAddress: 'the address',
  capacity: 'guest capacity',
  bedrooms: 'bedrooms',
  amenities: 'amenities',
  houseRules: 'house rules',
  photos: 'new photos',
  // Venues: court changes are reviewed by services/booking/venue.js, not TRUST_FIELDS.
  courts: 'courts',
};

/** Form input name → the trust field it writes. */
const INPUT_FIELD = {
  title: 'title',
  categoryId: 'categoryId',
  cityId: 'location',
  areaId: 'location',
  lat: 'location',
  lng: 'location',
  exactAddress: 'exactAddress',
  capacity: 'capacity',
  bedrooms: 'bedrooms',
  amenity: 'amenities',
  petsAllowed: 'houseRules',
  alcoholAllowed: 'houseRules',
  stagAllowed: 'houseRules',
  musicCutoff: 'houseRules',
  extraRules: 'houseRules',
  footwear: 'houseRules',
  minAge: 'houseRules',
  foodAllowed: 'houseRules',
  smokingAllowed: 'houseRules',
};

/** The trust fields behind a set of edited input names. */
export function trustFieldsTouched(inputNames, trustFields = Object.keys(TRUST_FIELD_LABELS)) {
  const fields = new Set();
  for (const name of inputNames) {
    const field =
      INPUT_FIELD[name] ??
      (name.startsWith('value:') ? 'amenities' : name.startsWith('court-') ? 'courts' : null);
    if (field && (field === 'courts' || trustFields.includes(field))) fields.add(field);
  }
  return [...fields];
}

/** "the title, the address and amenities" */
export function trustFieldSentence(
  fields = Object.keys(TRUST_FIELD_LABELS).filter((field) => field !== 'courts'),
) {
  const words = fields.map((field) => TRUST_FIELD_LABELS[field] ?? field);
  return words.length > 1
    ? `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`
    : (words[0] ?? '');
}

/** Statuses where a save is checked again by Rentra before guests see it. */
export const REVIEWED_STATUSES = ['live', 'paused', 'hidden'];
export const IN_REVIEW_STATUSES = ['pending_review', 'pending_verification'];
