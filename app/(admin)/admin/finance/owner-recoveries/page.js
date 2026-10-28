import PortalState from '@/components/portal/PortalState';
import OwnerRecoveries from '@/components/admin/OwnerRecoveries';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = {
  title: 'Owner recoveries (Test)',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const { data, failure } = await settle(adminApi.ownerRecoveries());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <OwnerRecoveries data={data} />;
}
