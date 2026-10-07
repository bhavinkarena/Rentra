import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure } from '@/lib/api/resilient';
import { listingUrl } from '@/lib/domain/listing-url';
import { absolutePublicUrl } from '@/lib/domain/listing-content';
import { publicContent } from '@/lib/api/content';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
export default async function sitemap() {
  /**
   * A sitemap that cannot reach the API still has to be a valid sitemap.
   * It degrades to the handful of routes that exist regardless of data —
   * home, help and the policies — and regains the listing and location URLs
   * on the next revalidation. Failing the build instead would mean an
   * unreachable API blocks the deploy that fixes it.
   *
   * Landing routes (city × category or vertical × area or intent) with at
   * least 3 live listings come counted in the same response; asking per
   * route was 1,500+ requests and outlasted the build's 60-second limit.
   * An older API without `routes` leaves them out until it is redeployed.
   */
  const { listings, routes = [] } = await degradeOnFailure(
    () => discoveryApi.sitemap(),
    { listings: [] },
    'sitemap listings',
  );
  const policies = await Promise.all(
    ['terms', 'cancellation', 'privacy'].map((kind) =>
      degradeOnFailure(() => publicContent(kind), null, `sitemap policy ${kind}`),
    ),
  );
  return [
    { url: `${siteUrl}/`, changeFrequency: 'daily', priority: 1 },
    ...routes.map(({ path }) => ({
      url: `${siteUrl}${path}`,
      changeFrequency: 'daily',
      priority: 0.7,
    })),
    ...['/help', ...policies.filter(Boolean).map((p) => `/policies/${p.kind}/${p.version}`)].map(
      (path) => ({ url: `${siteUrl}${path}`, changeFrequency: 'monthly', priority: 0.4 }),
    ),
    ...listings.map((l) => ({
      url: listingUrl(siteUrl, l.slug, l.publicCode),
      lastModified: l.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.8,
      // Listing photos for Google Images; an older API sends none.
      images: (l.images ?? []).map((url) => absolutePublicUrl(siteUrl, url)).filter(Boolean),
    })),
  ];
}
