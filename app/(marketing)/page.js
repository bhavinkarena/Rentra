import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import Image from '@/components/rentra/PropertyImage';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import TrustStrip from '@/components/rentra/TrustStrip';
import { DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { ArrowRight, Compass, Sun, Waves, Flame, Camera, Users } from 'lucide-react';

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
    degradeOnFailure(() => discoveryApi.listings({ limit: 16 }), [], 'home listings'),
    degradeOnFailure(() => discoveryApi.registry(), EMPTY_REGISTRY, 'home registry'),
  ]);
  const primaryCity = registry.cities.find((c) => c.slug === 'surat') || registry.cities[0];
  const farmhouse = registry.categories.find((c) => c.slug === 'farmhouse');

  // The hero is the top-ranked listing's own first frame, not a stock image.
  // It comes from the card query, so this page is one round trip.
  const heroPhoto = listings[0]?.photo ?? null;

  return (
    <>
      <section className="mx-auto max-w-(--container-page) px-4 pt-6 pb-8 sm:px-6 sm:pt-8 lg:pt-10">
        <div className="grid items-center gap-7 md:grid-cols-[0.9fr_1.1fr] md:gap-10">
          <div className="py-2 md:py-8">
            <h1 className="max-w-lg text-display text-brand-950">
              A little closer to a great escape.
            </h1>
            <p className="mt-5 max-w-md text-body-lg text-ink-600">
              Farmhouses, pool days and overnight stays. Find your place, choose your dates and see
              the price before booking.
            </p>
            <Link
              href="#find-a-place"
              className="mt-6 hidden min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline md:inline-flex"
            >
              Find your next visit <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="relative aspect-[16/8] overflow-hidden rounded-xl bg-brand-100 md:aspect-[4/3] lg:max-h-[420px]">
            {heroPhoto ? (
              <>
                <Image
                  src={heroPhoto.url}
                  alt={heroPhoto.alt || listings[0].title}
                  fill
                  preload
                  quality={60}
                  sizes="(min-width: 1280px) 680px, (min-width: 768px) 55vw, 100vw"
                  className="object-cover"
                />
                <Link
                  href={listings[0].href}
                  className="absolute right-4 bottom-4 left-4 flex min-h-14 items-center justify-between gap-3 rounded-md bg-white px-4 py-3 text-ink-900 shadow-sm sm:right-5 sm:bottom-5 sm:left-auto sm:min-w-64"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-meta font-semibold">
                      {listings[0].title}
                    </span>
                    <span className="block text-tiny text-ink-600">{listings[0].area}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
                </Link>
              </>
            ) : (
              <div className="flex h-full items-center justify-center gap-3 text-brand-800">
                <Compass className="size-8" aria-hidden="true" />
                <span className="text-meta">Your next visit starts here</span>
              </div>
            )}
          </div>
        </div>
        <div id="find-a-place" className="mt-7 md:mt-8">
          <SearchBar />
        </div>
        <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-1 sm:gap-x-7" aria-label="Ways to explore">
          {DISCOVERY_INTENTS.map((intent) => (
            <li key={intent.slug}>
              <Link
                href={
                  primaryCity && farmhouse
                    ? `/${primaryCity.slug}/farmhouse/intent/${intent.slug}`
                    : '/search'
                }
                className="inline-flex min-h-11 items-center gap-2 border-b border-transparent text-meta font-medium text-ink-600 transition-colors hover:border-brand-600 hover:text-brand-700"
              >
                {(() => {
                  const Icon =
                    {
                      'day-picnic': Sun,
                      'with-pool': Waves,
                      'bonfire-allowed': Flame,
                      'pre-wedding-shoot': Camera,
                      'corporate-offsite': Users,
                    }[intent.slug] || Compass;
                  return <Icon className="size-4" aria-hidden="true" />;
                })()}
                {intent.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border bg-brand-50/60">
        <div className="mx-auto max-w-(--container-page) px-4 py-7 sm:px-6 sm:py-8">
          <TrustStrip />
        </div>
      </section>

      <section className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6 sm:py-14">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-h2">Find your kind of getaway</h2>
            <p className="mt-2 text-meta text-ink-600">
              Room to unwind, places to gather. Explore what’s available.
            </p>
          </div>
          <Link
            href="/search"
            className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline"
          >
            View all places <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {!listings.length && (
          <div className="mt-8 rounded-lg border border-border bg-card p-8">
            <h3 className="text-h3">Let’s find your next visit</h3>
            <p className="mt-2 text-meta text-ink-600">
              Places could not load right now. Search to check current availability.
            </p>
            <Link
              href="/search"
              className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-brand-700 hover:underline"
            >
              Search places <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        )}
        <div className="mt-7 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>
    </>
  );
}
