import { permanentRedirect, redirect } from 'next/navigation';
import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
export const metadata = { title: 'Find a place', robots: { index: false, follow: true } };

/** The query as URL parameters, repeated keys kept. */
function params(query, changes = {}) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...query, ...changes }))
    for (const item of [].concat(value)) out.append(key, item);
  return out;
}
// Parameters a venue search bar always sends, at their defaults, mean "nothing chosen".
const IDLE = {
  vertical: ['entertainment'],
  area: [''],
  date: [''],
  start: [''],
  duration: ['', '60'],
};

export default async function SearchPage({ searchParams }) {
  const query = await searchParams;
  const registry = degradeOnFailure(
    () => discoveryApi.registry(),
    EMPTY_REGISTRY,
    'search registry',
  );
  if (query.category || query.vertical) {
    const { cities, categories } = await registry;
    const category = categories.find((c) => c.slug === query.category);
    // A category implies its vertical, so each search has one canonical URL (308).
    if (category?.vertical && category.vertical !== (query.vertical || 'farmhouse'))
      permanentRedirect(`/search?${params(query, { vertical: category.vertical })}`);
    // A venue search for just a city and an activity is that landing page.
    const onlyPlace = Object.entries(query).every(
      ([key, value]) =>
        ['city', 'category'].includes(key) ||
        (typeof value === 'string' && IDLE[key]?.includes(value)),
    );
    if (
      query.vertical === 'entertainment' &&
      onlyPlace &&
      category?.vertical === 'entertainment' &&
      cities.some((c) => c.slug === query.city)
    )
      redirect(`/${query.city}/${category.slug}`);
  }
  return <DiscoveryResults query={query} registry={registry} />;
}
