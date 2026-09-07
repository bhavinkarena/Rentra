import { z } from 'zod';
import { getListingIdByCode, getAvailability } from '@/lib/db/queries';

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
const querySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().int().min(1).max(120).default(90),
});

const isoDate = (d) => d.toISOString().slice(0, 10);

export async function GET(request, { params }) {
  // Next 16: route params arrive as a Promise.
  const { code } = await params;

  const parsed = querySchema.safeParse({
    from: request.nextUrl.searchParams.get('from') ?? undefined,
    days: request.nextUrl.searchParams.get('days') ?? undefined,
  });
  if (!parsed.success) {
    return Response.json({ error: 'Bad date range' }, { status: 400 });
  }

  const listingId = await getListingIdByCode(code);
  // Same answer for "no such listing" and "not live": an unpublished listing
  // should not be discoverable by probing this endpoint.
  if (!listingId) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  const today = isoDate(new Date());
  // Never serve the past, however the caller asks for it.
  const from = parsed.data.from && parsed.data.from > today ? parsed.data.from : today;
  const to = new Date(`${from}T00:00:00Z`);
  to.setUTCDate(to.getUTCDate() + parsed.data.days);

  const rows = await getAvailability({ rentableId: listingId, from, to: isoDate(to) });

  /**
   * Collapsed to one entry per date so the picker does no grouping, and so a
   * 90-day payload stays a few KB on a mid-range Android connection.
   * `full` is derived here rather than trusted from the client: a full day
   * consumes both halves, so both have to be free.
   */
  const days = {};
  for (const r of rows) {
    const open = r.unitsAvailable > 0;
    const entry = days[r.day] ?? (days[r.day] = { day: false, night: false, full: false });
    entry[r.slot] = open;
    if (r.priceOverride != null) {
      entry.priceOverride = { ...entry.priceOverride, [r.slot]: r.priceOverride };
    }
  }
  for (const entry of Object.values(days)) entry.full = entry.day && entry.night;

  return Response.json(
    { from, days },
    {
      headers: {
        // Short and shared: everyone looking at this listing in the next
        // minute can have the same answer, but never a stale afternoon.
        'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=120',
      },
    },
  );
}
