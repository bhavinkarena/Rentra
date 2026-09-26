import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AdminClientList } from '@/components/admin/AdminClients';

export const metadata = { title: 'Clients', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const { q, status, page } = (await searchParams) ?? {};
  const { data, failure } = await settle(adminApi.clients({ q, status, page }));
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Admin home" />;
  return <AdminClientList data={data} />;
}
