import { getSitemapEntries } from '@/lib/db/queries';
import { listingUrl } from '@/lib/domain/listing-url';
import { INTENTS } from '@/lib/constants';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

/**
 * Generated from the database, never hand-maintained.
 * Split into a sitemap index via generateSitemaps() once past ~50k URLs.
 */
export default async function sitemap() {
  const { listings, cities, areas } = await getSitemapEntries();
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },

    ...cities.map((c) => ({
      url: `${siteUrl}/${c.slug}/farmhouse`,
      lastModified: now, changeFrequency: 'daily', priority: 0.9,
    })),

    ...areas.map((a) => ({
      url: `${siteUrl}/${a.citySlug}/farmhouse/${a.areaSlug}`,
      lastModified: now, changeFrequency: 'daily', priority: 0.8,
    })),

    ...cities.flatMap((c) => INTENTS.map((i) => ({
      url: `${siteUrl}/${c.slug}/farmhouse/${i.slug}`,
      lastModified: now, changeFrequency: 'weekly', priority: 0.7,
    }))),

    ...listings.map((l) => ({
      url: listingUrl(siteUrl, l.slug, l.publicCode),
      lastModified: l.updatedAt ?? now, changeFrequency: 'weekly', priority: 0.8,
    })),
  ];
}
