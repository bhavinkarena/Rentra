import { publicMetadata } from '@/lib/seo/metadata';
import { notFound, permanentRedirect } from 'next/navigation';
import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { discoveryApi } from '@/lib/api/endpoints';
import { resolveDiscoveryRoute } from '@/lib/domain/discovery';

export async function generateMetadata({ params, searchParams }) {
  const { city, category, place = [] } = await params;
  const route = resolveDiscoveryRoute(await discoveryApi.registry(), [city, category, ...place]);
  const index =
    route &&
    !Object.keys(await searchParams).length &&
    (await discoveryApi.routeCount(route.path)).count >= 3;
  return route ? publicMetadata({ title: route.title, description: route.intent?.description || `Explore ${route.title}. Compare facilities and check all your visit dates.`, path: route.path, index: Boolean(index) }) : { title: 'Location not found', robots: { index: false } };
}
export default async function LocationPage({ params, searchParams }) {
  const { city, category, place = [] } = await params;
  const registry = await discoveryApi.registry();
  const route = resolveDiscoveryRoute(registry, [city, category, ...place]);
  if (!route) notFound();
  const query = await searchParams;
  if (place.length === 1) {
    const suffix = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : [value]) suffix.append(key, item);
    permanentRedirect(`${route.path}${suffix.size ? `?${suffix}` : ''}`);
  }
  return <DiscoveryResults query={query} registry={registry} route={route} />;
}
