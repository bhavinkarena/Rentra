import { z } from 'zod';

export const slotEnum = z.enum(['day', 'night', 'full_day']);
export const cancellationTierEnum = z.enum(['flexible', 'moderate', 'strict']);

const phoneIN = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number');

export const bookingRequestSchema = z.object({
  rentableId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
  slot: slotEnum,
  guests: z.coerce.number().int().min(1, 'At least 1 guest').max(500),
  balanceMode: z.enum(['online_before', 'cash_on_arrival']),
  contactPhone: phoneIN,
  note: z.string().trim().max(500).optional(),
});

export const cancelBookingSchema = z.object({
  bookingId: z.string().uuid(),
  reason: z.string().trim().min(4, 'Tell us why so we can improve').max(500),
});

/**
 * Razorpay webhook payload. This is UNTRUSTED input arriving at the money
 * flow — validate the shape here and verify the signature separately before
 * this ever runs. Runtime validation is the actual protection; a type
 * annotation would not have helped.
 */
export const razorpayWebhookSchema = z.object({
  event: z.string().min(1),
  payload: z.object({
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          order_id: z.string().nullable(),
          amount: z.number().int().nonnegative(),
          currency: z.string(),
          status: z.string(),
        }),
      })
      .optional(),
  }),
});
