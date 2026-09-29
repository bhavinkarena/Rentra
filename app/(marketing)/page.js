import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import TrustStrip from '@/components/rentra/TrustStrip';
import HeroPhotos from '@/components/rentra/HeroPhotos';
import CityRow from '@/components/rentra/CityRow';
import OccasionPicker from '@/components/rentra/OccasionPicker';
import { DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  Flame,
  House,
  MapPin,
  Sun,
  Waves,
} from 'lucide-react';

const INTENT_ICONS = {
  'day-picnic': Sun,
  'with-pool': Waves,
  'bonfire-allowed': Flame,
  'pre-wedding-shoot': Camera,
  'corporate-offsite': BriefcaseBusiness,
};

// Biggest demand first; the "Explore by city" links cover every other city.
const ROW_CITY_ORDER = ['surat', 'ahmedabad', 'vadodara', 'rajkot'];
const CITY_ROWS = 4;

export const metadata = publicMetadata({
  title: 'Explore farmhouses and day visits',
  description:
    'Explore places for day visits and overnight stays. Compare facilities and check prices for your dates.',
  path: '/',
});

// Classic ISR — content changes slowly, so serve from cache and revalidate
// hourly. On-demand revalidation happens when a Client edits a listing.
export const revalidate = 3600;

export default async function HomePage() {
  const [listings, registry] = await Promise.all([
    degradeOnFailure(() => discoveryApi.listings({ limit: 5 }), [], 'home listings'),
    degradeOnFailure(() => discoveryApi.registry(), EMPTY_REGISTRY, 'home registry'),
  ]);
  const primaryCity = registry.cities.find((c) => c.slug === 'surat') || registry.cities[0];
  const farmhouse = registry.categories.find((c) => c.slug === 'farmhouse');

  const rank = (slug) => {
    const i = ROW_CITY_ORDER.indexOf(slug);
    return i === -1 ? ROW_CITY_ORDER.length : i;
  };
  const rowCities = [...registry.cities]
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .slice(0, CITY_ROWS);
  // One cached request per city, in parallel; a failed city just drops its row.
  const cityRows = (
    await Promise.all(
      rowCities.map(async (city) => ({
        city,
        places: await degradeOnFailure(
          () => discoveryApi.listings({ citySlug: city.slug, limit: 10 }),
          [],
          `home listings ${city.slug}`,
        ),
      })),
    )
  ).filter((row) => row.places.length > 0);
  const rowPlaces = cityRows.flatMap((row) => row.places);

  // The hero shows top-ranked listings' own first frames, not stock images.
  // They come from the card query, so this page is still one round trip.
  const heroPlaces = listings.filter((l) => l.photo).slice(0, 5);
  // Every card repeating the same fee sentence is noise; say it once instead.
  const sharedPriceNote =
    rowPlaces.length > 1 && rowPlaces.every((l) => l.priceNote === rowPlaces[0].priceNote)
      ? rowPlaces[0].priceNote
      : null;

  return (
    <>
      <HeroPhotos places={heroPlaces}>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-tiny font-semibold text-brand-100 ring-1 ring-white/20 backdrop-blur">
          <House className="size-3.5" aria-hidden="true" />
          Farmhouses and day stays across Gujarat
        </p>
        <h1 className="max-w-2xl text-display text-wrap text-white">
          Find a place for your next day out or overnight stay.
        </h1>
        <p className="mt-4 max-w-prose text-body-lg text-brand-100">
          Explore places, compare facilities and choose your visit dates. See current rent and
          platform fees before continuing.
        </p>
        <div className="mt-8">
          <SearchBar />
        </div>

        <ul className="-mx-6 mt-6 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {DISCOVERY_INTENTS.map((intent) => {
            const Icon = INTENT_ICONS[intent.slug];
            return (
              <li key={intent.slug} className="shrink-0">
                <Link
                  href={
                    primaryCity && farmhouse
                      ? `/${primaryCity.slug}/farmhouse/intent/${intent.slug}`
                      : '/search'
                  }
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-meta font-medium text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/20"
                >
                  {Icon ? <Icon className="size-4" aria-hidden="true" /> : null}
                  {intent.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </HeroPhotos>

      {/* Lifted onto the hero edge so the trust points read as part of the
          search, not a separate block floating between hero and grid. */}
      <section className="relative mx-auto -mt-12 max-w-(--container-page) px-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-md sm:p-6">
          <TrustStrip />
        </div>
      </section>

      <section className="mx-auto max-w-(--container-page) px-6 pt-4 pb-12">
        {/* Visible heading removed at the owner's request; kept for screen readers
            so the city rows' h3 headings still sit under an h2. */}
        <h2 className="sr-only">Explore places</h2>
        {cityRows.length > 0 ? (
          cityRows.map(({ city, places }) => (
            <CityRow
              key={city.slug}
              id={`near-${city.slug}`}
              city={city.name}
              href={farmhouse ? `/${city.slug}/${farmhouse.slug}` : '/search'}
            >
              {places.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showPriceNote={!sharedPriceNote} />
              ))}
            </CityRow>
          ))
        ) : (
          <p className="mt-6 text-body text-ink-600">
            Places could not load right now.{' '}
            <Link href="/search" className="underline">
              Search places
            </Link>{' '}
            to check current availability.
          </p>
        )}
        {sharedPriceNote ? (
          <p className="mt-8 border-t border-border pt-4 text-tiny text-ink-500">
            {sharedPriceNote}
          </p>
        ) : null}
      </section>

      <OccasionPicker cities={registry.cities} category={farmhouse?.slug} />

      {farmhouse && registry.cities.length > 0 ? (
        <section className="mx-auto max-w-(--container-page) px-6 pb-12">
          <h2 className="text-h3">Explore by city</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {registry.cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}/${farmhouse.slug}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-meta font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  <MapPin className="size-4 text-brand-600" aria-hidden="true" />
                  {city.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mx-auto max-w-(--container-page) px-6 pb-4">
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg bg-brand-50 px-6 py-6 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-h3 text-brand-900">Own a farmhouse or villa?</h2>
            <p className="mt-1 text-meta text-ink-600">
              List it on Rentra and manage bookings, prices and payouts in one place.
            </p>
          </div>
          <Link
            href="/partner/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brand-600 px-5 text-meta font-semibold text-white transition-colors hover:bg-brand-700"
          >
            List your place
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
