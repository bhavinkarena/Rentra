import { isLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PortfolioCalendar from '@/components/partner/PortfolioCalendar';

export const metadata = { title: 'Portfolio calendar', robots: { index: false, follow: false } };
export default async function CalendarPage({ searchParams }) {
  await requireActiveClient();
  const query = await searchParams;
  let view = ['agenda', 'month', 'multi', 'week'].includes(query.view) ? query.view : 'multi';
  let { data, failure } = await settle(
    partnerApi.portfolioCalendar({
      ...query,
      from: view === 'month' ? monthStart(query?.from) : query?.from,
      days: view === 'month' ? 42 : view === 'multi' ? 30 : 7,
    }),
  );
  if (!failure && !query.view && data.items.length === 1) {
    view = 'month';
    ({ data, failure } = await settle(
      partnerApi.portfolioCalendar({ ...query, from: monthStart(query.from), days: 42 }),
    ));
  }
  if (failure)
    return <PortalState kind={failure} backHref="/partner" backLabel="Back to overview" />;
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="text-h1">Calendar</h1>
        <p className="mt-2 text-ink-600">
          Visits, holds, owner blocks and date prices across your properties.
        </p>
      </header>
      <PortfolioCalendar
        data={data}
        view={view}
        anchor={isLocalDate(query.from) ? query.from : propertyToday()}
      />
    </div>
  );
}

function monthStart(value) {
  const d = new Date((isLocalDate(value) ? value : propertyToday()) + 'T00:00:00Z');
  d.setUTCDate(1);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
