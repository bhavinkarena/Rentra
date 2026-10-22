import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
import PortalState from '@/components/portal/PortalState';
import { HotelInvoice } from '@/components/partner/earnings/HotelEarnings';

export const metadata = { title: 'Commission invoice' };

export default async function Page({ params }) {
  await requireActiveClient();
  const { id } = await params;
  const { data, failure, invalid } = await settleFinance(partnerApi.hotelInvoice(id));
  if (failure || invalid)
    return (
      <PortalState
        kind={failure ?? 'not_found'}
        backHref={`/partner/earnings/hotels/${id}`}
        backLabel="Payout statement"
      />
    );
  return <HotelInvoice data={data} runId={id} />;
}
