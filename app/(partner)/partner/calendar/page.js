import { isLocalDate, propertyToday } from '@/lib/domain/booking-dates';
import { requireActiveClient } from '@/lib/api/session';
import { partnerApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import PortfolioCalendar from '@/components/partner/PortfolioCalendar';
import OwnerModal from '@/components/partner/OwnerModal';
import OwnerTable from '@/components/partner/OwnerTable';
import ListingStatusBadge from '@/components/partner/ListingStatusBadge';
import PortalPage from '@/components/portal/PortalPage';
import { PartnerPageHeader } from '@/components/partner/PortalPrimitives';
import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import { z } from 'zod';
export const metadata = { title: 'Property calendars' };
export default async function CalendarPage({ searchParams }) {
  await requireActiveClient();
  const query = await searchParams;
  const q = typeof query.q === 'string' ? query.q.slice(0, 100) : '';
  const page = /^\d{1,6}$/.test(query.listPage || '') ? Math.max(1, Number(query.listPage)) : 1;
  const status = ['draft', 'live', 'pending_review', 'rejected', 'paused'].includes(query.status)
    ? query.status
    : 'all';
  const anchor = isLocalDate(query.from) ? query.from : propertyToday();
  const view = ['agenda', 'month', 'multi', 'week'].includes(query.view) ? query.view : 'month';
  const property = z.string().uuid().safeParse(query.property);
  const listFilters = {
    ...(q ? { q } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(page > 1 ? { listPage: String(page) } : {}),
  };
  const href = (changes) =>
    `/partner/calendar?${new URLSearchParams({ ...listFilters, ...changes })}`;
  const [list, calendar] = await Promise.all([
    settle(partnerApi.listings({ query: q, status, page })),
    property.success
      ? settle(
          partnerApi.portfolioCalendar({
            property: property.data,
            from: view === 'month' ? monthStart(anchor) : anchor,
            days: view === 'month' ? 42 : view === 'multi' ? 30 : 7,
            slot: query.slot,
          }),
        )
      : null,
  ]);
  if (list.failure) return <PortalState kind={list.failure} />;
  return (
    <PortalPage className="space-y-6">
      <PartnerPageHeader
        title="Calendar"
        description="Choose a property to manage availability, bookings, blocks and date prices. All times are in IST."
      />
      <Form
        action="/partner/calendar"
        className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4"
      >
        <label className="min-w-0 flex-1 text-meta">
          Find a property
          <input
            className="mt-1 block min-h-11 w-full rounded-lg border p-3"
            type="search"
            name="q"
            maxLength={100}
            defaultValue={q}
            placeholder="Search property name"
          />
        </label>
        <label className="text-meta">
          Status
          <select
            name="status"
            defaultValue={status}
            className="mt-1 block min-h-11 rounded-lg border p-3"
          >
            <option value="all">All statuses</option>
            {['live', 'draft', 'pending_review', 'rejected', 'paused'].map((value) => (
              <option value={value} key={value}>
                {value.replaceAll('_', ' ')}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white">
          Apply filters
        </button>
        <Link
          href="/partner/calendar"
          className="inline-flex min-h-11 items-center px-3 text-brand-800"
        >
          Reset
        </Link>
      </Form>
      <p className="text-meta text-ink-600">{list.data.total} properties found</p>
      <OwnerTable
        label="Property calendars"
        columns={['Property', 'Location', 'Status', 'Booking type', 'Updated', 'Action']}
        empty={!list.data.items.length ? 'No properties match these filters.' : null}
      >
        {list.data.items.map((item) => (
          <tr key={item.id}>
            <td>
              <Link
                scroll={false}
                href={href({ property: item.id })}
                className="font-semibold text-brand-800 underline underline-offset-4"
              >
                {item.title || 'Untitled draft'}
              </Link>
            </td>
            <td>
              {[item.areaName, item.cityName].filter(Boolean).join(', ') || 'Location not set'}
            </td>
            <td>
              <ListingStatusBadge status={item.status} />
            </td>
            <td>{item.rentalUnit === 'hour' ? 'Hourly / courts' : 'Day / night / full day'}</td>
            <td className="whitespace-nowrap">
              {item.updatedAt
                ? new Date(item.updatedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })
                : '—'}
            </td>
            <td>
              <Link
                scroll={false}
                href={href({ property: item.id })}
                className="inline-flex min-h-11 items-center rounded-lg border px-4 font-semibold text-brand-800"
              >
                View calendar<span className="sr-only"> for {item.title}</span>
              </Link>
            </td>
          </tr>
        ))}
      </OwnerTable>
      <nav aria-label="Calendar property pages" className="flex items-center gap-4">
        {page > 1 && <Link href={href({ listPage: String(page - 1) })}>Previous</Link>}
        <span>
          Page {list.data.page} of {Math.max(1, list.data.totalPages)}
        </span>
        {page < list.data.totalPages && (
          <Link href={href({ listPage: String(page + 1) })}>Next</Link>
        )}
      </nav>
      {calendar && (
        <OwnerModal
          title={calendar.data?.items?.[0]?.title || 'Property calendar'}
          closeHref={href({})}
        >
          {calendar.failure ? (
            <PortalState kind={calendar.failure} />
          ) : !calendar.data.items.length ? (
            <p>No calendar is available for this property.</p>
          ) : (
            <PortfolioCalendar
              data={calendar.data}
              view={view}
              anchor={anchor}
              listFilters={listFilters}
            />
          )}
        </OwnerModal>
      )}
    </PortalPage>
  );
}
function monthStart(value) {
  const date = new Date(value + 'T00:00:00Z');
  date.setUTCDate(1);
  date.setUTCDate(1 - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
}
