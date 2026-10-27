import PortalState from '@/components/portal/PortalState';
import PayoutModePanel from '@/components/admin/PayoutModePanel';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Payout mode', robots: { index: false, follow: false } };
export default async function Page() {
  const { data, failure } = await settle(adminApi.payoutModes());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <PayoutModePanel data={data} />;
}
