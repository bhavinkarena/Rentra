import { homeHero } from '@/lib/ui/layout';
import { notFound } from 'next/navigation';
import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import TrustStrip, { STAY_TRUST } from '@/components/rentra/TrustStrip';
import HeroPhotos from '@/components/rentra/HeroPhotos';
import CityRow from '@/components/rentra/CityRow';
import VerticalTabs from '@/components/rentra/VerticalTabs';
import { EmptyState } from '@/components/ui/empty-state';
import { verticalTabs } from '@/lib/domain/vertical-ui';
import { addLocalDays, parseLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import {
  ArrowRight,
  BedDouble,
  Building2,
  Briefcase,
  CalendarDays,
  Coffee,
  Gem,
  HeartHandshake,
  MapPin,
  Moon,
  Palmtree,
  Wallet,
  Waves,
} from 'lucide-react';

const VERTICAL = 'hotel';
const ROW_CITY_ORDER = ['surat', 'ahmedabad', 'vadodara', 'rajkot'];
const CITY_ROWS = 4;
const MIN_HERO_PHOTOS = 3;
const TYPE_ICONS = {
  hotel: Building2,
  resort: Palmtree,
  'boutique-hotel': Gem,
  'business-hotel': Briefcase,
};

export const metadata = publicMetadata({
  title: 'Hotels in Gujarat with total prices and free cancellation',
  description:
    'Compare hotels, resorts and business hotels in Surat and across Gujarat. See rooms, cancellation terms and the total price with taxes for your dates.',
  path: '/hotels',
});

// ponytail: Tonight/This weekend dates are fixed at render, so they can be up to an hour stale after midnight; compute client-side if guests hit it.
export const revalidate = 3600;

/** The Hotels home (hotel plan §4.3): the farmhouse home's skeleton, for stays. */
export default async function HotelsHomePage() {
  const registry = await degradeOnFailure(
    () => discoveryApi.registry(),
    EMPTY_REGISTRY,
    'hotels home registry',
  );
  const vertical = (registry.verticals ?? []).find((v) => v.code === VERTICAL);
  // Hidden or partners-only: no public home (an outage renders the thin page instead).
  if (!vertical && registry !== EMPTY_REGISTRY) notFound();

  const types = registry.categories.filter((c) => c.vertical === VERTICAL);
  const rank = (slug) => {
    const i = ROW_CITY_ORDER.indexOf(slug);
    return i === -1 ? ROW_CITY_ORDER.length : i;
  };
  const rowCities = [...registry.cities]
    .sort((a, b) => rank(a.slug) - rank(b.slug))
    .slice(0, CITY_ROWS);
  const [heroCards, cityRows] = await Promise.all([
    degradeOnFailure(
      () => discoveryApi.listings({ vertical: VERTICAL, limit: 5 }),
      [],
      'hotels home listings',
    ),
    Promise.all(
      rowCities.map(async (city) => ({
        city,
        places: await degradeOnFailure(
          () => discoveryApi.listings({ vertical: VERTICAL, citySlug: city.slug, limit: 10 }),
          [],
          `hotels home listings ${city.slug}`,
        ),
      })),
    ).then((rows) => rows.filter((row) => row.places.length > 0)),
  ]);
  const withPhotos = heroCards.filter((l) => l.photo);
  const heroPlaces = withPhotos.length >= MIN_HERO_PHOTOS ? withPhotos : [];
  const primary = cityRows[0]?.city ?? registry.cities.find((c) => c.slug === 'surat');
  const base = `/search?vertical=hotel${primary ? `&city=${primary.slug}` : ''}`;
  // Quick chips: tonight and the coming weekend are real date searches.
  const today = propertyToday();
  const toFriday = (5 - parseLocalDate(today).getUTCDay() + 7) % 7;
  const friday = addLocalDays(today, toFriday);
  const chips = [
    [Moon, 'Tonight', `${base}&checkin=${today}&checkout=${addLocalDays(today, 1)}`],
    [CalendarDays, 'This weekend', `${base}&checkin=${friday}&checkout=${addLocalDays(friday, 2)}`],
    [HeartHandshake, 'Couple-friendly', `${base}&couples=1`],
    [Wallet, 'Under ₹2,000', `${base}&max=2000`],
    [Coffee, 'With breakfast', `${base}&breakfast=1`],
    [Waves, 'Pool', `${base}&amenities=swimming_pool`],
  ];
  const landmarks = (registry.landmarks ?? []).slice(0, 8);

  return (
    <>
      <HeroPhotos places={heroPlaces}>
        <VerticalTabs items={verticalTabs(registry, VERTICAL)} variant="hero" />
        <p className={homeHero.badge}>
          <BedDouble className="size-3.5" aria-hidden="true" />
          Hotels, resorts and business stays
        </p>
        <h1 className={homeHero.title}>Find a room that fits your trip.</h1>
        <p className={homeHero.description}>
          Search by city, area or landmark. Add dates to see the total price with taxes and when you
          can cancel for free.
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

      <section className="relative mx-auto -mt-12 max-w-(--container-page) px-4 sm:px-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-md sm:p-6">
          <TrustStrip items={STAY_TRUST} />
        </div>
      </section>

      <section className="mx-auto max-w-(--container-page) px-4 pt-4 pb-12 sm:px-6">
        <h2 className="sr-only">Explore hotels</h2>
        {cityRows.length > 0 ? (
          cityRows.map(({ city, places }) => (
            <CityRow
              key={city.slug}
              id={`stay-${city.slug}`}
              city={city.name}
              title={`Stays in ${city.name}`}
              subtitle="Room rates per night before taxes. Add dates for your total."
              href={vertical ? `/${city.slug}/${vertical.slug}` : '/search?vertical=hotel'}
            >
              {places.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showPriceNote={false} />
              ))}
            </CityRow>
          ))
        ) : registry === EMPTY_REGISTRY ? (
          <p className="mt-6 text-body text-ink-600">
            Hotels could not load right now. Try again in a few minutes.
          </p>
        ) : (
          <EmptyState
            icon={Building2}
            title="No hotels are live yet"
            description="Hotels are joining Rentra. Check back soon, or list yours."
          >
            <Link
              href="/partner/login"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-meta font-semibold text-white hover:bg-primary-hover"
            >
              List your hotel
            </Link>
          </EmptyState>
        )}
      </section>

      {types.length && primary && vertical ? (
        <section className="mx-auto max-w-(--container-page) px-4 pb-12 sm:px-6">
          <h2 className="text-h3">Browse by type</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {types.map((type) => {
              const Icon = TYPE_ICONS[type.slug] ?? Building2;
              return (
                <li key={type.slug}>
                  <Link
                    href={`/${primary.slug}/${type.slug}`}
                    className="flex min-h-16 items-center gap-3 rounded-lg border border-border bg-card px-4 font-semibold text-ink-800 hover:border-brand-300 hover:bg-brand-50"
                  >
                    <Icon className="size-6 text-brand-600" aria-hidden="true" />
                    {type.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {vertical && (registry.cities.length || landmarks.length) ? (
        <section className="mx-auto max-w-(--container-page) px-4 pb-12 sm:px-6">
          <h2 className="text-h3">Explore by city or landmark</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {registry.cities.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/${city.slug}/${vertical.slug}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-meta font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  <MapPin className="size-4 text-brand-600" aria-hidden="true" />
                  {city.name}
                </Link>
              </li>
            ))}
            {landmarks.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/hotels/near/${item.slug}`}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-meta font-medium text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800"
                >
                  <MapPin className="size-4 text-champagne" aria-hidden="true" />
                  Near {item.name}
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
              List your rooms, set rates by night and manage bookings from one calendar.
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
