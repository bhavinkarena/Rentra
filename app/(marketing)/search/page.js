import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { discoveryApi } from '@/lib/api/endpoints';
export const metadata = { title: 'Find a place', robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }) {
  return <DiscoveryResults query={await searchParams} registry={await discoveryApi.registry()} />;
}
