import LocationMap from '@/components/rentra/listing/LocationMap';
import { publicMetadata, serializeJsonLd } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import { cache, Fragment, Suspense } from 'react';
import { connection } from 'next/server';
import { notFound, permanentRedirect } from 'next/navigation';
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
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
import { propertyToday } from '@/lib/domain/booking-dates';
import { listingFacts } from '@/lib/domain/vertical-ui';
import { WEEKDAYS } from '@/lib/domain/hourly';
import VenueMobileBar from '@/components/rentra/listing/VenueMobileBar';
import HourlyQuoteProvider from '@/components/rentra/listing/HourlyQuoteProvider';
import {
  ActivityChips,
  CourtsList,
  OpeningHours,
  RateTable,
  todayHours,
  unitLabel,
  VenueBookingRail,
  bookableActivities,
  VenueCancellation,
  VenueFacts,
  VenueRules,
} from '@/components/rentra/listing/VenueSections';

import { ListingDetail, priceBand, venueMetadata } from '@/components/rentra/listing/ListingDetail';
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
  if (!found) return { title: 'Listing not found', robots: { index: false, follow: false } };

  const { listing } = found;
  if (listing.rentalUnit === 'hour') return venueMetadata(listing);
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
    const query = await searchParams;
    const path = listingPath(listing.slug, listing.publicCode);
    if (listing.rentalUnit === 'hour') {
      // Venue links carry activity, date, start…; the picker validates them on arrival.
      const keep = ['activity', 'date', 'start', 'duration', 'players', 'court'];
      const kept = new URLSearchParams(
        keep.filter((k) => typeof query?.[k] === 'string').map((k) => [k, query[k]]),
      ).toString();
      permanentRedirect(kept ? `${path}?${kept}` : path);
    }
    permanentRedirect(savedListingHref(path, selectionFromSavedUrl(query, listing.id)));
  }

  return <ListingDetail listing={listing} />;
}
