import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { CatalogueDetail } from '@/components/catalogues/Catalogues';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Catalogue record', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  const { type, id } = await params;
  if (
    !['cities', 'areas', 'categories', 'amenities'].includes(type) ||
    !/^(new|[0-9a-f-]{36})$/.test(id)
  )
    notFound();
  const { data, failure } = await settle(
    api.get(`/admin/catalogues/${type}/${id}`, { cache: 'no-store' }),
  );
  if (failure) return <PortalState kind={failure} />;
  return <CatalogueDetail key={id} data={data} />;
}
