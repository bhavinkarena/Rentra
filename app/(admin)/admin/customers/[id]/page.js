import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { safeReturnPath } from '@/lib/domain/portal-state';
import PortalState from '@/components/portal/PortalState';
import { AdminCustomerDetail } from '@/components/admin/AdminCustomers';

export const metadata = { title: 'Customer', robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }) {
  const query = (await searchParams) ?? {};
  const listHref = safeReturnPath(query.from, '/admin/customers');
  const { data, failure } = await settle(adminApi.customer((await params).id));
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="Customers" />;
  return <AdminCustomerDetail data={data} listHref={listHref} tab={query.tab} params={query} />;
}
