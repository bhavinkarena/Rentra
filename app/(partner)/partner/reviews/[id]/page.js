import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import ReviewDetail from '@/components/customer/ReviewDetail';

export const metadata = { title: 'Review detail', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  const canWrite = true;
  const { data, failure } = await settle(partnerApi.reviewDetail((await params).id));
  if (failure)
    return <PortalState kind={failure} backHref="/partner/reviews" backLabel="Reviews" />;
  return <ReviewDetail record={data} admin={false} canWrite={canWrite} />;
}
