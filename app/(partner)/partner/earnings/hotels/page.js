import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
import PortalState from '@/components/portal/PortalState';
import HotelEarnings from '@/components/partner/earnings/HotelEarnings';

export const metadata = { title: 'Hotel earnings' };

export default async function Page({ searchParams }) {
  await requireActiveClient();
  const { month } = await searchParams;
  const { data, failure, invalid } = await settleFinance(
    partnerApi.hotelEarnings(month ? { month } : {}),
  );
  if (failure || invalid)
    return (
      <PortalState
        kind={failure ?? 'unavailable'}
        backHref="/partner/earnings"
        backLabel="Earnings"
      />
    );
  return <HotelEarnings data={data} />;
}
