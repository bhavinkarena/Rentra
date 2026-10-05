import { requireAdmin } from '@/lib/api/session';
import { DisputeList } from '@/components/disputes/Disputes';
import { disputesApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Disputes', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const admin = await requireAdmin();
  const { data, failure } = await settle(disputesApi.list('admin', await searchParams));
  if (failure) return <PortalState kind={failure} />;
  return (
    <DisputeList
      kind="admin"
      data={data}
      canWrite={admin.capabilities.includes('admin.payments.write')}
    />
  );
}
