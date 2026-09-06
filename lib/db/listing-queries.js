import 'server-only';

import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from './index.js';
import {
  rentable, rentablePrice, rentableAmenity, amenity, documents,
  city, area, category, listingReview,
} from './schema/index.js';

/** Every listing this Client owns, for the partner listings index. */
export async function getClientListings(clientId) {
  return db
    .select({
      id: rentable.id,
      slug: rentable.slug,
      publicCode: rentable.publicCode,
      title: rentable.title,
      status: rentable.status,
      rejectionReason: rentable.rejectionReason,
      updatedAt: rentable.updatedAt,
      areaName: area.name,
      cityName: city.name,
    })
    .from(rentable)
    .leftJoin(area, eq(area.id, rentable.areaId))
    .leftJoin(city, eq(city.id, rentable.cityId))
    .where(eq(rentable.clientId, clientId))
    .orderBy(asc(rentable.createdAt));
}

/**
 * One listing plus everything the builder and the reviewer need.
 *
 * Scoped by clientId on purpose: passing a listing id that belongs to someone
 * else must return nothing rather than someone else's property. Pass
 * clientId=null only from the admin side.
 */
export async function getListingForEdit(id, clientId = null) {
  const filters = [eq(rentable.id, id)];
  if (clientId) filters.push(eq(rentable.clientId, clientId));

  const [row] = await db.select().from(rentable).where(and(...filters)).limit(1);
  if (!row) return null;

  const [prices, tags, docs, reviews] = await Promise.all([
    db.select({
      slot: rentablePrice.slot,
      weekday: rentablePrice.weekday,
      weekend: rentablePrice.weekend,
    }).from(rentablePrice).where(eq(rentablePrice.rentableId, id)),

    db.select({
      amenityId: rentableAmenity.amenityId,
      value: rentableAmenity.value,
      slug: amenity.slug,
      groupSlug: amenity.groupSlug,
      labelEn: amenity.labelEn,
      valueType: amenity.valueType,
    })
      .from(rentableAmenity)
      .innerJoin(amenity, eq(amenity.id, rentableAmenity.amenityId))
      .where(eq(rentableAmenity.rentableId, id)),

    db.select({
      id: documents.id,
      docType: documents.docType,
      side: documents.side,
      status: documents.status,
      reviewNote: documents.reviewNote,
      nameOnDocument: documents.nameOnDocument,
      issuedAt: documents.issuedAt,
      bytes: documents.bytes,
      mimeType: documents.mimeType,
      uploadedAt: documents.uploadedAt,
    }).from(documents).where(and(
      eq(documents.ownerType, 'rentable'),
      eq(documents.ownerId, id),
      isNull(documents.deletedAt),
    )),

    db.select().from(listingReview)
      .where(eq(listingReview.rentableId, id))
      .orderBy(asc(listingReview.passNumber)),
  ]);

  return {
    listing: row,
    prices,
    amenities: tags,
    photos: Array.isArray(row.photos) ? row.photos : [],
    documents: docs,
    reviews,
  };
}

/** The fixed taxonomy, grouped, in display order. */
export async function getAmenityCatalogue() {
  const rows = await db
    .select({
      id: amenity.id,
      slug: amenity.slug,
      groupSlug: amenity.groupSlug,
      labelEn: amenity.labelEn,
      labelHi: amenity.labelHi,
      labelGu: amenity.labelGu,
      valueType: amenity.valueType,
      isFilterable: amenity.isFilterable,
    })
    .from(amenity)
    .where(eq(amenity.isActive, true))
    .orderBy(asc(amenity.sortOrder));

  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.groupSlug)) groups.set(row.groupSlug, []);
    groups.get(row.groupSlug).push(row);
  }
  return [...groups.entries()].map(([slug, items]) => ({ slug, items }));
}

export async function getCategories() {
  return db
    .select({ id: category.id, slug: category.slug, name: category.name })
    .from(category)
    .where(eq(category.isActive, true))
    .orderBy(asc(category.name));
}

export async function getCitiesWithAreas() {
  const rows = await db
    .select({
      cityId: city.id,
      citySlug: city.slug,
      cityName: city.name,
      areaId: area.id,
      areaName: area.name,
    })
    .from(city)
    .innerJoin(area, eq(area.cityId, city.id))
    .where(eq(city.isActive, true))
    .orderBy(asc(city.name), asc(area.name));

  const map = new Map();
  for (const r of rows) {
    if (!map.has(r.cityId)) {
      map.set(r.cityId, { id: r.cityId, slug: r.citySlug, name: r.cityName, areas: [] });
    }
    map.get(r.cityId).areas.push({ id: r.areaId, name: r.areaName });
  }
  return [...map.values()];
}
