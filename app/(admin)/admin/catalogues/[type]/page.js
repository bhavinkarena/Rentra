import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { CatalogueList, VerticalList } from '@/components/catalogues/Catalogues';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Catalogues', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const { type } = await params;
  if (!['cities', 'areas', 'categories', 'amenities', 'verticals'].includes(type)) notFound();
  const query = await searchParams;
  const { data, failure } = await settle(
    api.get(`/admin/catalogues/${type}?${new URLSearchParams(query)}`, { cache: 'no-store' }),
  );
  if (failure) return <PortalState kind={failure} />;
  return type === 'verticals' ? <VerticalList data={data} /> : <CatalogueList data={data} />;
}
