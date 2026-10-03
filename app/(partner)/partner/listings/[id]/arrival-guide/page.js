import PortalState from '@/components/portal/PortalState';
import PropertyHub from '@/components/partner/property/PropertyHub';
import ArrivalGuideForm from '@/components/partner/ArrivalGuideForm';
import { loadPropertyHub } from '@/lib/partner/property-hub';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';

export const metadata = { title: 'Arrival guide', robots: { index: false, follow: false } };

/** BOOK-08: what confirmed guests receive by SMS a day before and on the morning of arrival. */
export default async function ArrivalGuidePage(props) {
  const { failure, hub, listHref, id } = await loadPropertyHub(props);
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;
  const guide = await settle(partnerApi.arrivalGuide(id));
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PropertyHub {...hub} active="arrival" />
      <div className="mt-6">
        {guide.failure ? (
          <PortalState kind={guide.failure} backHref={listHref} backLabel="All properties" />
        ) : (
          <ArrivalGuideForm data={guide.data} />
        )}
      </div>
    </div>
  );
}
