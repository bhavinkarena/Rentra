import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { ContentEditor } from '@/components/content/ContentEditor';
import { notFound } from 'next/navigation';
export const metadata = { title: 'Content editor', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const { kind } = await params;
  if (!['terms', 'privacy', 'cancellation', 'help', 'contact', 'owner_help'].includes(kind))
    notFound();
  const { data, failure } = await settle(
    api.get(`/admin/content/${kind}?${new URLSearchParams(await searchParams)}`, {
      cache: 'no-store',
    }),
  );
  return failure ? (
    <PortalState kind={failure} />
  ) : (
    <ContentEditor key={kind + data.draft.version} data={data} />
  );
}
