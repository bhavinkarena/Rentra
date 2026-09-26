import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
import { AdminSupportDetail } from '@/components/admin/AdminSupport';
export const metadata = { title: 'Support request', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const listHref = safeReturnPath((await searchParams)?.from, '/admin/support');
  const { data, failure } = await settle(adminApi.supportThread((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Support inbox" />;
  return <AdminSupportDetail record={data} listHref={listHref} />;
}
