import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { OperatorDetail } from '@/components/admin/OperatorSecurity';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Operator security' };
export default async function Page({ params }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const { data, failure } = await settle(api.get(`/admin/security/${id}`, { cache: 'no-store' }));
  return failure ? <PortalState kind={failure} /> : <OperatorDetail key={id} data={data} />;
}
