import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
import PortalState from '@/components/portal/PortalState';
import { HotelStatement } from '@/components/partner/earnings/HotelEarnings';

export const metadata = { title: 'Payout statement' };

export default async function Page({ params }) {
  await requireActiveClient();
  const { id } = await params;
  const { data, failure, invalid } = await settleFinance(partnerApi.hotelPayout(id));
  if (failure || invalid)
    return (
      <PortalState
        kind={failure ?? 'not_found'}
        backHref="/partner/earnings/hotels"
        backLabel="Hotel earnings"
      />
    );
  return <HotelStatement data={data} />;
}
