import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { PrivacyDirectory } from '@/components/admin/PrivacyFulfillment';
export const metadata = { title: 'Customer privacy requests' };
export default async function Page({ searchParams }) {
  const { data, failure } = await settle(
    api.get(`/admin/privacy/requests?${new URLSearchParams(await searchParams)}`, {
      cache: 'no-store',
    }),
  );
  return failure ? <PortalState kind={failure} /> : <PrivacyDirectory data={data} />;
}
