import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getListingByCode, getNextAvailableDates } from '@/lib/db/queries';
import { cheapestSlot, formatINR, SLOTS } from '@/lib/domain/pricing';

/**
 * The real storefront. A forwarded WhatsApp card is seen by more people than
 * the homepage, and the implementation plan is blunt about what that card has
 * to say: "₹8,000 · Sat 14 Feb available" converts, "Rentra — book verified
 * farmhouses" does not. So this carries the price and the next open date.
 */
export const alt = 'Rentra farmhouse listing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function ListingOgImage({ params }) {
  const { handle } = await params;
  const code = handle.slice(handle.lastIndexOf('-') + 1);
  const listing = await getListingByCode(code);

  // Paths are literals so Turbopack can scope the trace; see the root
  // opengraph-image.js for what happens when they are not.
  const [lockup, medium, bold] = await Promise.all([
    readFile(join(process.cwd(), 'public/brand/rentra-lockup.svg'), 'utf8'),
    readFile(join(process.cwd(), 'assets/fonts/PlusJakartaSans-500.ttf')),
    readFile(join(process.cwd(), 'assets/fonts/PlusJakartaSans-700.ttf')),
  ]);
  const lockupSrc = `data:image/svg+xml;base64,${Buffer.from(lockup).toString('base64')}`;

  const fonts = [
    { name: 'Plus Jakarta Sans', data: medium, weight: 500, style: 'normal' },
    { name: 'Plus Jakarta Sans', data: bold, weight: 700, style: 'normal' },
  ];

  // A listing that has gone away still gets a valid card rather than a 500 —
  // old WhatsApp forwards keep resolving this URL for months.
  if (!listing) {
    return new ImageResponse(
      (
        <div style={{ ...SHELL, justifyContent: 'center', alignItems: 'center' }}>
          <img src={lockupSrc} width={337} height={92} alt="" />
        </div>
      ),
      { ...size, fonts },
    );
  }

  // Same helper the page uses, so the card cannot quote a different price.
  const slot = cheapestSlot(listing.prices) ?? 'night';
  const nextDates = await getNextAvailableDates({ rentableId: listing.id, limit: 1 });
  const nextDate = nextDates?.[slot]?.[0];
  const rent = listing.prices?.[slot]?.weekday ?? listing.price;

  const dateLabel = nextDate
    ? new Date(`${nextDate}T12:00:00`).toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short',
    })
    : null;

  return new ImageResponse(
    (
      <div style={SHELL}>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '64px 72px 0' }}>
          <img src={lockupSrc} width={247} height={67} alt="" />

          <div
            style={{
              display: 'flex',
              marginTop: 44,
              fontSize: 62,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
              color: '#171A18',
              maxWidth: 1000,
            }}
          >
            {listing.title}
          </div>

          <div style={{ display: 'flex', marginTop: 18, fontSize: 32, color: '#5A635D' }}>
            {listing.areaName}, {listing.cityName} · up to {listing.capacity} guests
            {listing.bedrooms ? ` · ${listing.bedrooms} BR` : ''}
          </div>
        </div>

        {/* The line that does the work: a price and a date somebody can act on. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            padding: '0 72px 56px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ fontSize: 68, fontWeight: 700, color: '#171A18', letterSpacing: '-0.03em' }}>
                {formatINR(rent)}
              </span>
              <span style={{ fontSize: 30, color: '#5A635D' }}>
                / {(SLOTS[slot]?.label ?? '').toLowerCase()}
              </span>
            </div>
            <div style={{ display: 'flex', marginTop: 10, fontSize: 27, color: '#2E6449', fontWeight: 700 }}>
              {dateLabel ? `${dateLabel} available` : 'Ask for dates'}
              {/* Margin, not spaces — satori collapses leading whitespace. */}
              <span style={{ color: '#5A635D', fontWeight: 500, marginLeft: 12 }}>
                · Brokerage ₹0
              </span>
            </div>
          </div>

          {listing.verifiedAt ? (
            <div
              style={{
                display: 'flex',
                backgroundColor: '#2E6449',
                color: '#FFFFFF',
                fontSize: 24,
                fontWeight: 700,
                padding: '14px 24px',
                borderRadius: 999,
              }}
            >
              Physically Verified
            </div>
          ) : null}
        </div>

        <div style={{ display: 'flex', height: 14, backgroundColor: '#2E6449' }} />
      </div>
    ),
    { ...size, fonts },
  );
}

const SHELL = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  backgroundColor: '#FFFFFF',
  fontFamily: 'Plus Jakarta Sans',
};
