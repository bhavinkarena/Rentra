import { getListingIdByCode } from '@/lib/db/queries';
import { sql } from '@/lib/db';
import { getBookingAvailability } from '@/lib/booking/quotes';
import { availabilityQuerySchema } from '@/lib/validation/zod/booking';
import { availabilityDateRange } from '@/lib/domain/booking-availability';
import { BOOKING_POLICY } from '@/lib/domain/booking-policy';

/**
 * WHY THIS ROUTE EXISTS, given /api/* is otherwise reserved for external
 * callers like the Razorpay webhook.
 *
 * The listing page is ISR-cached, and the implementation plan is explicit
 * that live availability must NOT be baked into that cache: "the static shell
 * carries price and the next three available dates. Live availability for the
 * date picker is fetched client-side, so the cached page never shows a stale
 * calendar." A calendar rendered from an hour-old cache invites a guest to
 * pick a Saturday that sold twenty minutes ago.
 *
 * So the page server-renders the price and the next bookable dates (which is
 * what crawlers and the WhatsApp card need), and the picker reads this route
 * on mount. It is a plain fetch, deliberately NOT RTK Query: that store is
 * scoped to authenticated, noindex surfaces, and this data is public.
 */
export async function GET(request, { params }) {
  // Next 16: route params arrive as a Promise.
  const { code } = await params;

  const parsed = availabilityQuerySchema.safeParse({
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    days: request.nextUrl.searchParams.get('days') ?? undefined,
    guests: request.nextUrl.searchParams.get('guests') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: 'Bad date range' }, { status: 400 });
  }

  let range;
  try {
    range = availabilityDateRange(parsed.data);
  } catch {
    return Response.json({ error: 'Bad date range' }, { status: 400 });
  }

  const listingId = await getListingIdByCode(code);
  // Same answer for "no such listing" and "not live": an unpublished listing
  // should not be discoverable by probing this endpoint.
  if (!listingId) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const result = await getBookingAvailability(sql, { rentableId: listingId, ...range, guests: parsed.data.guests });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (['INVENTORY_NOT_READY','INVENTORY_REMEDIATION_REQUIRED','SCHEDULE_UNAVAILABLE','LISTING_UNAVAILABLE','UNSUPPORTED_INVENTORY'].includes(error.code)) {
      return Response.json({ ...range, timeZone: BOOKING_POLICY.timeZone, advisory: true, days: {}, message: 'The owner needs to confirm the booking calendar.' }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return Response.json({ error: 'Availability is temporarily unavailable.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
