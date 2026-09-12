import { and, eq, sql as raw, desc, asc, gte, isNotNull, ne } from 'drizzle-orm';
import { db } from './index.js';
import {
  rentable, rentablePrice, area, city, category, availability, review, users,
} from './schema/index.js';
import { listingPath } from '@/lib/domain/listing-url';
import { addLocalDays, propertyToday } from '@/lib/domain/booking-dates';

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
    href: listingPath(row.slug, row.publicCode),
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

/**
 * Public listing detail. Keep exact coordinates, street addresses and owner
 * phone numbers out of both the SELECT and the returned object. Locality names
 * are sufficient here; private arrival details require booking authorization.
 */
export async function getListingByCode(publicCode) {
  const [row] = await db
    .select({
      ...cardColumns,
      description: rentable.description,
      amenities: rentable.amenities,
      houseRules: rentable.houseRules,
      depositAmount: rentable.depositAmount,
      cancellationTier: rentable.cancellationTier,
      clientName: users.name,
      clientResponseRate: users.responseRate,
      clientRespondsWithinMins: users.respondsWithinMins,
      clientSince: users.createdAt,
      categorySlug: category.slug,
      categoryName: category.name,
      // The detail page needs these; a card does not, which is why they are
      // here rather than in cardColumns.
      areaId: rentable.areaId,
      cityId: rentable.cityId,
      farmSize: rentable.farmSize,
      farmSizeUnit: rentable.farmSizeUnit,
      poolSize: rentable.poolSize,
      checkInFrom: rentable.checkInFrom,
      checkOutBy: rentable.checkOutBy,
      totalUnits: rentable.totalUnits,
      updatedAt: rentable.updatedAt,
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

  /**
   * `publishedAt IS NOT NULL` is not optional. Reviews are two-way and are
   * released only once both sides submit or 14 days pass — rendering an
   * unpublished one leaks a guest's words before the owner has had their say.
   */
  const published = and(
    eq(review.rentableId, row.id),
    eq(review.authorRole, 'customer'),
    isNotNull(review.publishedAt),
  );

  const [reviews, subScoreRows] = await Promise.all([
    db.select({
      id: review.id, rating: review.rating, body: review.body,
      cleanliness: review.cleanliness,
      accuracy: review.accuracy,
      valueForMoney: review.valueForMoney,
      publishedAt: review.publishedAt, authorName: users.name,
    })
      .from(review)
      .innerJoin(users, eq(users.id, review.authorId))
      .where(published)
      .orderBy(desc(review.publishedAt))
      .limit(10),

    // Averaged in SQL, over every published review — not over the ten above,
    // which would quietly turn a sub-score into "average of the last ten".
    db.select({
      n: raw`count(*)::int`.as('n'),
      cleanliness: raw`round(avg(${review.cleanliness})::numeric, 1)::float8`.as('cleanliness'),
      accuracy: raw`round(avg(${review.accuracy})::numeric, 1)::float8`.as('accuracy'),
      valueForMoney: raw`round(avg(${review.valueForMoney})::numeric, 1)::float8`.as('value_for_money'),
    }).from(review).where(published),
  ]);

  const agg = subScoreRows[0] ?? {};

  return {
    ...toCard(row),
    description: row.description,
    amenities: row.amenities ?? [],
    houseRules: row.houseRules ?? [],
    depositAmount: row.depositAmount,
    cancellationTier: row.cancellationTier,
    areaSlug: row.areaSlug,
    citySlug: row.citySlug,
    areaName: row.areaName,
    cityName: row.cityName,
    areaId: row.areaId,
    cityId: row.cityId,
    categorySlug: row.categorySlug,
    categoryName: row.categoryName,
    farmSize: row.farmSize,
    farmSizeUnit: row.farmSizeUnit,
    poolSize: row.poolSize,
    checkInFrom: row.checkInFrom,
    checkOutBy: row.checkOutBy,
    verifiedAt: row.verifiedAt,
    updatedAt: row.updatedAt,
    client: {
      /**
       * First name only, and no phone column is selected at all.
       * Per the information release ladder, a browsing visitor gets the
       * owner's first name, badge and response time — the phone number and
       * exact address unlock on confirmation. The safest way to honour that
       * is for the digits never to leave Postgres.
       */
      firstName: (row.clientName ?? '').trim().split(/\s+/)[0] || 'Owner',
      responseRate: row.clientResponseRate,
      respondsWithinMins: row.clientRespondsWithinMins,
      since: row.clientSince,
    },
    subScores: agg.n
      ? {
        cleanliness: agg.cleanliness,
        accuracy: agg.accuracy,
        valueForMoney: agg.valueForMoney,
      }
      : null,
    // Both rates per slot — a Saturday and a Tuesday are different prices,
    // and the slot selector has to be able to show the right one.
    prices: Object.fromEntries(
      prices.map((p) => [p.slot, { weekday: p.weekday, weekend: p.weekend }]),
    ),
    reviews,
  };
}

/**
 * Resolve a public code to an id, for callers that need nothing else —
 * the availability endpoint, which must not pay for a full listing join on
 * every calendar paint.
 */
export async function getListingIdByCode(publicCode) {
  const [row] = await db
    .select({ id: rentable.id })
    .from(rentable)
    .where(and(eq(rentable.publicCode, publicCode), eq(rentable.status, 'live')))
    .limit(1);
  return row?.id ?? null;
}

/** Open slots for a date range. Drives the SlotSelector and the calendar. */
export async function getAvailability({ rentableId, from, to }) {
  return db
    .select({
      day: availability.day,
      slot: availability.slot,
      unitsAvailable: availability.unitsAvailable,
      priceOverride: availability.priceOverride,
      blockedByClient: availability.blockedByClient,
    })
    .from(availability)
    .where(and(
      eq(availability.rentableId, rentableId),
      raw`${availability.day} between ${from} and ${to}`,
    ))
    .orderBy(asc(availability.day), asc(availability.slot));
}

/**
 * The next few bookable dates, per slot.
 *
 * This is what the ISR-cached listing page renders server-side, so the page
 * (and the WhatsApp preview card built from it) always carries a real date
 * without shipping the whole calendar. The date picker then loads live
 * availability client-side — the cached HTML must never be the source of
 * truth for what is still free.
 */
export async function getNextAvailableDates({ rentableId, days = 60, limit = 3 }) {
  const today = propertyToday();
  const until = addLocalDays(today, days);
  const rows = await db
    .select({
      day: availability.day,
      slot: availability.slot,
      priceOverride: availability.priceOverride,
    })
    .from(availability)
    .where(and(
      eq(availability.rentableId, rentableId),
      gte(availability.day, today),
      raw`${availability.day} < ${until}`,
      raw`${availability.unitsAvailable} > 0`,
      eq(availability.blockedByClient, false),
    ))
    .orderBy(asc(availability.day), asc(availability.slot));

  const bySlot = { day: [], night: [] };
  for (const r of rows) {
    if (bySlot[r.slot] && bySlot[r.slot].length < limit) bySlot[r.slot].push(r.day);
  }
  // A full day needs BOTH halves of the same date free.
  const nights = new Set(rows.filter((r) => r.slot === 'night').map((r) => r.day));
  bySlot.full_day = rows
    .filter((r) => r.slot === 'day' && nights.has(r.day))
    .slice(0, limit)
    .map((r) => r.day);

  return bySlot;
}

/**
 * "Similar farmhouses nearby" — the same area first, then the same city.
 *
 * Deliberately not a PostGIS radius query: the listing being viewed is the
 * centre, and a guest comparing farmhouses thinks in areas ("another one in
 * Kamrej"), not in kilometres.
 */
export async function getSimilarListings({ rentableId, areaId, cityId, limit = 4 }) {
  const rows = await db
    .select(cardColumns)
    .from(rentable)
    .innerJoin(area, eq(area.id, rentable.areaId))
    .innerJoin(city, eq(city.id, rentable.cityId))
    .leftJoin(rentablePrice, nightPrice)
    .where(and(
      eq(rentable.status, 'live'),
      ne(rentable.id, rentableId),
      eq(rentable.cityId, cityId),
    ))
    .orderBy(
      // Same area first, then verified, then best rated.
      raw`(${rentable.areaId} = ${areaId}) desc`,
      raw`${rentable.verifiedAt} desc nulls last`,
      raw`${rentable.ratingAvg} desc nulls last`,
    )
    .limit(limit);

  return rows.map(toCard);
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
