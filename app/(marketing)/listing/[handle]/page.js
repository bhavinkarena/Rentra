import { publicMetadata, serializeJsonLd } from '@/lib/seo/metadata';
import Link from 'next/link';
import { cache } from 'react';
import { connection } from 'next/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { ChevronRight, MapPin } from 'lucide-react';
import ListingCard from '@/components/rentra/ListingCard';
import Rating from '@/components/rentra/Rating';
import TrustBadge from '@/components/rentra/TrustBadge';
import SaveButton from '@/components/rentra/SaveButton';
import PhotoGallery from '@/components/rentra/listing/PhotoGallery';
import ShareButton from '@/components/rentra/listing/ShareButton';
import MeasuredView from '@/components/customer/MeasuredView';
import AvailabilityPicker from '@/components/rentra/listing/AvailabilityPicker';
import BookingPriceBox from '@/components/rentra/listing/BookingPriceBox';
import MobileBookingBar from '@/components/rentra/listing/MobileBookingBar';
import BookingQuoteProvider from '@/components/rentra/listing/BookingQuoteProvider';
import {
  Section,
  KeyFacts,
  VisitHours,
  AmenityGrid,
  HouseRules,
  AreaCircle,
  Reviews,
  OwnerCard,
  CancellationPolicy,
  MoneyNote,
} from '@/components/rentra/listing/ListingSections';
import { discoveryApi } from '@/lib/api/endpoints';
import { calculateBookingPrice, cheapestSlot, formatINR } from '@/lib/domain/pricing';
import { listingPath, listingUrl } from '@/lib/domain/listing-url';
import { absolutePublicUrl } from '@/lib/domain/listing-content';
import { savedListingHref, selectionFromSavedUrl } from '@/lib/domain/saved-places';

// Resolve current publication/slug at request time. Reading selection only on
// renamed URLs under ISR caused production static-to-dynamic 500 responses.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * /listing/[slug]-[code]. The CODE resolves the page, never the slug, so
 * retitling a listing can never 404 — it redirects to the new URL instead.
 *
 * That redirect is a 308, not the 301 the SEO plan names: `permanentRedirect`
 * is the App Router's permanent redirect and 308 is its status. Both are
 * permanent and search engines consolidate them identically; 308 additionally
 * forbids the method rewrite that 301 permits, which is irrelevant for a GET
 * page. If a literal 301 is ever required, it has to come from middleware.
 */
function parseHandle(handle) {
  const cut = handle.lastIndexOf('-');
  if (cut < 1) return null;
  const code = handle.slice(cut + 1);
  // publicCode is 8 chars of base36. Anything else is a malformed URL, and
  // is cheaper to reject here than to take to the database.
  if (!/^[0-9a-z]{6,10}$/.test(code)) return null;
  return { slug: handle.slice(0, cut), code };
}

/** The lowest and highest a guest could pay here, across slots and rates. */
function priceBand(prices) {
  const all = Object.values(prices ?? {})
    .flatMap((p) => [p.weekday, p.weekend])
    .filter(Boolean);
  return all.length ? { low: Math.min(...all), high: Math.max(...all) } : null;
}

function pickDefaults({ prices }) {
  // Lead with the cheapest slot this farm sells, so the price box, the title
  // tag and the WhatsApp card all quote the same figure.
  const slot = cheapestSlot(prices) ?? 'night';
  return { slot, date: '' };
}

const loadListing = cache(async (handle) => {
  await connection();
  const parsed = parseHandle(handle);
  if (!parsed) return null;
  const listing = await discoveryApi.listing(parsed.code).catch(() => null);
  if (!listing) return null;
  return { listing, requestedSlug: parsed.slug };
});

/**
 * Real data in the title and the description — a listing count, a price, an
 * area name. A templated title with no numbers in it ranks like a template.
 */
export async function generateMetadata({ params }) {
  const { handle } = await params;
  const found = await loadListing(handle);
  if (!found) return { title: 'Farmhouse not found', robots: { index: false, follow: false } };

  const { listing } = found;
  const band = priceBand(listing.prices);
  const canonical = listingPath(listing.slug, listing.publicCode);

  const title = band
    ? `${listing.title}, ${listing.areaName} — from ${formatINR(band.low)}`
    : `${listing.title}, ${listing.areaName}`;

  const facts = [
    `Up to ${listing.capacity} guests`,
    listing.bedrooms ? `${listing.bedrooms} bedrooms` : null,
    listing.poolSize ? `a private ${listing.poolSize} pool` : null,
    band ? `from ${formatINR(band.low)} per slot` : null,
  ]
    .filter(Boolean)
    .join(', ');

  const description =
    `${listing.title} in ${listing.areaName}, ${listing.cityName}. ${facts}. ` +
    'See published visit hours, amenities, house rules and cancellation terms.';
  const images = listing.photos.slice(0, 4).map((photo) => ({
    url: absolutePublicUrl(siteUrl, photo.url),
    alt: photo.alt,
  }));

  return publicMetadata({ title, description, path: canonical, images });
}

export default async function ListingPage({ params, searchParams }) {
  const { handle } = await params;
  const found = await loadListing(handle);
  if (!found) notFound();

  const { listing, requestedSlug } = found;

  // Slug drift: the code still resolves, so send the crawler and the guest to
  // the canonical URL rather than serving two URLs for one page.
  if (requestedSlug !== listing.slug) {
    const selection = selectionFromSavedUrl(await searchParams, listing.id);
    permanentRedirect(savedListingHref(listingPath(listing.slug, listing.publicCode), selection));
  }

  // First paint must not wait for the inventory transaction. The calendar
  // checks live availability after hydration; guests explicitly choose dates.
  const nextDates = { day: [], night: [], full_day: [] };
  const similar = await discoveryApi.similar(listing.id, {
    areaId: listing.areaId,
    cityId: listing.cityId,
    limit: 4,
  });
  const defaults = pickDefaults({ prices: listing.prices });
  const band = priceBand(listing.prices);
  const canonicalShareUrl = listingUrl(siteUrl, listing.slug, listing.publicCode);
  const headlineRent = listing.prices?.[defaults.slot]?.weekday ?? band?.low ?? 0;
  const headline = calculateBookingPrice({
    baseRent: headlineRent,
    deposit: listing.depositAmount,
  });

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: listing.cityName, href: `/${listing.citySlug}/${listing.categorySlug}` },
    {
      name: listing.areaName,
      href: `/${listing.citySlug}/${listing.categorySlug}/area/${listing.areaSlug}`,
    },
    { name: listing.title },
  ];

  return (
    <BookingQuoteProvider
      key={listing.id}
      rentableId={listing.id}
      defaultDate={defaults.date}
      defaultSlot={defaults.slot}
    >
      <MeasuredView event="listing_viewed" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeJsonLd(buildJsonLd({ listing, band, crumbs })),
        }}
      />

      <div className="mx-auto max-w-(--container-page) px-6 py-6">
        <Breadcrumbs crumbs={crumbs} />

        <div className="mt-4">
          <PhotoGallery photos={listing.photos} title={listing.title} />
        </div>
        {/* The mobile booking bar watches this: it appears once the photos
            have gone by, not before. */}
        <span id="gallery-end" aria-hidden="true" className="block" />

        <div className="mt-8 grid items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0">
            <header>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <h1 className="text-h1">{listing.title}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <p className="flex items-center gap-1 text-meta font-medium text-ink-700">
                      <MapPin className="size-4 text-brand-600" aria-hidden="true" />
                      {listing.areaName}, {listing.cityName}
                    </p>
                    <span className="text-ink-300" aria-hidden="true">
                      ·
                    </span>
                    <Rating value={listing.rating} count={listing.reviewCount} />
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <span id="listing-actions">
                    <SaveButton
                      rentableId={listing.id}
                      listingTitle={listing.title}
                      variant="inline"
                    />
                  </span>
                  <ShareButton
                    title={`${listing.title}, ${listing.areaName}`}
                    text={`${listing.title} in ${listing.areaName}${band ? ` — from ${formatINR(band.low)}` : ''}`}
                    url={canonicalShareUrl}
                  />
                </div>
              </div>

              {/* Never more than two. Verified outranks everything. */}
              <div className="mt-4 flex flex-wrap gap-2">
                {listing.physicallyVerified ? (
                  <TrustBadge variant="verified" />
                ) : (
                  <TrustBadge variant="owner" />
                )}
                {listing.highlight ? <TrustBadge variant="fast" label={listing.highlight} /> : null}
              </div>
            </header>

            <div className="mt-8">
              <KeyFacts listing={listing} />
            </div>

            {listing.description ? (
              <Section id="about" title="About this farmhouse" className="mt-10">
                <p className="max-w-prose text-body whitespace-pre-line [overflow-wrap:anywhere] text-ink-700">
                  {listing.description}
                </p>
              </Section>
            ) : null}

            <Section id="visit-hours" title="Visit hours" className="mt-10">
              <VisitHours schedules={listing.slotSchedules} />
            </Section>

            <div className="mt-10 border-t border-border pt-8">
              <AvailabilityPicker
                code={listing.publicCode}
                prices={listing.prices}
                nextDates={nextDates}
                defaultDate={defaults.date}
                defaultSlot={defaults.slot}
              />
            </div>

            <Section id="amenities" title="What this farm has" className="mt-10">
              <AmenityGrid amenities={listing.amenities} />
            </Section>

            <Section id="rules" title="House rules" className="mt-10">
              <HouseRules listing={listing} />
            </Section>

            <Section
              id="location"
              title="Where you will be"
              intro="This public page shows the area only. Confirmed customers can access arrival details for their booking."
              className="mt-10"
            >
              <AreaCircle listing={listing} />
            </Section>

            <Section id="reviews" title="Reviews" className="mt-10">
              <Reviews listing={listing} />
            </Section>

            <Section id="owner" title="Your host" className="mt-10">
              <div className="max-w-lg">
                <OwnerCard listing={listing} />
              </div>
            </Section>

            <Section
              id="cancellation"
              title="Cancellation"
              intro="Computed automatically, never negotiated in chat."
              className="mt-10"
            >
              <CancellationPolicy
                tier={listing.cancellationTier}
                rent={headline.rent}
                fee={headline.fee}
                deposit={listing.depositAmount}
              />
            </Section>
          </div>

          {/* The rail. Sticky from lg up, which is the breakpoint the design
              system says the detail page splits at. */}
          <aside className="lg:sticky lg:top-20">
            <BookingPriceBox
              rentableId={listing.id}
              listingTitle={listing.title}
              prices={listing.prices}
              deposit={listing.depositAmount}
              cancellationTier={listing.cancellationTier}
              defaultDate={defaults.date}
              defaultSlot={defaults.slot}
            />
            <div className="mt-5 hidden lg:block">
              <MoneyNote />
            </div>
          </aside>
        </div>

        <div className="mt-12 lg:hidden">
          <MoneyNote />
        </div>

        {similar.length ? (
          <section aria-labelledby="similar-heading" className="mt-14 border-t border-border pt-8">
            <h2 id="similar-heading" className="text-h2">
              Similar farmhouses near {listing.areaName}
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((item) => (
                <ListingCard key={item.id} listing={item} />
              ))}
            </div>
          </section>
        ) : null}

        {/* Padding so the sticky bar never covers the last of the content. */}
        <div className="h-20 lg:hidden" aria-hidden="true" />
      </div>

      <MobileBookingBar
        prices={listing.prices}
        deposit={listing.depositAmount}
        defaultDate={defaults.date}
        defaultSlot={defaults.slot}
      />
    </BookingQuoteProvider>
  );
}

function Breadcrumbs({ crumbs }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1 text-meta text-ink-500">
        {crumbs.map((c, i) => (
          <li key={c.name} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="size-3.5 text-ink-300" aria-hidden="true" /> : null}
            {c.href ? (
              <Link href={c.href} className="rounded-sm hover:text-brand-700 hover:underline">
                {c.name}
              </Link>
            ) : (
              <span aria-current="page" className="truncate font-medium text-ink-700">
                {c.name}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * LodgingBusiness + AggregateOffer + BreadcrumbList.
 *
 * Two deliberate omissions:
 *  - No `geo` and no street address. Publishing the exact coordinates in
 *    JSON-LD would hand out the address the page itself withholds until a
 *    booking is confirmed.
 *  - No `aggregateRating` until real reviews exist. Marking up a rating that
 *    nobody left is what gets a site's rich results pulled.
 */
function buildJsonLd({ listing, band, crumbs }) {
  const url = listingUrl(siteUrl, listing.slug, listing.publicCode);

  const lodging = {
    '@type': 'LodgingBusiness',
    '@id': url,
    name: listing.title,
    description: listing.description ?? undefined,
    url,
    image: listing.photos.slice(0, 6).map((p) => absolutePublicUrl(siteUrl, p.url)),
    address: {
      '@type': 'PostalAddress',
      addressLocality: listing.areaName,
      addressRegion: listing.cityName,
      addressCountry: 'IN',
    },
    petsAllowed: undefined,
    maximumAttendeeCapacity: listing.capacity,
    numberOfRooms: listing.bedrooms || undefined,
    amenityFeature: listing.amenities.included.slice(0, 20).map((name) => ({
      '@type': 'LocationFeatureSpecification',
      name,
      value: true,
    })),
  };

  if (band) {
    lodging.makesOffer = {
      '@type': 'AggregateOffer',
      priceCurrency: 'INR',
      lowPrice: band.low,
      highPrice: band.high,
      offerCount: Object.keys(listing.prices ?? {}).length,
      url,
    };
  }

  if (listing.reviewCount > 0 && listing.rating) {
    lodging.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: listing.rating,
      reviewCount: listing.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      lodging,
      {
        '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.name,
          item: c.href ? `${siteUrl}${c.href}` : url,
        })),
      },
    ],
  };
}
