import { notFound, redirect } from 'next/navigation';
import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { getDiscoveryRegistry, countDiscoveryRoute } from '@/lib/db/discovery';
import { resolveDiscoveryRoute } from '@/lib/domain/discovery';

export async function generateMetadata({ params, searchParams }) {
  const { city, category, place = [] } = await params;
  const route = resolveDiscoveryRoute(await getDiscoveryRegistry(), [city, category, ...place]);
  const index = route && !Object.keys(await searchParams).length && await countDiscoveryRoute(route) >= 3;
  return route ? { title: `${route.title} | Rentra`, description: route.intent?.description || `Explore ${route.title}. Compare facilities and check all your visit dates.`, alternates: { canonical: route.path }, robots: { index: Boolean(index), follow: true } } : { title: 'Location not found', robots: { index: false } };
}
export default async function LocationPage({ params, searchParams }) {
  const { city, category, place = [] } = await params;
  const registry = await getDiscoveryRegistry();
  const route = resolveDiscoveryRoute(registry, [city, category, ...place]);
  if (!route) notFound();
  const query = await searchParams;
  if (place.length === 1) {
    const suffix = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) for (const item of Array.isArray(value) ? value : [value]) suffix.append(key, item);
    redirect(`${route.path}${suffix.size ? `?${suffix}` : ''}`);
  }
  return <DiscoveryResults query={query} registry={registry} route={route} />;
}
