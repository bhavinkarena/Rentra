import { homeHero } from '@/lib/ui/layout';
import { notFound } from 'next/navigation';
import { publicMetadata } from '@/lib/seo/metadata';
import Link from '@/components/navigation/NavigationLink';
import SearchBar from '@/components/rentra/SearchBar';
import ListingCard from '@/components/rentra/ListingCard';
import TrustStrip, { PLAY_TRUST } from '@/components/rentra/TrustStrip';
import HeroPhotos from '@/components/rentra/HeroPhotos';
import CityRow from '@/components/rentra/CityRow';
import ActivityPicker from '@/components/rentra/ActivityPicker';
import VerticalTabs from '@/components/rentra/VerticalTabs';
import { ActivityIcon } from '@/components/rentra/icons/activity-icons';
import { EmptyState } from '@/components/ui/empty-state';
import { verticalTabs } from '@/lib/domain/vertical-ui';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { ArrowRight, MapPin, Trophy } from 'lucide-react';

const VERTICAL = 'entertainment';
// Same order as the farmhouse home: biggest demand first, chips cover the rest.
const ROW_CITY_ORDER = ['surat', 'ahmedabad', 'vadodara', 'rajkot'];
const CITY_ROWS = 4;
// Cards read per city: the row shows 10, the activity tiles count all of them.
const CITY_READ = 48;
// Venue photos lead the hero only once there are enough to rotate.
const MIN_HERO_PHOTOS = 3;

export const metadata = publicMetadata({
  title: 'Book box cricket, pickleball, bowling and more in Gujarat',
  description:
    'Find turfs, courts, lanes and play zones you can book by the hour. See free times and hourly prices before you book.',
  path: '/entertainment',
});

// Static like the farmhouse home; listing edits and catalogue writes revalidate it.
export const revalidate = 3600;

/** The Entertainment home (entertainment plan, Phase 6): the farmhouse home's skeleton, for venues. */
export default async function EntertainmentHomePage() {
  const registry = await degradeOnFailure(
    () => discoveryApi.registry(),
    EMPTY_REGISTRY,
    'entertainment home registry',
  );
  const vertical = (registry.verticals ?? []).find((v) => v.code === VERTICAL);
  // Hidden or open to owners only: no public home. An API outage renders the
  // thin page below rather than caching a 404 for the revalidation window.
  if (!vertical && registry !== EMPTY_REGISTRY) notFound();

  const activities = registry.categories.filter((c) => c.vertical === VERTICAL);
  const primaryCity = registry.cities.find((c) => c.slug === 'surat') || registry.cities[0];
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
      'entertainment home listings',
    ),
    Promise.all(
      rowCities.map(async (city) => ({
        city,
        places: await degradeOnFailure(
          () =>
            discoveryApi.listings({ vertical: VERTICAL, citySlug: city.slug, limit: CITY_READ }),
          [],
          `entertainment home listings ${city.slug}`,
        ),
      })),
    ).then((rows) => rows.filter((row) => row.places.length > 0)),
  ]);

  const withPhotos = heroCards.filter((l) => l.photo);
  const heroPlaces = withPhotos.length >= MIN_HERO_PHOTOS ? withPhotos : [];
  const rowPlaces = cityRows.flatMap((row) => row.places.slice(0, 10));
  const sharedPriceNote =
    rowPlaces.length > 1 && rowPlaces.every((l) => l.priceNote === rowPlaces[0].priceNote)
      ? rowPlaces[0].priceNote
      : null;
  // Activities each city really has, counted from its venue cards, in catalogue order.
  const pickerCities = cityRows.map(({ city, places }) => {
    const usedPhotos = new Set();
    return {
      slug: city.slug,
      name: city.name,
      activities: activities
        .map((activity) => {
          const matching = places.filter((p) =>
            p.activities?.some((a) => a.slug === activity.slug),
          );
          const primary = matching.filter((p) => p.categorySlug === activity.slug);
          const photos = [...primary, ...matching].flatMap((p) =>
            p.photos?.length ? p.photos : p.photo ? [p.photo] : [],
          );
          const photo = photos.find((p) => !usedPhotos.has(p.url));
          if (photo) usedPhotos.add(photo.url);
          return {
            slug: activity.slug,
            name: activity.name,
            iconKey: activity.iconKey,
            photo,
            count: matching.length,
            more: places.length === CITY_READ,
          };
        })
        .filter((activity) => activity.count > 0),
    };
  });
  const offered = (places) => {
    const names = activities
      .filter((a) => places.some((p) => p.activities?.some((x) => x.slug === a.slug)))
      .map((a) => a.name);
    return `${names.slice(0, 2).join(', ')}${names.length > 2 ? ' and more' : ''}, bookable by the hour.`;
  };

  return (
    <>
      <HeroPhotos places={heroPlaces}>
        <VerticalTabs items={verticalTabs(registry, VERTICAL)} variant="hero" />
        <p className={homeHero.badge}>
          <Trophy className="size-3.5" aria-hidden="true" />
          Turfs, courts and play zones across Gujarat
        </p>
        <h1 className={homeHero.title}>Book a court, lane or game in minutes.</h1>
        <p className={homeHero.description}>
          Explore venues, compare activities and choose your date and time. See hourly rates and
          platform fees before continuing.
        </p>
        <div className="mt-8">
          <SearchBar dock registry={registry} vertical={VERTICAL} />
        </div>

        {activities.length > 0 ? (
          <ul className={homeHero.chips}>
            {activities.map((activity) => (
              <li key={activity.slug} className="shrink-0">
                <Link
                  href={
                    primaryCity
                      ? `/${primaryCity.slug}/${activity.slug}`
                      : `/search?vertical=${VERTICAL}&category=${activity.slug}`
                  }
                  className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-meta font-medium text-white backdrop-blur transition-colors hover:border-white/50 hover:bg-white/20"
                >
                  <ActivityIcon iconKey={activity.iconKey} className="size-4" />
                  {activity.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </HeroPhotos>

      <section className="relative mx-auto -mt-12 max-w-(--container-page) px-4 sm:px-6">
        <div className="rounded-lg border border-border bg-card p-5 shadow-md sm:p-6">
          <TrustStrip items={PLAY_TRUST} />
        </div>
      </section>

      <section className="mx-auto max-w-(--container-page) px-4 pt-4 pb-12 sm:px-6">
        <h2 className="sr-only">Explore venues</h2>
        {cityRows.length > 0 ? (
          cityRows.map(({ city, places }) => (
            <CityRow
              key={city.slug}
              id={`play-${city.slug}`}
              city={city.name}
              title={`Play near ${city.name}`}
              subtitle={offered(places)}
              href={vertical ? `/${city.slug}/${vertical.slug}` : '/search?vertical=entertainment'}
            >
              {places.slice(0, 10).map((listing) => (
                <ListingCard key={listing.id} listing={listing} showPriceNote={!sharedPriceNote} />
              ))}
            </CityRow>
          ))
        ) : registry === EMPTY_REGISTRY ? (
          <p className="mt-6 text-body text-ink-600">
            Venues could not load right now. Try again in a few minutes.
          </p>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No venues are live yet"
            description="Courts and play zones are joining Rentra. Check back soon, or list yours."
          >
            <Link
              href="/partner/login"
              className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-meta font-semibold text-white hover:bg-primary-hover"
            >
              List your venue
            </Link>
          </EmptyState>
        )}
        {sharedPriceNote ? (
          <p className="mt-8 border-t border-border pt-4 text-tiny text-ink-500">
            {sharedPriceNote}
          </p>
        ) : null}
      </section>

      <ActivityPicker cities={pickerCities} />

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
            <h2 className="text-h3 text-brand-900">Own a turf, court or play zone?</h2>
            <p className="mt-1 text-meta text-ink-600">
              List your courts, set your hours and hourly rates, and take bookings online.
            </p>
          </div>
          <Link
            href="/partner/login"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-meta font-semibold text-white transition-colors hover:bg-primary-hover"
          >
            List your venue
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
