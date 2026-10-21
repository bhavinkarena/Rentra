import { notFound } from 'next/navigation';
import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { publicMetadata } from '@/lib/seo/metadata';
import { discoveryApi } from '@/lib/api/endpoints';

/** Landmark landing (hotel plan §4.1): hotels within 5 km of e.g. Surat Railway Station. */
async function landmarkOf(slug) {
  const registry = await discoveryApi.registry();
  const landmark = (registry.landmarks ?? []).find((item) => item.slug === slug);
  return { registry, landmark };
}

export async function generateMetadata({ params, searchParams }) {
  const { landmark: slug } = await params;
  const { landmark } = await landmarkOf(slug);
  if (!landmark) return { title: 'Landmark not found', robots: { index: false } };
  // Thin pages stay out of the index: the same 3-hotel floor as the sitemap.
  const result = Object.keys(await searchParams).length
    ? null
    : await discoveryApi.search({ vertical: 'hotel', near: slug }).catch(() => null);
  return publicMetadata({
    title: `Hotels near ${landmark.name}`,
    description: `Hotels within 5 km of ${landmark.name}: compare rooms, distance and total prices with taxes for your dates.`,
    path: `/hotels/near/${slug}`,
    index: (result?.total ?? 0) >= 3,
  });
}

export default async function LandmarkPage({ params, searchParams }) {
  const { landmark: slug } = await params;
  const { registry, landmark } = await landmarkOf(slug);
  if (!landmark) notFound();
  const query = await searchParams;
  const city = registry.cities.find((item) => item.id === landmark.cityId);
  return (
    <DiscoveryResults
      query={{ ...query, vertical: 'hotel', near: slug }}
      registry={registry}
      route={{
        path: `/hotels/near/${slug}`,
        title: `Hotels near ${landmark.name}`,
        verticalCode: 'hotel',
        landmark: { ...landmark, cityName: city?.name },
        intent: {
          description: `Hotels within 5 km of ${landmark.name}${city ? `, ${city.name}` : ''}. Add dates for total prices with taxes.`,
        },
      }}
    />
  );
}
