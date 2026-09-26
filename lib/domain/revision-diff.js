/**
 * Field-level comparison of two submitted listing revisions (CP08). Pure: the
 * admin detail page compares immutable snapshots it already has, so a review
 * shows exactly what changed since the published or previous revision.
 */

const LISTING_FIELDS = [
  ['title', 'Title'],
  ['description', 'Description'],
  ['highlight', 'Highlight'],
  ['exactAddress', 'Exact address'],
  ['location', 'Map location'],
  ['capacity', 'Capacity'],
  ['bedrooms', 'Bedrooms'],
  ['farmSize', 'Farm size'],
  ['farmSizeUnit', 'Farm size unit'],
  ['poolSize', 'Pool size'],
  ['checkInFrom', 'Check-in from'],
  ['checkOutBy', 'Check-out by'],
  ['houseRules', 'House rules'],
  ['cancellationTier', 'Cancellation tier'],
  ['depositAmount', 'Deposit'],
  ['extraGuestCharge', 'Extra guest charge'],
];

function text(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'object') {
    if (value.x != null && value.y != null) return `${value.y}, ${value.x}`;
    return JSON.stringify(value);
  }
  return String(value);
}

const photoKey = (photo) => photo?.key ?? photo?.url ?? JSON.stringify(photo);

function photos(before = [], after = []) {
  const was = new Set(before.map(photoKey));
  const now = new Set(after.map(photoKey));
  const added = [...now].filter((key) => !was.has(key)).length;
  const removed = [...was].filter((key) => !now.has(key)).length;
  if (!added && !removed) return null;
  return {
    label: 'Photos',
    before: `${was.size} photo(s)`,
    after: `${now.size} photo(s): ${added} new, ${removed} removed`,
  };
}

const priceText = (prices = []) =>
  [...prices]
    .sort((a, b) => a.slot.localeCompare(b.slot))
    .map((p) => `${p.slot.replaceAll('_', ' ')} ₹${p.weekday}/₹${p.weekend}`)
    .join(' · ') || '—';
const amenityText = (amenities = []) =>
  amenities
    .map((a) => `${a.labelEn}${a.value ? `: ${a.value}` : ''}`)
    .sort()
    .join(', ') || '—';
const documentText = (documents = []) =>
  documents
    .map((d) => `${d.docType.replaceAll('_', ' ')} (${d.status})`)
    .sort()
    .join(', ') || '—';

/** Rows of `{ label, before, after }` for every field that differs. */
export function diffRevisions(before, after) {
  if (!before || !after) return [];
  const rows = [];
  const push = (label, a, b) => {
    if (a !== b) rows.push({ label, before: a, after: b });
  };
  for (const [key, label] of LISTING_FIELDS)
    push(label, text(before.listing?.[key]), text(after.listing?.[key]));
  for (const [key, label] of [
    ['category', 'Category'],
    ['city', 'City'],
    ['area', 'Area'],
  ])
    push(label, text(before.place?.[key]), text(after.place?.[key]));
  push('Prices', priceText(before.prices), priceText(after.prices));
  push('Amenities', amenityText(before.amenities), amenityText(after.amenities));
  push('Ownership evidence', documentText(before.documents), documentText(after.documents));
  const photoRow = photos(before.photos, after.photos);
  if (photoRow) rows.push(photoRow);
  return rows;
}
