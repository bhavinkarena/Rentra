import Link from 'next/link';
import ListingCard from './ListingCard';
import SearchDates from './SearchDates';
import { propertyToday, addLocalDays } from '@/lib/domain/booking-dates';
import { parseDiscoveryQuery, discoveryQuery, SEARCH_SORTS, areaDiscoveryPath, intentDiscoveryPath, DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import { searchDiscovery } from '@/lib/db/discovery';

const inputClass = 'mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-ink-900';
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
  const chips = Object.entries(filters).filter(([k, v]) => !['mode', 'sort', 'page'].includes(k) && !(route?.[k] || (k === 'slot' && route?.intent?.slot)) && v != null && v !== '' && (!Array.isArray(v) || v.length) && !(k === 'guests' && v === 1) && !(k === 'slot' && v === 'night'));
  return <section className="mx-auto max-w-(--container-page) px-4 py-10 sm:px-6">
    <h1 className="text-h1">{route?.title || 'Find a place'}</h1>
    <p className="mt-2 text-ink-600">{route?.intent?.description || 'Compare places by location, facilities and your visit dates.'}</p>
    <form key={JSON.stringify(query)} action={path} className="mt-6 grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label>Location or place<input className={inputClass} name="q" defaultValue={filters.q} maxLength={100} /></label>
      {!route?.city && <label>City<select aria-label="City" name="city" defaultValue={filters.city} className={inputClass}><option value="">All cities</option>{registry.cities.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}</select></label>}
      {!route?.area && <label>Area<select aria-label="Area" name="area" defaultValue={filters.area} className={inputClass}><option value="">{route?.city || filters.city ? 'All areas' : 'Choose a city and apply first'}</option>{registry.areas.filter(r => r.cityId === (route?.city?.id || registry.cities.find(c => c.slug === filters.city)?.id)).map(r => <option key={r.id} value={r.slug}>{r.name} · {registry.cities.find(c => c.id === r.cityId)?.name}</option>)}</select></label>}
      {!route?.category && <label>Category<select aria-label="Category" name="category" defaultValue={filters.category} className={inputClass}><option value="">All categories</option>{registry.categories.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}</select></label>}
      <SearchDates mode={filters.mode} dates={filters.dates} today={propertyToday()} lastDate={addLocalDays(propertyToday(), 365)} />
      <label>Slot<select aria-label="Slot" name="slot" defaultValue={filters.slot} className={inputClass}>{(route?.intent?.slot ? ['day'] : ['day', 'night', 'full_day']).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></label>
      <label>Guests<input type="number" name="guests" min="1" max="500" defaultValue={filters.guests} className={inputClass} /></label>
      <label>Minimum budget (₹)<input name="min" type="number" min="0" max="100000000" defaultValue={filters.min ?? ''} className={inputClass} /></label>
      <label>Maximum budget (₹)<input name="max" type="number" min="0" max="100000000" defaultValue={filters.max ?? ''} className={inputClass} /></label>
      <label>Cancellation policy<select aria-label="Cancellation policy" name="cancellation" defaultValue={filters.cancellation} className={inputClass}><option value="">Any policy</option>{['flexible','moderate','strict'].map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      <label>Sort<select aria-label="Sort" name="sort" defaultValue={filters.sort} className={inputClass}>{Object.entries(SEARCH_SORTS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset className="sm:col-span-2 lg:col-span-4"><legend>Amenities · choose up to 10</legend><div className="mt-2 flex flex-wrap gap-4">{registry.amenities.map(r => <label className="flex items-center gap-2" key={r.slug}><input type="checkbox" name="amenities" value={r.slug} defaultChecked={filters.amenities.includes(r.slug)} />{r.name}</label>)}</div></fieldset>
      <p id="search-dates-help" className="text-tiny text-ink-600 sm:col-span-2">Choose up to 10 visits. In separate mode, enter visit-start dates separated by commas. Each consecutive date is a separate visit with its own slot hours. With dates, budget and price sorting use the total rent plus platform fee for all visits and guests; refundable deposits are separate. Without dates, they use base rent per selected slot.</p>
      <button className="rounded-full bg-brand-600 px-5 py-3 font-semibold text-white" type="submit">Apply filters</button>
      <Link href={path} className="self-center underline">Clear all filters</Link>
    </form>
    <div className="mt-4 flex flex-wrap gap-2" aria-label="Active filters">{chips.map(([key, value]) => <Link key={key} className="rounded-full bg-brand-50 px-3 py-2 text-meta" href={href({ [key]: key === 'dates' || key === 'amenities' ? [] : key === 'guests' ? 1 : key === 'slot' ? 'night' : '' })} aria-label={`Remove ${key} filter`}>{key}: {Array.isArray(value) ? value.join(', ') : value} ×</Link>)}</div>
    {messages.length > 0 && <div role="alert" className="mt-6 rounded-md border border-border p-4"><h2 className="text-h3">Check your filters</h2><ul>{messages.map((m, i) => <li key={i}>{m}</li>)}</ul><Link className="underline" href={path}>Reset filters and try again</Link></div>}
    {failed ? <div role="alert" className="mt-6"><h2 className="text-h3">Search is temporarily unavailable</h2><p>Your filters are in the address bar. Please try again.</p><a className="underline" href={href({ page: filters.page })}>Retry search</a></div> : !messages.length && <>
      <h2 className="mt-8 text-h3">{result.total} {result.total === 1 ? 'place' : 'places'}{filters.dates.length ? ' matching every selected date' : ''}</h2>
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
