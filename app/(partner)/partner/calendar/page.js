import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PortfolioCalendar from '@/components/partner/PortfolioCalendar';

export const metadata = { title: 'Portfolio calendar', robots: { index: false, follow: false } };
export default async function CalendarPage({ searchParams }) {
  await requireActiveClient();
  const query = await searchParams;
  const view = ['agenda', 'month'].includes(query.view) ? query.view : 'week';
  const { data, failure } = await settle(
    partnerApi.portfolioCalendar({ ...query, days: view === 'month' ? 31 : 7 }),
  );
  if (failure)
    return <PortalState kind={failure} backHref="/partner" backLabel="Back to overview" />;
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-h1">Portfolio calendar</h1>
        <p className="mt-2 text-ink-600">
          Visits, holds, owner blocks and date prices across your properties.
        </p>
      </header>
      <PortfolioCalendar data={data} view={view} />
    </div>
  );
}
