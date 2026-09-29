import Link from '@/components/navigation/NavigationLink';
import Image from './PropertyImage';
import Rating from './Rating';
import TrustBadge from './TrustBadge';
import SaveButton from './SaveButton';
import { formatINR } from '@/lib/domain/pricing';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { ImageOff } from 'lucide-react';

/**
 * A flat ink-100 placeholder. Cheap perceived-performance win on the
 * mid-range Android connections this product is actually browsed on, and it
 * stops the grid jumping as photos arrive.
 */
const BLUR =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3">' +
      '<rect width="4" height="3" fill="#EBEEEB"/></svg>',
  ).toString('base64');

/**
 * The shared discovery card: photograph, property identity, location and price.
 *
 * A Server Component with small client islands for photo recovery and saving.
 *
 * Card photos are lazy by default and deliberately NOT preloaded. Next 16's
 * docs are explicit: do not preload when several images could be the LCP
 * element depending on viewport — which is exactly a responsive card grid.
 * Competing preloads starve the hero and make LCP worse, not better.
 * Only the hero image on a page gets `preload`.
 *
 * @param {object} props
 * @param {boolean} [props.eager] Opt out of lazy loading for a card that is
 *   genuinely above the fold on every viewport. Rare — leave it off.
 */
export default function ListingCard({ listing, eager = false, showPriceNote = true, priceNoteId }) {
  const {
    href,
    area,
    title,
    capacity,
    bedrooms,
    highlight,
    price,
    strikePrice,
    isFromPrice,
    unit,
    rating,
    reviewCount,
    badge,
    photo,
    photoCount,
  } = listing;

  const capacityLine = [`Up to ${capacity} guests`, bedrooms ? `${bedrooms} BR` : null, highlight]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="group relative min-w-0">
      {/* The photo IS the card — no border, no shadow at rest. */}
      <div className="relative aspect-4/3 overflow-hidden rounded-lg bg-ink-100">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            loading={eager ? 'eager' : 'lazy'}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 25vw"
            placeholder={BLUR}
            className="object-cover transition-transform duration-200 ease-out motion-safe:group-hover:scale-[1.025]"
          />
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-meta text-ink-600">
            <ImageOff className="size-6" aria-hidden="true" />
            Photos coming soon
          </span>
        )}

        {/* Scrim so a white badge and heart stay legible on a bright sky. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

        {badge ? (
          <div className="absolute top-2.5 left-2.5">
            <TrustBadge variant={badge} />
          </div>
        ) : null}

        <SaveButton rentableId={listing.id} listingTitle={title} selection={listing.selection} />

        {photoCount > 1 ? (
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-sm bg-ink-900/75 px-2 py-1 text-tiny text-white">
            {photoCount} photos
          </span>
        ) : null}
      </div>

      <div className="pt-4">
        <h3 className="min-w-0 text-h4 font-semibold tracking-tight">
          <Link
            href={href}
            aria-describedby={priceNoteId}
            className="after:absolute after:inset-0 after:rounded-lg"
          >
            {title}
          </Link>
        </h3>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="min-w-0 text-meta text-ink-600 [overflow-wrap:anywhere]">{area}</p>
          {rating !== null && (
            <Rating value={rating} count={reviewCount} className="shrink-0 whitespace-nowrap" />
          )}
        </div>
        <p className="mt-1 text-tiny text-ink-500">{capacityLine}</p>

        <p className="mt-2 flex flex-wrap items-baseline gap-2">
          {isFromPrice && price != null ? (
            <span className="text-tiny text-ink-500">from</span>
          ) : null}
          <span className="text-h4 font-extrabold tabular tracking-tight" data-money>
            {price == null
              ? 'Price on date selection'
              : listing.priceMinor != null
                ? formatINRMinor(listing.priceMinor)
                : formatINR(price)}
          </span>
          <span className="text-meta text-ink-600">{price == null ? null : `/ ${unit}`}</span>
          {strikePrice ? (
            <s className="text-meta text-ink-600 tabular" data-money>
              {formatINR(strikePrice)}
            </s>
          ) : null}
        </p>
        {showPriceNote && listing.priceNote && (
          <p className="mt-1 text-tiny text-ink-500">{listing.priceNote}</p>
        )}
      </div>
    </article>
  );
}
