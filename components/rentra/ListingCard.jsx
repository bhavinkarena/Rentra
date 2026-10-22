import Link from '@/components/navigation/NavigationLink';
import CardPhotos from './CardPhotos';
import Rating from './Rating';
import TrustBadge from './TrustBadge';
import SaveButton from './SaveButton';
import { formatINR } from '@/lib/domain/pricing';
import { formatINRMinor } from '@/lib/domain/booking-money';
import { clock12, listingFacts, unitLabel } from '@/lib/domain/vertical-ui';
import { ActivityIcon } from './icons/activity-icons';
import { BedDouble, CircleCheck, Coffee, HeartHandshake, IdCard, ImageOff } from 'lucide-react';

/**
 * A flat ink-100 placeholder. Cheap perceived-performance win on the
 * mid-range Android connections this product is actually browsed on, and it
 * stops the grid jumping as photos arrive.
 */
const BLUR =
  'data:image/svg+xml;base64,' +
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="4" height="3">' +
      '<rect width="4" height="3" fill="#E7EBE5"/></svg>',
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
export default function ListingCard({ listing, eager = false, showPriceNote = true }) {
  const {
    href,
    area,
    title,
    price,
    strikePrice,
    isFromPrice,
    unit,
    rating,
    reviewCount,
    badge,
    photo,
  } = listing;

  const photos = listing.photos?.length ? listing.photos : photo ? [photo] : [];

  // Farmhouse: guests, bedrooms, highlight. Venue: activities, courts, players, indoor.
  const capacityLine = listingFacts(listing).join(' · ');

  return (
    <article className="group relative min-w-0">
      {/* The photo IS the card — no border, no shadow at rest. */}
      <div className="relative aspect-4/3 overflow-hidden rounded-md bg-ink-100 transition-shadow group-hover:shadow-md">
        {photos.length ? (
          <CardPhotos photos={photos} title={title} eager={eager} placeholder={BLUR} />
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
      </div>

      <div className="pt-3">
        {/* Area first, not the property name — people search by place. */}
        <div className="flex items-baseline justify-between gap-2.5">
          <h3 className="text-h4 font-bold tracking-tight text-wrap">{area}</h3>
          {reviewCount > 0 && rating != null ? (
            <Rating value={rating} count={reviewCount} className="shrink-0" />
          ) : (
            <span className="shrink-0 rounded-sm bg-brand-50 px-1.5 py-0.5 text-tiny font-semibold text-brand-700">
              New
            </span>
          )}
        </div>

        {/* Stretched link: the whole card opens the place, while the save
            heart stays a separate button instead of nesting inside a link. */}
        <p className="mt-0.5 truncate text-meta text-ink-600">
          <Link href={href} className="after:absolute after:inset-0 after:rounded-md">
            {title}
          </Link>
        </p>
        {listing.activities?.length ? (
          <p className="mt-1 flex gap-1.5 text-brand-700">
            {listing.activities.map((activity) => (
              <ActivityIcon key={activity.slug} iconKey={activity.iconKey} className="size-5" />
            ))}
          </p>
        ) : null}
        <p className="mt-1 text-tiny text-ink-500">{capacityLine}</p>
        {listing.vertical === 'hotel' ? <HotelFacts listing={listing} /> : null}

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
          <span className="text-meta text-ink-600">
            {price == null
              ? null
              : listing.times || listing.offer
                ? `for ${unit}`
                : `/ ${unitLabel(unit)}`}
          </span>
          {strikePrice ? (
            <s className="text-meta text-ink-600 tabular" data-money>
              {formatINR(strikePrice)}
            </s>
          ) : null}
        </p>
        {/* Dated venue search: the first free start times, each opening the venue at that time. */}
        {listing.times?.length ? (
          <ul className="relative z-10 mt-2 flex flex-wrap gap-2" aria-label="Free start times">
            {listing.times.map((time) => (
              <li key={time.start}>
                <Link
                  href={`${href}${href.includes('?') ? '&' : '?'}start=${time.start}`}
                  aria-label={`Book ${clock12(time.start)}, ${formatINRMinor(time.rentMinor)}${time.peak ? ', peak' : ''}`}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-tiny font-semibold text-ink-800 tabular hover:border-brand-300 hover:bg-brand-50"
                >
                  {time.peak ? (
                    <span className="size-1.5 rounded-full bg-champagne" aria-hidden="true" />
                  ) : null}
                  {clock12(time.start)}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {showPriceNote && listing.priceNote && (
          <p className="mt-1 text-tiny text-ink-500">{listing.priceNote}</p>
        )}
      </div>
    </article>
  );
}

const freeUntil = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'Asia/Kolkata',
  });

/** Hotel lines (hotel plan §4.4): the priced room and meals, free cancellation, true scarcity, two policy chips. */
function HotelFacts({ listing }) {
  const { offer } = listing;
  const chips = [
    listing.couples ? [HeartHandshake, 'Couple-friendly'] : null,
    listing.localId ? [IdCard, 'Local ID OK'] : null,
  ].filter(Boolean);
  return (
    <div className="mt-1.5 space-y-1 text-tiny text-ink-700">
      {offer ? (
        <p className="flex items-center gap-1.5">
          <BedDouble className="size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="truncate">{offer.roomTypeName}</span>
          {offer.meals ? (
            <>
              <Coffee className="ml-1 size-3.5 shrink-0 text-brand-600" aria-hidden="true" />
              <span className="truncate">{offer.meals}</span>
            </>
          ) : null}
        </p>
      ) : null}
      {offer?.freeUntil ? (
        <p className="flex items-center gap-1.5 text-success">
          <CircleCheck className="size-3.5 shrink-0" aria-hidden="true" />
          Free cancellation until {freeUntil(offer.freeUntil)}
        </p>
      ) : null}
      {chips.length ? (
        <p className="flex flex-wrap gap-1.5">
          {chips.map(([Icon, label]) => (
            <span
              key={label}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-800"
            >
              <Icon className="size-3.5" aria-hidden="true" />
              {label}
            </span>
          ))}
        </p>
      ) : null}
      {offer?.roomsLeft ? (
        <p className="font-semibold text-warning">
          {offer.roomsLeft === 1 ? 'Only 1 room left' : `Only ${offer.roomsLeft} rooms left`} at
          this price
        </p>
      ) : null}
    </div>
  );
}
