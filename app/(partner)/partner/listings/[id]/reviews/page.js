import PortalState from '@/components/portal/PortalState';
import PropertyHub from '@/components/partner/property/PropertyHub';
import Queue from '@/components/customer/ReviewQueue';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import { loadPropertyHub } from '@/lib/partner/property-hub';

export const metadata = { title: 'Property reviews', robots: { index: false, follow: false } };

/** This property's guest reviews (Phase 6 §6.1). */
export default async function PropertyReviewsPage(props) {
  const { failure, hub, id, query, listHref } = await loadPropertyHub(props);
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;
  const reviews = await settle(partnerApi.reviews({ page: query.page, property: id }));
  return (
    <div className="mx-auto w-full max-w-300 px-4 py-6 sm:px-6 sm:py-8">
      <PropertyHub {...hub} active="reviews" />
      <div className="mt-6">
        {reviews.failure ? (
          <PortalState kind={reviews.failure} backHref={listHref} backLabel="All properties" />
        ) : (
          <Queue data={reviews.data} embedded />
        )}
      </div>
    </div>
  );
}
