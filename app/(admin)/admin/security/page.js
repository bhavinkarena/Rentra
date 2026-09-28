import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { OperatorDirectory } from '@/components/admin/OperatorSecurity';
export const metadata = { title: 'Operators & security' };
export default async function Page({ searchParams }) {
  const { data, failure } = await settle(
    api.get(`/admin/security?${new URLSearchParams(await searchParams)}`, { cache: 'no-store' }),
  );
  return failure ? <PortalState kind={failure} /> : <OperatorDirectory data={data} />;
}
