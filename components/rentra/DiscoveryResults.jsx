import Link from 'next/link';
import ListingCard from './ListingCard';
import DiscoveryFilters from './DiscoveryFilters';
import { formatLocalDate } from '@/lib/domain/booking-dates';
import { parseDiscoveryQuery, discoveryQuery, SEARCH_SORTS, areaDiscoveryPath, intentDiscoveryPath, DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import { searchDiscovery } from '@/lib/db/discovery';

const slotLabels = { day: 'Day visit', night: 'Overnight', full_day: 'Full day' };
export default async function DiscoveryResults({ query, registry, route = null }) {
  const { filters, errors } = parseDiscoveryQuery({ ...query, ...(route?.intent?.slot && !query.slot ? { slot: route.intent.slot } : {}) });
  let result = { items: [], total: 0, totalPages: 1, page: 1, errors: [] }, failed = false;
  if (!errors.length) {
    try { result = await searchDiscovery(filters, route, undefined, registry); }
    catch { failed = true; }
  }
  const messages = [...errors, ...result.errors];
  const path = route?.path || '/search';
  const href = changes => `${path}?${discoveryQuery(filters, { page: 1, ...changes })}`;
  const clearChip = key => key === 'city' ? { city: '', area: '' }
    : { [key]: key === 'dates' || key === 'amenities' ? [] : key === 'guests' ? 1 : key === 'slot' ? 'night' : '' };
  const amenityNames = Object.fromEntries(registry.amenities.map(item => [item.slug, item.name]));
  const chipLabels = {
    q: filters.q,
    city: registry.cities.find(item => item.slug === filters.city)?.name,
    area: registry.areas.find(item => item.slug === filters.area && (!filters.city || registry.cities.find(city => city.slug === filters.city)?.id === item.cityId))?.name,
    category: registry.categories.find(item => item.slug === filters.category)?.name,
    dates: filters.dates.map(formatLocalDate).join(' · '),
    slot: slotLabels[filters.slot],
    guests: `${filters.guests} ${filters.guests === 1 ? 'guest' : 'guests'}`,
    min: filters.min != null ? `From ₹${filters.min.toLocaleString('en-IN')}` : null,
    max: filters.max != null ? `Up to ₹${filters.max.toLocaleString('en-IN')}` : null,
    cancellation: filters.cancellation ? `${filters.cancellation[0].toUpperCase() + filters.cancellation.slice(1)} cancellation` : null,
    amenities: filters.amenities.map(value => amenityNames[value] || value).join(' · '),
  };
  const chips = Object.entries(chipLabels).filter(([key, label]) => label && !(route?.[key] || (key === 'slot' && route?.intent?.slot)) && !(key === 'guests' && filters.guests === 1) && !(key === 'slot' && filters.slot === 'night'));
  return <section className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6">
    <h1 className="text-h1">{route?.title || 'Find a place'}</h1>
    <p className="mt-2 text-ink-600">{route?.intent?.description || 'Compare places by location, facilities and your visit dates.'}</p>
    <DiscoveryFilters key={JSON.stringify(query)} filters={filters} registry={registry} route={route} path={path} />
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">{chips.map(([key, label]) => <Link key={key} className="inline-flex min-h-10 items-center rounded-full bg-brand-50 px-3 text-meta text-brand-900" href={href(clearChip(key))} aria-label={`Remove ${label}`}>{label} ×</Link>)}</div>
    {messages.length > 0 && <div role="alert" className="mt-6 rounded-md border border-border p-4"><h2 className="text-h3">Check your filters</h2><ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul><Link className="underline" href={path}>Reset filters and try again</Link></div>}
    {failed ? <div role="alert" className="mt-6"><h2 className="text-h3">Search is temporarily unavailable</h2><p>Your filters are in the address bar. Please try again.</p><a className="underline" href={href({ page: filters.page })}>Retry search</a></div> : !messages.length && <>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3"><h2 className="text-h3">{result.total} {result.total === 1 ? 'place' : 'places'}{filters.dates.length ? ' matching every selected date' : ''}</h2>
        {/* Associated with the filters form by id rather than duplicating every
            filter as a hidden input here — one submit carries sort and filters
            together, so changing either cannot silently discard the other. */}
        <div><label className="text-meta font-medium">Sort <select form="discovery-filters" aria-label="Sort" name="sort" defaultValue={filters.sort} className="ml-2 min-h-11 rounded-md border border-border bg-white px-3">{Object.entries(SEARCH_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button form="discovery-filters" className="ml-2 min-h-11 text-brand-700 underline">Apply</button></div>
      </div>
      {!result.total && <p className="mt-3">No places match these filters. <Link className="underline" href={href({ dates: [] })}>Try without dates</Link> or <Link className="underline" href={path}>clear filters</Link>.</p>}
      <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{result.items.map(listing => <ListingCard key={listing.id} listing={listing} />)}</div>
      {result.totalPages > 1 && <nav aria-label="Search pagination" className="mt-8 flex flex-wrap gap-5">{result.page > 1 && <Link href={href({ page: result.page - 1 })}>Previous</Link>}<span>Page {result.page} of {result.totalPages}</span>{result.page < result.totalPages && <Link href={href({ page: result.page + 1 })}>Next</Link>}</nav>}
    </>}
    <nav aria-label="Explore locations" className="mt-10 flex flex-wrap gap-4">{route?.city && route?.category ? <>
      {registry.areas.filter(a => a.cityId === route.city.id).map(a => <Link className="underline" key={a.id} href={areaDiscoveryPath(route.city.slug, route.category.slug, a.slug)}>{a.name}</Link>)}
      {DISCOVERY_INTENTS.map(i => <Link className="underline" key={i.slug} href={intentDiscoveryPath(route.city.slug, route.category.slug, i.slug)}>{i.label}</Link>)}
    </> : registry.cities.flatMap(c => registry.categories.map(cat => <Link className="underline" key={`${c.id}-${cat.id}`} href={`/${c.slug}/${cat.slug}`}>{cat.name} in {c.name}</Link>))}</nav>
  </section>;
}
