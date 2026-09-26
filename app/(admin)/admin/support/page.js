import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AdminSupportList } from '@/components/admin/AdminSupport';
export const metadata = { title: 'Support inbox', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const { data, failure } = await settle(adminApi.support(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Admin home" />;
  return <AdminSupportList data={data} />;
}
