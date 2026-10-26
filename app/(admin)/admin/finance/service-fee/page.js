import PortalState from '@/components/portal/PortalState';
import ServiceFeePanel from '@/components/admin/ServiceFeePanel';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Service fee', robots: { index: false, follow: false } };

export default async function Page() {
  const { data, failure } = await settle(adminApi.serviceFees());
  if (failure) return <PortalState kind={failure} backHref="/admin/finance" backLabel="Finance" />;
  return <ServiceFeePanel data={data} />;
}
