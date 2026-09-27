import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import ReviewDetail from '@/components/customer/ReviewDetail';
import { requireAdmin } from '@/lib/api/session';
export const metadata = { title: 'Review detail', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  const actor = await requireAdmin();
  const canWrite = actor.capabilities?.includes('admin.reviews.write');
  const { data, failure } = await settle(adminApi.reviewDetail((await params).id));
  if (failure) return <PortalState kind={failure} backHref="/admin/reviews" backLabel="Reviews" />;
  return <ReviewDetail record={data} admin={true} canWrite={canWrite} />;
}
