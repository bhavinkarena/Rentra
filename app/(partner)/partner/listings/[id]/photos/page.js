import PortalState from '@/components/portal/PortalState';
import PropertyHub from '@/components/partner/property/PropertyHub';
import { PhotosSection } from '@/components/partner/listing/ListingSections';
import { ListingChrome } from '@/components/partner/listing/chrome';
import { loadPropertyHub } from '@/lib/partner/property-hub';

export const metadata = { title: 'Property photos', robots: { index: false, follow: false } };

/** The photo manager as its own tab (LIST-05 inside the property hub). */
export default async function PropertyPhotosPage(props) {
  const { failure, data, hub, listHref } = await loadPropertyHub(props);
  if (failure) return <PortalState kind={failure} backHref={listHref} backLabel="All properties" />;
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <PropertyHub {...hub} active="photos" />
      <div className="mt-6">
        <ListingChrome variant="card" listing={data.listing}>
          <PhotosSection listing={data.listing} photos={data.photos} />
        </ListingChrome>
      </div>
    </div>
  );
}
