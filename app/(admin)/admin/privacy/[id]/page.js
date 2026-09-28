import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { PrivacyDetail } from '@/components/admin/PrivacyFulfillment';
export const metadata = { title: 'Privacy fulfillment' };
export default async function Page({ params }) {
  const { id } = await params;
  const { data, failure } = await settle(
    api.get(`/admin/privacy/requests/${encodeURIComponent(id)}`, { cache: 'no-store' }),
  );
  return failure ? <PortalState kind={failure} /> : <PrivacyDetail data={data} />;
}
