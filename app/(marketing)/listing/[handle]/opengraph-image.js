import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import sharp from 'sharp';
import { discoveryApi } from '@/lib/api/endpoints';
import { absolutePublicUrl } from '@/lib/domain/listing-content';
import { cheapestSlot, formatINR, SLOTS } from '@/lib/domain/pricing';
import { listingFacts } from '@/lib/domain/vertical-ui';

/**
 * The real storefront. A forwarded WhatsApp card is seen by more people than
 * the homepage, and the implementation plan is blunt about what that card has
 * to say: "₹8,000 · Sat 14 Feb available" converts, "Rentra — book verified
 * farmhouses" does not. So this carries the price and the next open date,
 * laid over the listing's own cover photo (the Airbnb / Booking.com share
 * pattern) — a photo is what makes someone stop scrolling a chat.
 *
 * Served as JPEG, not ImageResponse's PNG: a photo card is ~1MB as PNG and
 * ~100KB as JPEG, and WhatsApp drops the preview for heavy images.
 */
export const alt = 'Rentra listing';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/jpeg';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/** The cover photo cropped to the card, as a JPEG data URI; null keeps the text-only card. */
async function coverPhoto(photo) {
  const source = absolutePublicUrl(siteUrl, photo?.url);
  if (!source) return null;
  try {
    // Ask Cloudinary for a card-sized crop: ~100KB to fetch instead of the 2560px original.
    const url = source.replace(
      '/image/upload/',
      '/image/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_80/',
    );
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) return null;
    const jpeg = await sharp(Buffer.from(await response.arrayBuffer()))
      .resize(size.width, size.height, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
  } catch {
    return null;
  }
}

/** Re-encode the rendered PNG as JPEG, keeping ImageResponse's cache headers. */
async function asJpeg(image) {
  const png = Buffer.from(await image.arrayBuffer());
  const headers = new Headers(image.headers);
  headers.set('content-type', 'image/jpeg');
  headers.delete('content-length');
  return new Response(await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer(), {
    headers,
  });
}

export default async function ListingOgImage({ params }) {
  const { handle } = await params;
  const code = handle.slice(handle.lastIndexOf('-') + 1);
  const listing = await discoveryApi.listing(code).catch(() => null);

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
    return asJpeg(
      new ImageResponse(
        <div style={{ ...SHELL, justifyContent: 'center', alignItems: 'center' }}>
          <img src={lockupSrc} width={337} height={92} alt="" />
        </div>,
        { ...size, fonts },
      ),
    );
  }

  // Same helper the page uses, so the card cannot quote a different price.
  // Venues (hour listings) quote the from-price per hour and the next open day.
  const venue = listing.rentalUnit === 'hour';
  const slot = cheapestSlot(listing.prices) ?? 'night';
  const [nextDates, photo] = await Promise.all([
    discoveryApi.nextDates(code).catch(() => null),
    coverPhoto(listing.photos?.[0]),
  ]);
  const nextDate = venue ? nextDates?.hourly?.[0] : nextDates?.[slot]?.[0];
  const rent = venue ? listing.price : (listing.prices?.[slot]?.weekday ?? listing.price);
  const unit = venue ? 'hr' : (SLOTS[slot]?.label ?? '').toLowerCase();
  const facts = venue
    ? listingFacts(listing).slice(0, 2).join(' · ')
    : `up to ${listing.capacity} guests${listing.bedrooms ? ` · ${listing.bedrooms} BR` : ''}`;

  const dateLabel = nextDate
    ? new Date(`${nextDate}T12:00:00`).toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    : null;
  const price = rent != null ? formatINR(rent) : 'See prices';
  const availability = dateLabel
    ? `${dateLabel} available`
    : venue
      ? 'Check times'
      : 'Check visit dates';

  if (photo) {
    return asJpeg(
      new ImageResponse(
        <div style={{ ...SHELL, position: 'relative', backgroundColor: '#1F2924' }}>
          <img
            src={photo}
            width={size.width}
            height={size.height}
            alt=""
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          {/* Dark fade so white text stays readable over any photo. */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 420,
              display: 'flex',
              backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.82))',
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '40px 48px 0',
            }}
          >
            <div
              style={{
                display: 'flex',
                backgroundColor: '#FFFFFF',
                borderRadius: 999,
                padding: '12px 26px',
              }}
            >
              <img src={lockupSrc} width={176} height={48} alt="" />
            </div>
            {listing.physicallyVerified ? (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#064E3B',
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
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '0 56px 48px',
              color: '#FFFFFF',
            }}
          >
            <div
              style={{
                display: 'flex',
                fontSize: 56,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                maxWidth: 1080,
              }}
            >
              {listing.title}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 12,
                fontSize: 28,
                color: 'rgba(255,255,255,0.88)',
              }}
            >
              {listing.areaName}, {listing.cityName} · {facts}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: '-0.03em' }}>
                  {price}
                </span>
                <span style={{ fontSize: 28, color: 'rgba(255,255,255,0.88)' }}>
                  {rent != null ? `/ ${unit}` : ''}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#FFFFFF',
                  color: '#064E3B',
                  fontSize: 26,
                  fontWeight: 700,
                  padding: '10px 20px',
                  borderRadius: 999,
                }}
              >
                {availability}
              </div>
            </div>
          </div>
        </div>,
        { ...size, fonts },
      ),
    );
  }

  return asJpeg(
    new ImageResponse(
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
              color: '#1F2924',
              maxWidth: 1000,
            }}
          >
            {listing.title}
          </div>

          <div style={{ display: 'flex', marginTop: 18, fontSize: 32, color: '#59655D' }}>
            {listing.areaName}, {listing.cityName} · {facts}
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
              <span
                style={{
                  fontSize: 68,
                  fontWeight: 700,
                  color: '#1F2924',
                  letterSpacing: '-0.03em',
                }}
              >
                {price}
              </span>
              <span style={{ fontSize: 30, color: '#59655D' }}>
                {rent != null ? `/ ${unit}` : ''}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 10,
                fontSize: 27,
                color: '#064E3B',
                fontWeight: 700,
              }}
            >
              {availability}
            </div>
          </div>

          {listing.physicallyVerified ? (
            <div
              style={{
                display: 'flex',
                backgroundColor: '#064E3B',
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

        <div style={{ display: 'flex', height: 14, backgroundColor: '#064E3B' }} />
      </div>,
      { ...size, fonts },
    ),
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
