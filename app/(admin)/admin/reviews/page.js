import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import Queue from '@/components/admin/AdminReviewQueue';
export const metadata = { title: 'Reviews', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const query = await searchParams;
  const { data, failure } = await settle(
    adminApi.reviews({
      page: query?.page,
      tab: query?.tab === 'auto_published' ? 'auto_published' : undefined,
    }),
  );
  if (failure) return <PortalState kind={failure} backHref="/admin" />;
  return <Queue data={data} />;
}
