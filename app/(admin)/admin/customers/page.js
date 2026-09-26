import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { AdminCustomerList } from '@/components/admin/AdminCustomers';

export const metadata = { title: 'Customers', robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const { q, status, page } = (await searchParams) ?? {};
  const { data, failure } = await settle(adminApi.customers({ q, status, page }));
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Admin home" />;
  return <AdminCustomerList data={data} />;
}
