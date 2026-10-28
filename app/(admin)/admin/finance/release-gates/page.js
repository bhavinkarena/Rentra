import PortalState from '@/components/portal/PortalState';
import ReleaseGates from '@/components/admin/ReleaseGates';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = {
  title: 'Financial release gates',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const { data, failure } = await settle(adminApi.releaseGates());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <ReleaseGates data={data} />;
}
