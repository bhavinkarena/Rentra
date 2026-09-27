import { NewDispute } from '@/components/disputes/Disputes';
import { disputesApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Open dispute', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const order = (await searchParams)?.order;
  if (!order) return <NewDispute kind="admin" />;
  const { data, failure } = await settle(disputesApi.context('admin', order));
  if (failure) return <PortalState kind={failure} />;
  return <NewDispute kind="admin" context={data} />;
}
