import { formatINRMinor } from './booking-money.js';

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

/* Story 3.3: room promises. Mirrors rentra-backend src/services/domain/hotel-rooms.js; keep both in step. */
export const BED_CAPACITY = { king: 2, queen: 2, double: 2, bunk: 2, single: 1, sofa_bed: 1 };
export const EXTRA_PLACE_LABELS = { extra_bed: 'Extra bed', mattress: 'Mattress' };
/** Room facility keys for the "In this room" picker; existing saved keys ac/tv kept. */
export const ROOM_FACILITIES = [
  ['ac', 'Air conditioning'],
  ['tv', 'TV'],
  ['wifi', 'Wi-Fi'],
  ['attached_bathroom', 'Attached bathroom'],
  ['hot_water', 'Hot water'],
  ['geyser', 'Geyser'],
  ['toiletries', 'Toiletries'],
  ['towels', 'Towels'],
  ['wardrobe', 'Wardrobe'],
  ['work_desk', 'Work desk'],
  ['kettle', 'Tea/coffee kettle'],
  ['minibar', 'Minibar'],
  ['fridge', 'Fridge'],
  ['safe', 'In-room safe'],
  ['balcony', 'Balcony'],
  ['bathtub', 'Bathtub'],
  ['hair_dryer', 'Hair dryer'],
  ['iron', 'Iron'],
  ['intercom', 'Intercom'],
  ['blackout_curtains', 'Blackout curtains'],
];

/** Adults the beds and extra places sleep. */
export const roomSleeps = (beds = [], extraPlaces = []) => {
  const inBeds = beds.reduce(
    (sum, b) => sum + (BED_CAPACITY[b.type] ?? 0) * (Number(b.count) || 0),
    0,
  );
  const extra = extraPlaces.reduce((sum, p) => sum + (Number(p.count) || 0), 0);
  return { inBeds, extra, total: inBeds + extra };
};

/** "+1 Extra bed · +2 Mattresses". */
export const extraPlacesLine = (extraPlaces = []) =>
  extraPlaces
    .map(
      ({ type, count }) =>
        `+${count} ${EXTRA_PLACE_LABELS[type] ?? type}${count > 1 ? (type === 'mattress' ? 'es' : 's') : ''}`,
    )
    .join(' · ');

/**
 * Story 3.4: "Includes 1 extra bed · ₹500/night" for priced rooms ({ bedding, nights } each, from the
 * backend quote or availability); "" when no bedding is charged. A percentage charge can vary by night.
 */
export const beddingLine = (rooms = []) => {
  const charged = rooms.filter((room) => room?.bedding?.length);
  if (!charged.length) return '';
  const counts = {};
  for (const room of charged)
    for (const { type, count } of room.bedding) counts[type] = (counts[type] ?? 0) + count;
  const places = Object.entries(counts)
    .map(([type, count]) => {
      const label = (EXTRA_PLACE_LABELS[type] ?? type).toLowerCase();
      return `${count} ${label}${count > 1 ? (type === 'mattress' ? 'es' : 's') : ''}`;
    })
    .join(' and ');
  const perNight = (charged[0].nights ?? []).map((_, i) =>
    charged.reduce((sum, room) => sum + (room.nights?.[i]?.beddingMinor ?? 0), 0),
  );
  if (!perNight.length) return `Includes ${places}`;
  const low = Math.min(...perNight);
  const high = Math.max(...perNight);
  if (!high) return `Includes ${places}`;
  const price =
    low === high ? formatINRMinor(low) : `${formatINRMinor(low)}–${formatINRMinor(high)}`;
  return `Includes ${places} · ${price}/night`;
};

export const MEALS = ['breakfast', 'lunch', 'dinner'];
export const MEAL_DEFAULTS = {
  EP: { breakfast: false, lunch: false, dinner: false },
  CP: { breakfast: true, lunch: false, dinner: false },
  MP: { breakfast: true, lunch: false, dinner: false },
  AP: { breakfast: true, lunch: true, dinner: true },
};
export const resolveInclusions = (code, stored) => ({
  ...(MEAL_DEFAULTS[code] ?? MEAL_DEFAULTS.EP),
  ...(stored ?? {}),
});

/** "Breakfast and dinner included", or "Room only". */
export const mealsLine = (inclusions) => {
  const meals = MEALS.filter((meal) => inclusions?.[meal]);
  if (!meals.length) return 'Room only';
  const words = meals.map((m, i) => (i ? m : m.charAt(0).toUpperCase() + m.slice(1)));
  return `${words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words.at(-1)}` : words[0]} included`;
};

/** What a booked room promised (booking_room.room_snapshot); empty for old bookings without one. */
export const bookedRoomLine = (snapshot) =>
  snapshot
    ? [
        bedsLine(snapshot.beds),
        extraPlacesLine(snapshot.extraPlaces),
        snapshot.sizeSqm ? `${snapshot.sizeSqm} m²` : '',
        mealsLine(snapshot.inclusions),
      ]
        .filter(Boolean)
        .join(' · ')
    : '';
