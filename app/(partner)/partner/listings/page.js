import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import PartnerListingsView from '@/components/partner/PartnerListingsView';
import PartnerListingsScreen from '@/components/partner/PartnerListingsScreen';
import { normalizeListings } from '@/lib/partner/query-args';
import { partnerCacheEnabled } from '@/lib/partner/flags';
export const metadata = {
  title: 'Your properties',
  robots: { index: false, follow: false, nocache: true },
};
export default async function ListingsPage({ searchParams }) {
  const user = await requireClient();
  const params = await searchParams;
  const args = normalizeListings(params);
  if (partnerCacheEnabled() && user.cacheScope)
    return (
      <PartnerListingsScreen
        scope={user.cacheScope}
        args={args}
        deleted={Boolean(params?.deleted)}
        submitted={Boolean(params?.submitted)}
      />
    );
  const [summary, result] = await Promise.all([partnerApi.summary(), partnerApi.listings(args)]);
  return (
    <PartnerListingsView
      summary={summary}
      result={result}
      args={args}
      deleted={Boolean(params?.deleted)}
      submitted={Boolean(params?.submitted)}
    />
  );
}
