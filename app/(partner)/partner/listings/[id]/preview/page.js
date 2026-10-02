import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { ListingDetail } from '@/components/rentra/listing/ListingDetail';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import Link from '@/components/navigation/NavigationLink';
export const metadata = {
  title: 'Preview your property',
  robots: { index: false, follow: false, nocache: true },
};
export default async function OwnerPreview({ params }) {
  await requireClient();
  const { id } = await params;
  const { data, failure } = await settle(partnerApi.previewData(id));
  if (failure) return <PortalState kind={failure} />;
  if (!data)
    return (
      <p className="p-6">
        Add the location before previewing your property.{' '}
        <Link href={`/partner/listings/${id}/setup/location`} className="underline">
          Set location
        </Link>
      </p>
    );
  return (
    <>
      <div className="sticky top-0 z-40 flex min-h-14 items-center justify-between gap-4 border-b bg-warning-bg px-4 py-3 text-meta">
        <p>Preview — not live yet. Booking is disabled.</p>
        <Link href={`/partner/listings/${id}/setup/preview`} className="min-h-11 p-3 underline">
          Back to setup
        </Link>
      </div>
      <ListingDetail listing={data} preview />
    </>
  );
}
