import { getListingIdByCode, getAvailability } from '@/lib/db/queries';
import { availabilityQuerySchema } from '@/lib/validation/zod/booking';
import { availabilityDateRange, legacyAvailabilityDays } from '@/lib/domain/booking-availability';
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

  const rows = await getAvailability({ rentableId: listingId, ...range });

  /**
   * Collapsed to one entry per date so the picker does no grouping, and so a
   * 90-day payload stays a few KB on a mid-range Android connection.
   * This legacy day/night calendar is advisory. Exact intervals, adjacent
   * conflicts and holds will be checked by the new inventory/quote service.
   */
  const days = legacyAvailabilityDays(rows);

  return Response.json(
    { ...range, timeZone: BOOKING_POLICY.timeZone, advisory: true, days },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
