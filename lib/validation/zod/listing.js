import { z } from 'zod';
import { slotEnum, cancellationTierEnum } from './booking';

export const slotPriceSchema = z.object({
  slot: slotEnum,
  weekday: z.coerce.number().int().min(500).max(500000),
  weekend: z.coerce.number().int().min(500).max(500000),
});

export const listingDraftSchema = z.object({
  title: z.string().trim().min(8, 'At least 8 characters').max(90),
  description: z.string().trim().min(40, 'Tell guests a bit more').max(4000),

  // The three columns that keep goods rental a feature and not a rewrite.
  form: z.enum(['fixed', 'movable']).default('fixed'),
  fulfilment: z
    .enum(['visit_site', 'pickup_from_owner', 'delivered'])
    .default('visit_site'),
  rentalUnit: z.enum(['slot', 'night', 'day', 'week', 'month']).default('slot'),

  categoryId: z.string().min(1),
  cityId: z.string().min(1),
  areaId: z.string().min(1),
  totalUnits: z.coerce.number().int().min(1).default(1),

  capacity: z.coerce.number().int().min(1).max(1000),
  bedrooms: z.coerce.number().int().min(0).max(50).default(0),
  amenities: z.array(z.string()).max(40).default([]),
  houseRules: z.array(z.string()).max(30).default([]),

  prices: z.array(slotPriceSchema).min(1, 'Set a price for at least one slot'),
  deposit: z.coerce.number().int().min(0).max(200000).default(0),
  cancellationTier: cancellationTierEnum.default('moderate'),

  photos: z.array(z.string().url()).min(6, 'At least 6 photos').max(15),
});

/** Public search params. Kept loose on purpose — a bad URL should not 500. */
export const searchParamsSchema = z.object({
  city: z.string().trim().max(60).optional(),
  area: z.string().trim().max(60).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  slot: slotEnum.optional(),
  guests: z.coerce.number().int().min(1).max(500).optional(),
  min: z.coerce.number().int().min(0).optional(),
  max: z.coerce.number().int().min(0).optional(),
  amenities: z.union([z.string(), z.array(z.string())]).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating', 'recent']).optional(),
});
