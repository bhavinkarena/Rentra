import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { SupportList } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Client support', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  await requireActiveClient();
  const { data, failure } = await settle(partnerApi.support(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/partner" backLabel="Overview" />;
  return <SupportList data={data} owner />;
}
