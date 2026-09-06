import Link from 'next/link';
import Image from 'next/image';
import Rating from './Rating';
import TrustBadge from './TrustBadge';
import SaveButton from './SaveButton';
import { formatINR } from '@/lib/domain/pricing';

/**
 * A flat ink-100 placeholder. Cheap perceived-performance win on the
 * mid-range Android connections this product is actually browsed on, and it
 * stops the grid jumping as photos arrive.
 */
const BLUR =
  'data:image/svg+xml;base64,'
  + Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3">'
    + '<rect width="4" height="3" fill="#EBEEEB"/></svg>',
  ).toString('base64');

/**
 * The most repeated object in the product. Anatomy is deliberately identical
 * to Airbnb / SaffronStays / BookMyFarm — that order is learned behaviour and
 * getting creative with it costs conversion without buying distinctiveness.
 *
 * A Server Component. The only interactive part is the save heart, which is
 * its own tiny client island.
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
export default function ListingCard({ listing, eager = false }) {
  const {
    href, area, title, capacity, bedrooms, highlight, price, strikePrice,
    isFromPrice, unit, rating, reviewCount, badge, photo, photoCount,
  } = listing;

  const capacityLine = [
    `Up to ${capacity} guests`,
    bedrooms ? `${bedrooms} BR` : null,
    highlight,
  ].filter(Boolean).join(' · ');

  return (
    <Link href={href} className="group block">
      {/* The photo IS the card — no border, no shadow at rest. */}
      <div className="relative aspect-4/3 overflow-hidden rounded-md bg-ink-100 transition-shadow group-hover:shadow-md">
        {photo ? (
          <Image
            src={photo.url}
            alt={photo.alt}
            fill
            loading={eager ? 'eager' : 'lazy'}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            placeholder={BLUR}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-tiny font-semibold tracking-widest text-ink-400 uppercase">
            photo pending
          </span>
        )}

        {/* Scrim so a white badge and heart stay legible on a bright sky. */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/25 to-transparent" />

        {badge ? (
          <div className="absolute top-2.5 left-2.5">
            <TrustBadge variant={badge} />
          </div>
        ) : null}

        <SaveButton listingTitle={title} />

        {photoCount > 1 ? (
          <div className="absolute bottom-2.5 left-1/2 flex -translate-x-1/2 gap-1.5">
            {Array.from({ length: Math.min(photoCount, 5) }).map((_, i) => (
              <span
                key={i}
                className={`size-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/55'}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="pt-3">
        {/* Area first, not the property name — people search by place. */}
        <div className="flex items-baseline justify-between gap-2.5">
          <h3 className="text-h4 font-bold tracking-tight">{area}</h3>
          <Rating value={rating} count={reviewCount} />
        </div>

        <p className="mt-0.5 truncate text-meta text-ink-600">{title}</p>
        <p className="mt-1 text-tiny text-ink-500">{capacityLine}</p>

        <p className="mt-2 flex flex-wrap items-baseline gap-2">
          {isFromPrice ? <span className="text-tiny text-ink-500">from</span> : null}
          <span className="text-h4 font-extrabold tabular tracking-tight" data-money>
            {formatINR(price)}
          </span>
          <span className="text-meta text-ink-600">/ {unit}</span>
          {strikePrice ? (
            <s className="text-meta text-ink-400 tabular" data-money>{formatINR(strikePrice)}</s>
          ) : null}
        </p>
      </div>
    </Link>
  );
}
