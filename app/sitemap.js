import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
import { resolveDiscoveryRoute, DISCOVERY_INTENTS } from '@/lib/domain/discovery';
import { listingUrl } from '@/lib/domain/listing-url';
import { POLICY_VERSION } from '@/lib/domain/help';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export default async function sitemap() {
  /**
   * A sitemap that cannot reach the API still has to be a valid sitemap.
   * It degrades to the handful of routes that exist regardless of data —
   * home, help and the policies — and regains the listing and location URLs
   * on the next revalidation. Failing the build instead would mean an
   * unreachable API blocks the deploy that fixes it.
   */
  const [{ listings }, registry] = await Promise.all([
    degradeOnFailure(() => discoveryApi.sitemap(), { listings: [] }, 'sitemap listings'),
    degradeOnFailure(() => discoveryApi.registry(), EMPTY_REGISTRY, 'sitemap registry'),
  ]);
  const routes = [];
  for (const city of registry.cities) for (const category of registry.categories) {
    const base = [city.slug, category.slug];
    const segments = [base, ...registry.areas.filter(a => a.cityId === city.id).map(a => [...base, 'area', a.slug]), ...DISCOVERY_INTENTS.map(i => [...base, 'intent', i.slug])];
    for (const parts of segments) {
      const route = resolveDiscoveryRoute(registry, parts);
      if (!route) continue;
      /* A route whose count cannot be read is left out rather than
         published as an indexable page we know nothing about. */
      const { count } = await degradeOnFailure(
        () => discoveryApi.routeCount(route.path),
        { count: 0 },
        `sitemap route count ${route.path}`,
      );
      if (count >= 3) routes.push({ url: `${siteUrl}${route.path}`, changeFrequency: 'daily', priority: 0.7 });
    }
  }
  return [{ url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 }, ...routes,
    ...['/help', ...['terms','cancellation','privacy'].map(kind => `/policies/${kind}/${POLICY_VERSION}`)].map(path => ({ url: `${siteUrl}${path}`, changeFrequency: 'monthly', priority: 0.4 })),
    ...listings.map(l => ({ url: listingUrl(siteUrl, l.slug, l.publicCode), lastModified: l.updatedAt, changeFrequency: 'weekly', priority: 0.8 }))];
}
