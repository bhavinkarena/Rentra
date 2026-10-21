import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settleFinance } from '@/lib/api/finance-state';
import PortalState from '@/components/portal/PortalState';
import Link from '@/components/navigation/NavigationLink';
import HotelAnalytics from '@/components/partner/earnings/HotelAnalytics';

export const metadata = { title: 'Hotel analytics' };

export default async function Page({ searchParams }) {
  await requireActiveClient();
  const { from, to, hotelId } = await searchParams;
  const query = Object.fromEntries(
    Object.entries({ from, to, hotelId }).filter(([, value]) => typeof value === 'string' && value),
  );
  const { data, failure, invalid } = await settleFinance(partnerApi.hotelAnalytics(query));
  if (invalid)
    return (
      <div className="space-y-3">
        <h1 className="text-h1 font-bold">Check the dates</h1>
        <p role="alert">{invalid}</p>
        <Link
          href="/partner/earnings/hotels/analytics"
          className="font-semibold text-brand-800 underline"
        >
          Show the last 30 days
        </Link>
      </div>
    );
  if (failure)
    return (
      <PortalState kind={failure} backHref="/partner/earnings/hotels" backLabel="Hotel earnings" />
    );
  return <HotelAnalytics data={data} hotelId={query.hotelId} />;
}
