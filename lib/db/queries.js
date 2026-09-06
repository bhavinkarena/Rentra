import { and, eq, sql as raw, desc, asc, inArray } from 'drizzle-orm';
import { db } from './index.js';
import {
  rentable, rentablePrice, area, city, category, availability, review, users,
} from './schema/index.js';

/**
 * Data access for public, indexable pages.
 *
 * These are called from Server Components so the markup Google receives
 * already contains the listings. They deliberately do NOT go through RTK
 * Query — a client-side fetch here would mean a spinner and an empty page
 * for crawlers.
 */

/** Shape the ListingCard component expects. */
function toCard(row) {
  return {
    id: row.id,
    slug: row.slug,
    publicCode: row.publicCode,
    /** The canonical public path. Built in one place so it never drifts. */
    href: `/listing/${row.slug}-${row.publicCode}`,
    area: `${row.areaName}, ${row.cityName}`,
    title: row.title,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    highlight: row.highlight,
    // Headline is the WEEKDAY rate, shown as a "from" price. Leading with the
    // weekend peak makes every listing look expensive and is the single
    // easiest way to lose a price-sensitive first-time visitor.
    price: row.nightWeekday ?? row.nightWeekend ?? 0,
    priceWeekend: row.nightWeekend ?? null,
    isFromPrice: true,
    // Only ever set when a discount is genuine. A permanent fake
    // strike-through makes us look like a coupon site.
    strikePrice: null,
    unit: 'night',
    rating: row.ratingAvg ?? 0,
    reviewCount: row.reviewCount ?? 0,
    // Rank: verified > new > none. Never more than one badge on a card.
    badge: row.verifiedAt ? 'verified' : row.reviewCount === 0 ? 'new' : null,
    photos: Array.isArray(row.photos) ? row.photos : [],
    photo: Array.isArray(row.photos) && row.photos[0] ? row.photos[0] : null,
    photoCount: Array.isArray(row.photos) ? row.photos.length : 0,
  };
}

const cardColumns = {
  id: rentable.id,
  slug: rentable.slug,
  publicCode: rentable.publicCode,
  title: rentable.title,
  capacity: rentable.capacity,
  bedrooms: rentable.bedrooms,
  highlight: rentable.highlight,
  ratingAvg: rentable.ratingAvg,
  reviewCount: rentable.reviewCount,
  verifiedAt: rentable.verifiedAt,
  photos: rentable.photos,
  areaName: area.name,
  areaSlug: area.slug,
  cityName: city.name,
  citySlug: city.slug,
  nightWeekday: rentablePrice.weekday,
  nightWeekend: rentablePrice.weekend,
};

const nightPrice = and(
  eq(rentablePrice.rentableId, rentable.id),
  eq(rentablePrice.slot, 'night'),
);

export async function getLiveListings({ citySlug, areaSlug, limit = 24 } = {}) {
  const filters = [eq(rentable.status, 'live')];
  if (citySlug) filters.push(eq(city.slug, citySlug));
  if (areaSlug) filters.push(eq(area.slug, areaSlug));

  const rows = await db
    .select(cardColumns)
    .from(rentable)
    .innerJoin(area, eq(area.id, rentable.areaId))
    .innerJoin(city, eq(city.id, rentable.cityId))
    .leftJoin(rentablePrice, nightPrice)
    .where(and(...filters))
    // NULLS LAST matters: Postgres sorts NULLs first in DESC, which would
    // put an unverified brand-new listing at the top of every results page.
    .orderBy(
      raw`${rentable.verifiedAt} desc nulls last`,
      raw`${rentable.ratingAvg} desc nulls last`,
    )
    .limit(limit);

  return rows.map(toCard);
}

/**
 * Proximity search. The reason PostGIS is in the stack — "within 25 km of me"
 * is a native index-backed query, not a bounding-box approximation.
 */
export async function getListingsNearby({ lng, lat, km = 25, limit = 24 }) {
  const rows = await db
    .select({
      ...cardColumns,
      distanceKm: raw`round((ST_Distance(
        ${rentable.location}::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
      ) / 1000)::numeric, 1)`.as('distance_km'),
    })
    .from(rentable)
    .innerJoin(area, eq(area.id, rentable.areaId))
    .innerJoin(city, eq(city.id, rentable.cityId))
    .leftJoin(rentablePrice, nightPrice)
    .where(and(
      eq(rentable.status, 'live'),
      raw`ST_DWithin(
        ${rentable.location}::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${km * 1000}
      )`,
    ))
    .orderBy(asc(raw`distance_km`))
    .limit(limit);

  return rows.map((r) => ({ ...toCard(r), distanceKm: Number(r.distanceKm) }));
}

/** Full listing detail. exactAddress is selected but must NOT be rendered
 *  until the booking is confirmed — see the information release ladder. */
export async function getListingByCode(publicCode) {
  const [row] = await db
    .select({
      ...cardColumns,
      description: rentable.description,
      amenities: rentable.amenities,
      houseRules: rentable.houseRules,
      depositAmount: rentable.depositAmount,
      cancellationTier: rentable.cancellationTier,
      location: rentable.location,
      clientName: users.name,
      clientResponseRate: users.responseRate,
      clientRespondsWithinMins: users.respondsWithinMins,
      categorySlug: category.slug,
    })
    .from(rentable)
    .innerJoin(area, eq(area.id, rentable.areaId))
    .innerJoin(city, eq(city.id, rentable.cityId))
    .innerJoin(users, eq(users.id, rentable.clientId))
    .innerJoin(category, eq(category.id, rentable.categoryId))
    .leftJoin(rentablePrice, nightPrice)
    // Resolved by CODE, not slug — retitling must never 404.
    .where(and(eq(rentable.publicCode, publicCode), eq(rentable.status, 'live')))
    .limit(1);

  if (!row) return null;

  const prices = await db
    .select({ slot: rentablePrice.slot, weekday: rentablePrice.weekday, weekend: rentablePrice.weekend })
    .from(rentablePrice)
    .where(eq(rentablePrice.rentableId, row.id));

  const reviews = await db
    .select({
      id: review.id, rating: review.rating, body: review.body,
      publishedAt: review.publishedAt, authorName: users.name,
    })
    .from(review)
    .innerJoin(users, eq(users.id, review.authorId))
    .where(and(eq(review.rentableId, row.id), eq(review.authorRole, 'customer')))
    .orderBy(desc(review.publishedAt))
    .limit(10);

  return {
    ...toCard(row),
    description: row.description,
    amenities: row.amenities ?? [],
    houseRules: row.houseRules ?? [],
    depositAmount: row.depositAmount,
    cancellationTier: row.cancellationTier,
    location: row.location,
    areaSlug: row.areaSlug,
    citySlug: row.citySlug,
    categorySlug: row.categorySlug,
    client: {
      name: row.clientName,
      responseRate: row.clientResponseRate,
      respondsWithinMins: row.clientRespondsWithinMins,
    },
    // Both rates per slot — a Saturday and a Tuesday are different prices,
    // and the slot selector has to be able to show the right one.
    prices: Object.fromEntries(
      prices.map((p) => [p.slot, { weekday: p.weekday, weekend: p.weekend }]),
    ),
    reviews,
  };
}

/** Open slots for a date range. Drives the SlotSelector and the calendar. */
export async function getAvailability({ rentableId, from, to }) {
  return db
    .select({
      day: availability.day,
      slot: availability.slot,
      unitsAvailable: availability.unitsAvailable,
      priceOverride: availability.priceOverride,
    })
    .from(availability)
    .where(and(
      eq(availability.rentableId, rentableId),
      raw`${availability.day} between ${from} and ${to}`,
    ))
    .orderBy(asc(availability.day), asc(availability.slot));
}

export async function getCities() {
  return db.select({ slug: city.slug, name: city.name })
    .from(city).where(eq(city.isActive, true)).orderBy(asc(city.name));
}

export async function getAreas(citySlug) {
  return db.select({ slug: area.slug, name: area.name })
    .from(area).innerJoin(city, eq(city.id, area.cityId))
    .where(eq(city.slug, citySlug)).orderBy(asc(area.name));
}

/** Sitemap source. Generated from the DB, never hand-maintained. */
export async function getSitemapEntries() {
  const listings = await db
    .select({
      slug: rentable.slug,
      publicCode: rentable.publicCode,
      updatedAt: rentable.updatedAt,
    })
    .from(rentable).where(eq(rentable.status, 'live'));

  const cities = await db
    .select({ slug: city.slug }).from(city).where(eq(city.isActive, true));

  const areas = await db
    .select({ citySlug: city.slug, areaSlug: area.slug })
    .from(area).innerJoin(city, eq(city.id, area.cityId));

  return { listings, cities, areas };
}

/**
 * Count of live listings for an area page — drives the thin-page guard.
 * Under 3 listings, the page is noindexed rather than published as a
 * doorway page.
 */
export async function countLiveInArea({ citySlug, areaSlug }) {
  const [row] = await db
    .select({ n: raw`count(*)::int`.as('n') })
    .from(rentable)
    .innerJoin(area, eq(area.id, rentable.areaId))
    .innerJoin(city, eq(city.id, rentable.cityId))
    .where(and(
      eq(rentable.status, 'live'),
      eq(city.slug, citySlug),
      eq(area.slug, areaSlug),
    ));
  return row?.n ?? 0;
}
