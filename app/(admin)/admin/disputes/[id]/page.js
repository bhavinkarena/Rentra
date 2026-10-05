import { requireAdmin } from '@/lib/api/session';
import { DisputeDetail } from '@/components/disputes/Disputes';
import { disputesApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Disputes', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const admin = await requireAdmin();
  const { data, failure } = await settle(disputesApi.detail('admin', (await params).id));
  if (failure) return <PortalState kind={failure} />;
  return (
    <DisputeDetail
      kind="admin"
      data={data}
      canRefund={admin.capabilities.includes('admin.payments.write')}
      canReadRecords={admin.capabilities.includes('admin.records.read')}
    />
  );
}
