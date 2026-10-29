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

/** Owner rates drawer: has the form moved from what it opened with? Array order is ignored. */
export const formDirty = (initial, form) => {
  const norm = (f) =>
    JSON.stringify(
      Object.keys(f)
        .sort()
        .map((k) => [k, Array.isArray(f[k]) ? [...f[k]].sort() : String(f[k] ?? '')]),
    );
  return norm(initial) !== norm(form);
};

/* Story 3.6: child age bands. Mirrors rentra-backend src/services/domain/child-policy.js; keep both in step. */
const ageWords = (from, to) => (from === to ? `Age ${from} is` : `Ages ${from}-${to} are`);

/** Why the owner's child policy cannot be saved, or null. */
export function policyProblem(policy) {
  const { adultRateFromAge: top, bands = [] } = policy ?? {};
  if (!Number.isInteger(top) || top < 2 || top > 18)
    return 'Adult rate starts between age 2 and 18';
  if (!Array.isArray(bands) || !bands.length) return `${ageWords(0, top - 1)} not covered`;
  for (const [index, band] of bands.entries()) {
    if (!['infant', 'child'].includes(band.kind)) return 'Choose infant or child for each band';
    if (![band.fromAge, band.toAge].every((age) => Number.isInteger(age) && age >= 0 && age <= 17))
      return 'Enter every age as a whole year from 0 to 17';
    if (band.toAge < band.fromAge)
      return `Band ${band.fromAge}-${band.toAge} ends before it starts`;
    const { type, amount } = band.rule ?? {};
    if (type === 'free' && amount !== 0) return 'A free band has no price';
    if (type === 'fixed' && !(Number.isInteger(amount) && amount >= 0 && amount <= 50000))
      return 'Enter each band’s price in whole rupees from 0 to 50,000';
    if (type === 'percent' && band.kind !== 'child')
      return 'Infant bands are free or a fixed price';
    if (type === 'percent' && !(Number.isInteger(amount) && amount >= 1 && amount <= 100))
      return 'Enter each band’s percent as a whole number from 1 to 100';
    if (!['free', 'fixed', 'percent'].includes(type))
      return 'Choose free, a fixed price or a percent for each band';
    const prev = bands[index - 1];
    if (prev && band.fromAge < prev.fromAge) return 'List the bands from youngest to oldest';
    if (prev && band.kind === 'infant' && prev.kind === 'child')
      return 'Infant bands come before child bands';
  }
  let next = 0;
  for (const band of bands) {
    if (band.fromAge > next) return `${ageWords(next, band.fromAge - 1)} not covered`;
    if (band.fromAge < next)
      return `Ages ${band.fromAge}-${Math.min(band.toAge, next - 1)} are in two bands`;
    next = band.toAge + 1;
  }
  if (next > top) return `Ages ${top}-${next - 1} already pay the adult rate`;
  if (next < top) return `${ageWords(next, top - 1)} not covered`;
  return null;
}

/** The editor's starting point when nothing is saved: today's "under N free" rule, adult rate from 18. */
export function defaultChildPolicy(childFreeAge = 6, extraChild = 0) {
  const free = Math.min(Math.max(0, Number(childFreeAge) || 0), 17);
  const bands = [];
  if (free > 0)
    bands.push({ kind: 'infant', fromAge: 0, toAge: free - 1, rule: { type: 'free', amount: 0 } });
  bands.push({
    kind: 'child',
    fromAge: free,
    toAge: 17,
    rule: { type: 'fixed', amount: extraChild },
  });
  return { adultRateFromAge: 18, bands };
}

const rupees = (amount) => formatINRMinor(Math.round(amount * 100));

/** Child charges apply only beyond the guests the room price includes; when only some children pay, the oldest pay first. */
export const CHILD_CHARGE_NOTE =
  "for guests beyond the room's base occupancy; when only some children pay, the oldest pay first";

/** "Under 2: free · 2-11: ₹500/night · 12+: adult rate (for guests beyond …)". */
export function policyLine(policy) {
  if (!policy?.bands?.length) return '';
  const parts = policy.bands.map(({ fromAge, toAge, rule }) => {
    const ages =
      fromAge === 0
        ? `Under ${toAge + 1}`
        : fromAge === toAge
          ? `Age ${fromAge}`
          : `${fromAge}-${toAge}`;
    // Story 3.7: a percent band never shows a ₹ amount; it varies with the night and the room's adults.
    if (rule.type === 'percent')
      return `${ages}: ${rule.amount}% of the room price ÷ adults, per child/night`;
    return `${ages}: ${rule.type === 'free' || !rule.amount ? 'free' : `${rupees(rule.amount)}/night`}`;
  });
  if (policy.adultRateFromAge < 18) parts.push(`${policy.adultRateFromAge}+: adult rate`);
  const charged =
    policy.adultRateFromAge < 18 ||
    policy.bands.some((b) => b.rule.type !== 'free' && b.rule.amount);
  return `${parts.join(' · ')}${charged ? ` (${CHILD_CHARGE_NOTE})` : ''}`;
}

/** "1 cot · free" / "2 cots · ₹300/night"; '' without cots. */
export const cotsLine = (cots) =>
  cots?.count
    ? `${cots.count} cot${cots.count > 1 ? 's' : ''} · ${cots.amount ? `${rupees(cots.amount)}/night` : 'free'}`
    : '';

export const SUPERVISION_LINE = 'At least one guest 18+ per room';
