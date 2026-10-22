import { notFound } from 'next/navigation';
import { publicMetadata } from '@/lib/seo/metadata';
import { homeHero } from '@/lib/ui/layout';
import Link from '@/components/navigation/NavigationLink';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import HeroPhotos from '@/components/rentra/HeroPhotos';
import TrustStrip, { STAY_TRUST } from '@/components/rentra/TrustStrip';
import StayPicker from '@/components/rentra/hotels/StayPicker';
import photos from '@/components/rentra/hotels/inspiration.json';
import CityRow from '@/components/rentra/CityRow';
import VerticalTabs from '@/components/rentra/VerticalTabs';
import { EmptyState } from '@/components/ui/empty-state';
import { verticalTabs } from '@/lib/domain/vertical-ui';
import { addLocalDays, parseLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { ArrowRight, BedDouble, Building2, CalendarDays, MapPin, Moon, Wallet } from 'lucide-react';

const VERTICAL = 'hotel';
const COLLECTIONS = [
  {
    id: 'recommended',
    title: 'Recommended stays',
    subtitle: 'Explore hotels for your next trip, across destinations.',
    query: { sort: 'recommended' },
  },
  {
    id: 'top-rated',
    title: 'Top-rated stays',
    subtitle: 'Rated 8 or above by guests who stayed.',
    query: { sort: 'rating', rating: 8 },
  },
  {
    id: 'poolside',
    title: 'A little poolside escape',
    subtitle: 'Hotels with a swimming pool. Check access rules on the listing.',
    query: { amenities: 'swimming_pool' },
  },
  {
    id: 'budget',
    title: 'Stays under ₹2,000',
    subtitle: 'From rates per room, per night, before taxes.',
    query: { sort: 'price_asc', max: 2000 },
  },
  {
    id: 'couples',
    title: 'Time for just the two of you',
    subtitle: 'Hotels that welcome unmarried couples with valid ID.',
    query: { couples: 1 },
  },
  {
    id: 'breakfast',
    title: 'Wake up to breakfast',
    subtitle: 'Explore room rates with breakfast included.',
    query: { breakfast: 1 },
  },
];
const HERO_PLACES = ['hero', 'weekend', 'couple'].map((key) => ({
  id: key,
  title: photos[key].hotel,
  area: 'Stay inspiration',
  href: photos[key].source,
  photo: { url: photos[key].src },
}));

export const metadata = publicMetadata({
  title: 'Find hotels for your next getaway',
  description:
    'Explore hotels by the kind of trip you want. Compare rooms, cancellation terms and the total price with taxes for your dates.',
  path: '/hotels',
});

// shortcut: date shortcuts use the render date, refresh client-side if midnight traffic needs fresher dates.
export const revalidate = 3600;

export default async function HotelsHomePage() {
  const registry = await degradeOnFailure(
    () => discoveryApi.betaRegistry(),
    EMPTY_REGISTRY,
    'hotels home registry',
  );
  const vertical = (registry.verticals ?? []).find((item) => item.code === VERTICAL);
  if (!vertical && registry !== EMPTY_REGISTRY) notFound();

  const collections = (
    await Promise.all(
      COLLECTIONS.map(async (collection) => {
        const result = await degradeOnFailure(
          () => discoveryApi.search({ vertical: VERTICAL, ...collection.query }),
          null,
          `hotels home ${collection.id}`,
        );
        return {
          ...collection,
          places: (result?.items ?? [])
            .filter(
              (listing) =>
                collection.id !== 'top-rated' || (listing.reviewCount > 0 && listing.rating >= 8),
            )
            .slice(0, 8),
        };
      }),
    )
  ).filter((collection) => collection.places.length >= (collection.id === 'recommended' ? 1 : 2));

  const today = propertyToday();
  const friday = addLocalDays(today, (5 - parseLocalDate(today).getUTCDay() + 7) % 7);
  const chips = [
    [Moon, 'Tonight', `/search?vertical=hotel&checkin=${today}&checkout=${addLocalDays(today, 1)}`],
    [
      CalendarDays,
      'This weekend',
      `/search?vertical=hotel&checkin=${friday}&checkout=${addLocalDays(friday, 2)}`,
    ],
    [Wallet, 'Under ₹2,000', '/search?vertical=hotel&max=2000&sort=price_asc'],
  ];

  return (
    <>
      <HeroPhotos places={HERO_PLACES}>
        <VerticalTabs items={verticalTabs(registry, VERTICAL)} variant="hero" />
        <p className={homeHero.badge}>
          <BedDouble className="size-3.5" aria-hidden="true" />
          Hotels and overnight stays
        </p>
        <h1 className={homeHero.title}>Find a room for your next getaway.</h1>
        <p className={homeHero.description}>
          Explore hotels, compare rooms and choose your dates. See your total with taxes before
          continuing.
        </p>
        <div className="mt-8">
          <SearchBar dock registry={registry} vertical={VERTICAL} />
        </div>
        <ul className={homeHero.chips}>
          {chips.map(([Icon, label, href]) => (
            <li key={label} className="shrink-0">
              <Link
                href={href}
                className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-meta font-medium text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/20"
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </HeroPhotos>

      <section
        className="relative mx-auto -mt-12 max-w-(--container-page) px-4 sm:px-6"
        aria-label="Plan your hotel stay"
      >
        <div className="rounded-lg border border-border bg-card p-5 shadow-md sm:p-6">
          <TrustStrip items={STAY_TRUST} />
        </div>
      </section>

      <section
        className="mx-auto max-w-(--container-page) px-4 pt-4 pb-12 sm:px-6"
        aria-labelledby="explore-hotels"
      >
        <h2 id="explore-hotels" className="sr-only">
          Explore hotels
        </h2>
        {collections.length > 0 ? (
          collections.map((collection) => (
            <CityRow
              key={collection.id}
              id={`hotels-${collection.id}`}
              title={collection.title}
              subtitle={collection.subtitle}
              href={`/search?${new URLSearchParams({ vertical: VERTICAL, ...collection.query })}`}
              linkLabel="View all stays"
              railLabel={collection.title}
            >
              {collection.places.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showPriceNote={false} />
              ))}
            </CityRow>
          ))
        ) : registry === EMPTY_REGISTRY ? (
          <p className="mt-6 text-body text-ink-600">
            We couldn’t load hotels right now.{' '}
            <Link href="/search?vertical=hotel" className="underline">
              Try hotel search
            </Link>{' '}
            to check current stays.
          </p>
        ) : (
          <EmptyState
            icon={Building2}
            title="No stays to show right now"
            description="Try hotel search for current stays, or check back soon."
          >
            <Link
              href="/search?vertical=hotel"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-meta font-semibold text-white hover:bg-primary-hover"
            >
              Explore hotels
            </Link>
          </EmptyState>
        )}
      </section>

      <StayPicker cities={registry.cities} />

      {vertical && registry.cities.length > 0 ? (
        <section className="mx-auto max-w-(--container-page) px-4 pb-12 sm:px-6">
          <h2 className="text-h3">Explore by city</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {registry.cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}/${vertical.slug}`}
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

      <section className="mx-auto max-w-(--container-page) px-4 pb-4 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-lg bg-champagne-subtle px-6 py-6 sm:flex-row sm:items-center sm:px-8">
          <div>
            <h2 className="text-h3 text-brand-900">Own a hotel?</h2>
            <p className="mt-1 text-meta text-ink-600">
              List your rooms and manage rates and bookings in one place.
            </p>
          </div>
          <Link
            href="/partner/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-meta font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            List your hotel
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
