import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import ReviewDetail from '@/components/customer/ReviewDetail';
import { requireAdmin } from '@/lib/api/session';
import { safeReturnPath } from '@/lib/domain/portal-state';
export const metadata = { title: 'Review detail', robots: { index: false, follow: false } };
export default async function Page({ params, searchParams }) {
  const listHref = safeReturnPath((await searchParams)?.from, '/admin/reviews');
  const actor = await requireAdmin();
  const canWrite = actor.capabilities?.includes('admin.reviews.write');
  const { data, failure } = await settle(adminApi.reviewDetail((await params).id));
  if (failure) return <PortalState kind={failure} backHref="/admin/reviews" backLabel="Reviews" />;
  return (
    <ReviewDetail
      record={data}
      admin={true}
      canWrite={canWrite}
      capabilities={actor.capabilities}
      listHref={listHref}
    />
  );
}
