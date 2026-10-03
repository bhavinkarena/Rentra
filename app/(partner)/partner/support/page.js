import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import RequestInbox from '@/components/partner/help/RequestInbox';
export const metadata = { title: 'Help & support', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  await requireClient();
  const { data, failure } = await settle(partnerApi.support(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return <RequestInbox data={data} />;
}
