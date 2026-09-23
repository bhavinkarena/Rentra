import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { discoveryApi } from '@/lib/api/endpoints';
import { degradeOnFailure, EMPTY_REGISTRY } from '@/lib/api/resilient';
export const metadata = { title: 'Find a place', robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }) {
  return (
    <DiscoveryResults
      query={await searchParams}
      registry={await degradeOnFailure(
        () => discoveryApi.registry(),
        EMPTY_REGISTRY,
        'search registry',
      )}
    />
  );
}
