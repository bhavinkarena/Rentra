import { NewDispute } from '@/components/disputes/Disputes';
import { disputesApi, partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
export const metadata = { title: 'Open dispute', robots: { index: false, follow: false } };
export default async function Page({ searchParams }) {
  const query = await searchParams;
  const order = query?.order;
  if (!order) {
    const { data, failure } = await settle(
      partnerApi.records({ page: query?.page || 1, q: query?.q || '' }),
    );
    if (failure) return <PortalState kind={failure} />;
    return <NewDispute kind="owner" bookings={data.items || []} bookingPages={data} />;
  }
  const { data, failure } = await settle(disputesApi.context('owner', order));
  if (failure) return <PortalState kind={failure} />;
  return <NewDispute kind="owner" context={data} defaultVisitId={query?.visit} />;
}
