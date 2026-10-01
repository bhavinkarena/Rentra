import Link from '@/components/navigation/NavigationLink';
import ListingCard from './ListingCard';
import DiscoveryFilters from './DiscoveryFilters';
import { addLocalDays, formatLocalDate } from '@/lib/domain/booking-dates';
import { clock12 } from '@/lib/domain/vertical-ui';
import { degradeOnFailure } from '@/lib/api/resilient';
import {
  parseDiscoveryQuery,
  discoveryQuery,
  SEARCH_SORTS,
  areaDiscoveryPath,
  intentDiscoveryPath,
  intentsFor,
} from '@/lib/domain/discovery';
import { discoveryApi } from '@/lib/api/endpoints';
import { ArrowLeft, ArrowRight, CalendarX, MapPin, RefreshCw, SearchX, X } from 'lucide-react';
import SortSelect from './SortSelect';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from 'cn';
import { SLOTS } from '@/lib/domain/pricing';

const slotLabels = Object.fromEntries(Object.values(SLOTS).map((slot) => [slot.id, slot.label]));
export default async function DiscoveryResults({ query, registry: registryInput, route = null }) {
  const { filters, errors } = parseDiscoveryQuery({
    ...query,
    ...(route?.intent?.slot && !query.slot ? { slot: route.intent.slot } : {}),
  });
  let result = { items: [], total: 0, totalPages: 1, page: 1, errors: [] },
    failed = false;
  if (!errors.length) {
    /* The API re-parses the same query with the same normaliser, so the
       filters it searched on and the ones rendered as chips above cannot
       drift apart. `path` scopes the search to a landing route. */
    try {
      result = await discoveryApi.search({ ...query, ...(route ? { path: route.path } : {}) });
    } catch {
      failed = true;
    }
  }
  const registry = await registryInput;
  // Entertainment (time-booked venues) or farmhouse; a landing route decides, else the query.
  const vertical = route?.verticalCode ?? filters.vertical;
  const play = vertical !== 'farmhouse';
  const date = play ? filters.dates[0] : null;
  const messages = [...errors, ...(result.errors ?? [])];
  const path = route?.path || '/search';
  const href = (changes) => `${path}?${discoveryQuery(filters, { page: 1, ...changes })}`;
  const clearChip = (key) =>
    key === 'city'
      ? { city: '', area: '' }
      : {
          [key]:
            key === 'dates' || key === 'amenities'
              ? []
              : key === 'guests'
                ? 1
                : key === 'slot'
                  ? 'night'
                  : '',
        };
  const amenityNames = Object.fromEntries(registry.amenities.map((item) => [item.slug, item.name]));
  const chipLabels = {
    q: filters.q,
    city: registry.cities.find((item) => item.slug === filters.city)?.name,
    area: registry.areas.find(
      (item) =>
        item.slug === filters.area &&
        (!filters.city ||
          registry.cities.find((city) => city.slug === filters.city)?.id === item.cityId),
    )?.name,
    category: registry.categories.find((item) => item.slug === filters.category)?.name,
    dates: filters.dates.map(formatLocalDate).join(' · '),
    slot: slotLabels[filters.slot],
    guests: `${filters.guests} ${filters.guests === 1 ? 'guest' : 'guests'}`,
    min:
      filters.min != null
        ? `From ₹${filters.min.toLocaleString('en-IN')}${play ? ' / hr' : ''}`
        : null,
    max:
      filters.max != null
        ? `Up to ₹${filters.max.toLocaleString('en-IN')}${play ? ' / hr' : ''}`
        : null,
    players: filters.players ? `${filters.players} players` : null,
    indoor: filters.indoor == null ? null : filters.indoor ? 'Indoor' : 'Outdoor',
    cancellation: filters.cancellation
      ? `${filters.cancellation[0].toUpperCase() + filters.cancellation.slice(1)} cancellation`
      : null,
    amenities: filters.amenities.map((value) => amenityNames[value] || value).join(' · '),
  };
  // Fields the search bar already shows are not repeated as chips.
  const inBar = play
    ? ['city', 'area', 'dates', 'category', 'slot', 'guests']
    : ['city', 'area', 'dates', 'slot', 'guests'];
  const chips = Object.entries(chipLabels).filter(
    ([key, label]) =>
      label &&
      !inBar.includes(key) &&
      !(route?.[key] || (key === 'slot' && route?.intent?.slot)) &&
      !(key === 'guests' && filters.guests === 1) &&
      !(key === 'slot' && filters.slot === 'night'),
  );
  // Same rule as home: one shared price note below the grid instead of per card.
  const sharedPriceNote =
    result.items.length > 1 && result.items.every((l) => l.priceNote === result.items[0].priceNote)
      ? result.items[0].priceNote
      : null;
  const pill = cn(buttonVariants({ variant: 'outline' }), 'rounded-full px-5');
  // Nothing free, or no venue at all: where else has venues (only read when needed).
  const scopeSlug = route?.category?.slug ?? route?.vertical?.slug ?? filters.category;
  const otherCities =
    play && !failed && !messages.length && !result.total && !date
      ? (
          await Promise.all(
            registry.cities
              .filter((c) => c.slug !== (route?.city?.slug ?? filters.city))
              .map(async (c) => {
                const path = `/${c.slug}/${scopeSlug || 'entertainment'}`;
                const { count } = await degradeOnFailure(
                  () => discoveryApi.routeCount(path),
                  { count: 0 },
                  `venues in ${c.slug}`,
                );
                return count > 0 ? { ...c, path } : null;
              }),
          )
        ).filter(Boolean)
      : [];
  const cityName =
    route?.city?.name || registry.cities.find((c) => c.slug === filters.city)?.name || null;
  const activityName =
    route?.category?.name || registry.categories.find((c) => c.slug === filters.category)?.name;
  const locationChip =
    'inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border bg-card px-4 text-meta font-medium text-ink-700 transition-colors hover:border-brand-300 hover:bg-brand-50 hover:text-brand-800';
  return (
    <section className="mx-auto max-w-(--container-page) px-4 pt-3 pb-8 sm:px-6 sm:pb-12">
      {route?.title ? (
        <div className="pt-3 pb-4">
          <h1 className="text-h2">{route.title}</h1>
          {route.intent?.description && (
            <p className="mt-2 max-w-prose text-meta text-ink-600">{route.intent.description}</p>
          )}
        </div>
      ) : (
        <h1 className="sr-only">{play ? 'Search venues' : 'Search places'}</h1>
      )}
      <DiscoveryFilters
        key={JSON.stringify(query)}
        filters={filters}
        registry={registry}
        route={route}
        path={path}
        activeChips={
          chips.length ? (
            <div
              className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto"
              role="group"
              aria-label="Active filters"
            >
              {chips.map(([key, label]) => (
                <Link
                  key={key}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 text-tiny font-medium text-brand-900 transition-colors hover:bg-brand-100"
                  href={href(clearChip(key))}
                  aria-label={`Remove ${label}`}
                >
                  {label}
                  <X className="size-3.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          ) : null
        }
      />
      {messages.length > 0 && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-warning/30 bg-warning-bg p-4 sm:p-5"
        >
          <h2 className="text-h4">Check your filters</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-meta">
            {messages.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
          <Link className="mt-3 inline-flex font-semibold text-brand-700 underline" href={path}>
            Reset filters and try again
          </Link>
        </div>
      )}
      {failed ? (
        <div role="alert">
          <EmptyState
            tone="warning"
            icon={RefreshCw}
            title="Search is temporarily unavailable"
            description="Your filters are in the address bar. Please try again."
          >
            <a
              className={cn(buttonVariants(), 'rounded-full px-5')}
              href={href({ page: filters.page })}
            >
              Retry search
            </a>
          </EmptyState>
        </div>
      ) : (
        !messages.length && (
          <>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                {play ? (
                  <h2 className="text-h3">
                    {result.total} {result.total === 1 ? 'venue' : 'venues'}
                    {date ? ` with free times on ${formatLocalDate(date)}` : ''}
                  </h2>
                ) : (
                  <h2 className="text-h3">
                    {result.total} {result.total === 1 ? 'place' : 'places'}
                    {filters.dates.length ? ' matching every selected date' : ''}
                  </h2>
                )}
                {!play && filters.dates.length ? (
                  <p className="mt-1 text-tiny text-ink-600">
                    Prices include rent and the platform fee for every visit and guest. Refundable
                    deposits are shown separately.
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <SortSelect value={filters.sort} options={SEARCH_SORTS} />
                <noscript>
                  <button form="discovery-filters" className="min-h-10 text-brand-700 underline">
                    Apply
                  </button>
                </noscript>
              </div>
            </div>
            {!result.total && play && date ? (
              <EmptyState
                as="h3"
                icon={CalendarX}
                title={`Every court is booked on ${formatLocalDate(date)}${filters.start ? ` from ${clock12(filters.start)}` : ''}`}
                description="Times fill up fast in the evening. Try another time or day."
              >
                {filters.start ? (
                  <Link
                    className={cn(buttonVariants(), 'rounded-full px-5')}
                    href={href({ start: '' })}
                  >
                    Any time that day
                  </Link>
                ) : null}
                <Link className={pill} href={href({ dates: [addLocalDays(date, 1)] })}>
                  Next day
                </Link>
                {filters.duration > 60 ? (
                  <Link className={pill} href={href({ duration: 60 })}>
                    Try 1 hour
                  </Link>
                ) : null}
              </EmptyState>
            ) : null}
            {!result.total && play && !date ? (
              <EmptyState
                as="h3"
                icon={SearchX}
                title={
                  cityName
                    ? `No ${activityName ? `${activityName.toLowerCase()} ` : ''}venues in ${cityName} yet`
                    : 'No venues match these filters'
                }
                description={
                  otherCities.length
                    ? 'These cities have venues you can book now.'
                    : 'Courts and play zones are joining Rentra. Check back soon, or list yours.'
                }
              >
                {otherCities.map((c) => (
                  <Link key={c.slug} className={locationChip} href={c.path}>
                    <MapPin className="size-4" aria-hidden="true" />
                    {c.name}
                  </Link>
                ))}
                <Link className={pill} href="/partner/login">
                  List your venue
                </Link>
              </EmptyState>
            ) : null}
            {!result.total && !play && (
              <EmptyState
                as="h3"
                icon={SearchX}
                title="A different search could open up more places"
                description="No places match these filters. Try a different location, fewer amenities or other dates."
              >
                {filters.dates.length ? (
                  <Link
                    className={cn(buttonVariants(), 'rounded-full px-5')}
                    href={href({ dates: [] })}
                  >
                    Try without dates
                  </Link>
                ) : null}
                <Link className={pill} href={path}>
                  Clear filters
                </Link>
              </EmptyState>
            )}
            <div className="mt-4 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {result.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} showPriceNote={!sharedPriceNote} />
              ))}
            </div>
            {sharedPriceNote ? (
              <p className="mt-8 border-t border-border pt-4 text-tiny text-ink-600">
                {sharedPriceNote}
              </p>
            ) : null}
            {result.totalPages > 1 && (
              <nav
                aria-label="Search pagination"
                className="mt-8 flex flex-wrap items-center justify-center gap-3"
              >
                {result.page > 1 && (
                  <Link className={pill} href={href({ page: result.page - 1 })}>
                    <ArrowLeft aria-hidden="true" />
                    Previous
                  </Link>
                )}
                <span className="px-2 text-meta text-ink-600 tabular">
                  Page {result.page} of {result.totalPages}
                </span>
                {result.page < result.totalPages && (
                  <Link className={pill} href={href({ page: result.page + 1 })}>
                    Next
                    <ArrowRight aria-hidden="true" />
                  </Link>
                )}
              </nav>
            )}
          </>
        )
      )}
      <nav aria-labelledby="explore-locations" className="mt-12 border-t border-border pt-8">
        <h2 id="explore-locations" className="text-h4">
          {route?.city ? `More in ${route.city.name}` : 'Explore by location'}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {route?.city && (route.category || route.vertical) ? (
            <>
              {registry.areas
                .filter((a) => a.cityId === route.city.id)
                .map((a) => (
                  <Link
                    className={locationChip}
                    key={a.id}
                    href={areaDiscoveryPath(route.city.slug, scopeSlug, a.slug)}
                  >
                    <MapPin className="size-4" aria-hidden="true" />
                    {a.name}
                  </Link>
                ))}
              {intentsFor(route.verticalCode).map((i) => (
                <Link
                  className={locationChip}
                  key={i.slug}
                  href={intentDiscoveryPath(route.city.slug, scopeSlug, i.slug)}
                >
                  {i.label}
                </Link>
              ))}
            </>
          ) : (
            registry.cities.flatMap((c) =>
              registry.categories
                .filter((cat) => (cat.vertical ?? 'farmhouse') === vertical)
                .map((cat) => (
                  <Link
                    className={locationChip}
                    key={`${c.id}-${cat.id}`}
                    href={`/${c.slug}/${cat.slug}`}
                  >
                    <MapPin className="size-4" aria-hidden="true" />
                    {cat.name} in {c.name}
                  </Link>
                )),
            )
          )}
        </div>
      </nav>
    </section>
  );
}
