import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import Queue from '@/components/customer/ReviewQueue';
export const metadata = { title: 'Reviews', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const { data, failure } = await settle(partnerApi.reviews(await searchParams));
  if (failure) return <PortalState kind={failure} backHref="/partner" />;
  return <Queue data={data} />;
}
