import { requireClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PayoutDestinations from '@/components/partner/PayoutDestinations';

export const metadata = {
  title: 'Payout destination',
  robots: { index: false, follow: false, nocache: true },
};

export default async function PayoutDestinationPage() {
  await requireClient();
  const { data, failure } = await settle(partnerApi.payoutDestinations());
  if (failure)
    return <PortalState kind={failure} backHref="/partner/settings" backLabel="Settings" />;
  return <PayoutDestinations data={data} />;
}
