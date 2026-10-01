import { DEFAULT_VERTICAL } from './verticals.js';

/**
 * How each vertical presents itself (entertainment plan, Phase 6). Frontend only:
 * `verticals.js` beside this file is the backend copy and holds no UI.
 */
export const VERTICAL_UI = {
  farmhouse: { path: '/', explore: 'Explore farmhouses' },
  entertainment: { path: '/entertainment', explore: 'Explore venues' },
};

/** What one bookable unit is called, by activity icon. Everything else is a court. */
const UNIT_NAME = {
  bowling: 'Lane',
  football: 'Turf',
  gaming: 'Station',
  trampoline: 'Arena',
  kart: 'Track',
};
export const unitName = (iconKey) => UNIT_NAME[iconKey] ?? 'Court';

/**
 * The vertical a page belongs to, or null when the page shows no tabs (listing,
 * saved, help…). Taxonomy pages are `/{city}/{category or vertical slug}/…`.
 */
export function pageVertical(pathname, registry, searchVertical = '') {
  if (pathname === '/') return DEFAULT_VERTICAL;
  if (pathname === '/entertainment') return 'entertainment';
  if (pathname === '/search') return searchVertical || DEFAULT_VERTICAL;
  const [city, slug] = pathname.split('/').filter(Boolean);
  if (!slug || !registry.cities.some((row) => row.slug === city)) return null;
  const category = registry.categories.find((row) => row.slug === slug);
  if (category) return category.vertical ?? DEFAULT_VERTICAL;
  return (registry.verticals ?? []).find((row) => row.slug === slug)?.code ?? null;
}

/**
 * A tab on /search keeps where and the first date, and drops everything that
 * belongs to the other vertical (slot, guests, activity, time, price units).
 */
export function searchTabHref(code, { city, area, date }) {
  const params = new URLSearchParams();
  if (code !== DEFAULT_VERTICAL) params.set('vertical', code);
  for (const [key, value] of [
    ['city', city],
    ['area', area],
    ['date', date],
  ])
    if (value) params.set(key, value);
  const query = params.toString();
  return query ? `/search?${query}` : '/search';
}

/** Tabs for the public verticals, in registry order. Empty until two are public. */
export function verticalTabs(registry, active, hrefFor = (code) => VERTICAL_UI[code]?.path ?? '/') {
  const verticals = registry.verticals ?? [];
  if (verticals.length < 2) return [];
  return [...verticals]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      code: row.code,
      name: row.name,
      href: hrefFor(row.code),
      active: row.code === active,
    }));
}

/** The facts line under a card's title, by vertical. Farmhouse is exactly today's line. */
export function listingFacts(card) {
  if (card.vertical && card.vertical !== DEFAULT_VERTICAL) {
    const unit = unitName(card.activities?.[0]?.iconKey).toLowerCase();
    return [
      card.activities?.map((row) => row.name).join(' · '),
      card.resourceCount
        ? `${card.resourceCount} ${unit}${card.resourceCount === 1 ? '' : 's'}`
        : null,
      card.maxPlayers ? `Up to ${card.maxPlayers} players` : null,
      { true: 'Indoor', false: 'Outdoor', mixed: 'Indoor and outdoor' }[card.isIndoor] ?? null,
    ].filter(Boolean);
  }
  return [
    `Up to ${card.capacity} guests`,
    card.bedrooms ? `${card.bedrooms} BR` : null,
    card.highlight,
  ].filter(Boolean);
}

/** "17:30" → "5:30 PM". */
export function clock12(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** The price unit as cards print it: "/ night", "/ hr". */
export const unitLabel = (unit) => (unit === 'hour' ? 'hr' : unit);

/**
 * Review sub-score labels by vertical. The columns stay the same
 * (cleanliness, accuracy, value_for_money); a venue's "accuracy" is the court.
 */
const SUB_SCORE_LABELS = {
  farmhouse: {
    cleanliness: 'Cleanliness',
    accuracy: 'Matches the photos',
    valueForMoney: 'Value for money',
  },
  entertainment: {
    cleanliness: 'Cleanliness',
    accuracy: 'Court condition',
    valueForMoney: 'Value for money',
  },
};
export const subScoreLabels = (vertical = DEFAULT_VERTICAL) =>
  SUB_SCORE_LABELS[vertical] ?? SUB_SCORE_LABELS[DEFAULT_VERTICAL];
