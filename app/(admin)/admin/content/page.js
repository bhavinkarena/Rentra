import { api } from '@/lib/api/client';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import { ContentList } from '@/components/content/ContentEditor';
export const metadata = { title: 'Public content', robots: { index: false, follow: false } };
export default async function Page() {
  const { data, failure } = await settle(api.get('/admin/content', { cache: 'no-store' }));
  return failure ? <PortalState kind={failure} /> : <ContentList data={data} />;
}
