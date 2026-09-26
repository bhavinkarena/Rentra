import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
import { AdminClientDetail } from '@/components/admin/AdminClients';

export const metadata = { title: 'Client', robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }) {
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/admin/clients');
  const { data, failure } = await settle(adminApi.client((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Clients" />;
  return <AdminClientDetail data={data} listHref={listHref} tab={query.tab} params={query} />;
}
