import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { SupportDetail } from '@/components/customer/SupportRecords';
export const metadata = { title: 'Support conversation', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  await requireActiveClient();
  const { data, failure } = await settle(partnerApi.supportThread((await params).id));
  if (failure)
    return <PortalState kind={failure} backHref="/partner/support" backLabel="Support" />;
  return <SupportDetail record={data} owner />;
}
