import { getSitemapEntries } from '@/lib/db/queries';
import { getDiscoveryRegistry, countDiscoveryRoute } from '@/lib/db/discovery';
import { resolveDiscoveryRoute, DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import { listingUrl } from '@/lib/domain/listing-url';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export default async function sitemap() {
  const [{ listings }, registry] = await Promise.all([getSitemapEntries(), getDiscoveryRegistry()]);
  const routes = [];
  for (const city of registry.cities) for (const category of registry.categories) {
    const base = [city.slug, category.slug];
    const segments = [base, ...registry.areas.filter(a => a.cityId === city.id).map(a => [...base, 'area', a.slug]), ...DISCOVERY_INTENTS.map(i => [...base, 'intent', i.slug])];
    for (const parts of segments) {
      const route = resolveDiscoveryRoute(registry, parts);
      if (route && await countDiscoveryRoute(route) >= 3) routes.push({ url: `${siteUrl}${route.path}`, changeFrequency: 'daily', priority: 0.7 });
    }
  }
  return [{ url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 }, ...routes,
    ...listings.map(l => ({ url: listingUrl(siteUrl, l.slug, l.publicCode), lastModified: l.updatedAt, changeFrequency: 'weekly', priority: 0.8 }))];
}
