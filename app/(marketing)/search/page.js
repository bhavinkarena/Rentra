import DiscoveryResults from '@/components/rentra/DiscoveryResults';
import { getDiscoveryRegistry } from '@/lib/db/discovery';
export const metadata = { title: 'Find a place | Rentra', robots: { index: false, follow: true } };
export default async function SearchPage({ searchParams }) {
  return <DiscoveryResults query={await searchParams} registry={await getDiscoveryRegistry()} />;
}
