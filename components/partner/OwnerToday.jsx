import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import OwnerAnalytics from './OwnerAnalytics';
import OwnerTable from './OwnerTable';
import ListingStatusBadge from './ListingStatusBadge';
import { KpiCard } from './PortalPrimitives';
import { displayMoney, StateBadge, totalPrice } from '@/components/customer/BookingDisplay';
import { visibleTasks } from '@/lib/domain/client-updates';
import InlineAlert from '@/components/portal/InlineAlert';
import RetryButton from '@/components/portal/RetryButton';
const action =
  'inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold text-brand-800';
const date = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Hours with Rentra';
const categories = {
  all: 'All actions',
  booking: 'Bookings',
  property: 'Properties & calendar',
  review: 'Reviews',
  support: 'Support',
  dispute: 'Disputes',
  account: 'Account & inbox',
};
function taskCategory(task) {
  if (/review/.test(task.key)) return 'review';
  if (/dispute|incident/.test(task.key)) return 'dispute';
  if (/support/.test(task.key)) return 'support';
  if (/booking|visit/.test(task.key)) return 'booking';
  if (/^(propert|draft|dates|auto_open)/.test(task.key)) return 'property';
  return 'account';
}
function Section({ title, result, children, href }) {
  return (
    <section className="min-w-0 space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-h3 font-semibold">{title}</h2>
        {href && (
          <Link href={href} className={action}>
            View all
          </Link>
        )}
      </header>
      {result?.failure ? (
        <InlineAlert action={<RetryButton />}>{title} could not load. Try again.</InlineAlert>
      ) : (
        children
      )}
    </section>
  );
}
export default function OwnerToday({
  analytics,
  needs,
  visits,
  week,
  earnings,
  properties,
  records,
  portfolio,
  filters = {},
}) {
  const todayRows = Array.from(
    new Map(
      [
        ...(visits?.data?.arrivals || []),
        ...(visits?.data?.departures || []),
        ...(visits?.data?.onSite || []),
      ].map((row) => [row.visitId, row]),
    ).values(),
  );
  const data = records?.data,
    taskFilter = categories[filters.task] ? filters.task : 'all';
  const tasks = visibleTasks(needs?.data?.tasks).filter(
    (task) => taskFilter === 'all' || taskCategory(task) === taskFilter,
  );
  const taskPage = /^\d{1,6}$/.test(filters.taskPage || '')
    ? Math.max(1, Number(filters.taskPage))
    : 1;
  const currentTaskPage = Math.min(taskPage, Math.max(1, Math.ceil(tasks.length / 8)));
  const property = data?.property || '',
    filteredProperties = (properties?.data || []).filter((p) => !property || p.id === property);
  const bookingHref = `/partner/bookings?${new URLSearchParams({ property, from: data?.from || '', to: data?.to || '', tab: data?.tab || 'all' })}`;
  const dashboardHref = (changes) =>
    `/partner?${new URLSearchParams({ property, from: data?.from || '', to: data?.to || '', tab: data?.tab || 'all', task: taskFilter, page: String(data?.page || 1), ...changes })}`;
  return (
    <div className="mt-6 min-w-0 space-y-7">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Your properties"
          value={portfolio?.failure ? '—' : (portfolio?.data?.total ?? '—')}
          hint="Across your entire portfolio"
        />
        <KpiCard
          label="Bookings in this view"
          value={records?.failure ? '—' : (data?.total ?? '—')}
          hint="Matches the property, dates and status below"
        />
        <KpiCard
          label="Today's visits"
          value={visits?.failure ? '—' : (visits?.data?.total ?? '—')}
          hint="All properties · India time"
        />
        <KpiCard
          label="Booked rent this month"
          value={
            earnings?.failure
              ? '—'
              : earnings?.data
                ? displayMoney(earnings.data.bookedRentMinor)
                : '—'
          }
          hint="All properties · rent only, before settlement"
        />
      </div>
      <OwnerAnalytics result={analytics} portfolio={portfolio} earnings={earnings} />
      <Form
        action="/partner"
        className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <label className="text-meta">
          Property
          <select
            name="property"
            defaultValue={property}
            className="mt-1 block min-h-11 w-full rounded-lg border p-2"
          >
            <option value="">All properties</option>
            {data?.properties?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        {['from', 'to'].map((key) => (
          <label key={key} className="text-meta">
            {key === 'from' ? 'From date' : 'To date'}
            <input
              type="date"
              name={key}
              defaultValue={data?.[key] || ''}
              className="mt-1 block min-h-11 w-full rounded-lg border p-2"
            />
          </label>
        ))}
        <label className="text-meta">
          Booking status
          <select
            name="tab"
            defaultValue={data?.tab || 'all'}
            className="mt-1 block min-h-11 w-full rounded-lg border p-2"
          >
            {Object.entries({
              all: 'All bookings',
              today: 'Today',
              upcoming: 'Upcoming',
              action_needed: 'Needs action',
              with_rentra: 'With Rentra',
              past: 'Past',
              cancelled: 'Cancelled',
            }).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white">
            Apply filters
          </button>
          <Link className="inline-flex min-h-11 items-center px-2 text-brand-800" href="/partner">
            Reset
          </Link>
        </div>
      </Form>
      <Section title="Booking overview" result={records} href={bookingHref}>
        <OwnerTable
          label="Dashboard bookings"
          columns={[
            'Property / reference',
            'Guest',
            'Visit date',
            'Status',
            'Booking total',
            'Action',
          ]}
          empty={!data?.items?.length ? 'No bookings match the selected filters.' : null}
        >
          {data?.items.map((item) => (
            <tr key={item.visitId ?? item.id}>
              <td>
                <strong className="block">{item.title}</strong>
                <span className="block max-w-60 truncate text-tiny text-ink-600">
                  {item.reference}
                </span>
              </td>
              <td>
                {item.contact?.name || 'Guest'}
                <span className="block text-tiny">{item.guests || 0} guests</span>
              </td>
              <td className="whitespace-nowrap">
                {date(item.firstVisit)}
                <span className="block text-tiny">{item.visitCount} visits</span>
              </td>
              <td>
                <StateBadge state={item.state} />
              </td>
              <td className="whitespace-nowrap font-semibold">{displayMoney(totalPrice(item))}</td>
              <td>
                <Link className={action} href={`${bookingHref}&booking=${item.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </OwnerTable>
        {data?.pages > 1 && (
          <nav className="flex items-center gap-4" aria-label="Dashboard booking pages">
            {data.page > 1 && (
              <Link href={dashboardHref({ page: String(data.page - 1) })}>Previous</Link>
            )}
            <span>
              Page {data.page} of {data.pages}
            </span>
            {data.page < data.pages && (
              <Link href={dashboardHref({ page: String(data.page + 1) })}>Next</Link>
            )}
          </nav>
        )}
      </Section>
      <Section
        title="Today's visits · all properties"
        result={visits}
        href="/partner/bookings?tab=today"
      >
        <OwnerTable
          label="Today's visits"
          columns={['Property', 'Guest', 'Visit', 'Next action', 'Action']}
          empty={
            !todayRows.length
              ? visits?.data?.total
                ? 'Visit hours need attention. Open all bookings to check the details.'
                : visits?.data?.next
                  ? `No guests today. Next booking: ${date(visits.data.next.startsAt)} · ${visits.data.next.title}.`
                  : 'No guests today.'
              : null
          }
        >
          {todayRows.slice(0, 8).map((row) => (
            <tr key={row.visitId}>
              <td className="font-semibold">{row.title}</td>
              <td>
                {row.contact?.name || 'Guest'}
                <span className="block text-tiny">{row.guests} guests</span>
              </td>
              <td>
                {row.firstVisitLabel}
                <span className="block text-tiny">
                  {row.startsAt
                    ? new Date(row.startsAt).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : 'Hours with Rentra'}
                </span>
              </td>
              <td>{row.operation?.label || 'View visit'}</td>
              <td>
                <Link className={action} href={`/partner/bookings?tab=today&booking=${row.id}`}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </OwnerTable>
      </Section>
      {visits?.data?.offline?.length > 0 && (
        <Section title="Today's offline bookings · all properties">
          <OwnerTable
            label="Offline bookings"
            columns={['Property', 'Guest', 'Visit hours (IST)', 'Guests', 'Action']}
          >
            {visits.data.offline.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold">{row.title}</td>
                <td>
                  {row.name}
                  {row.phone && (
                    <a
                      className="block min-h-11 content-center text-brand-800 underline"
                      href={`tel:${row.phone}`}
                    >
                      Call guest
                    </a>
                  )}
                </td>
                <td>
                  {[row.startsAt, row.endsAt]
                    .map((value) =>
                      new Date(value).toLocaleTimeString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: 'numeric',
                        minute: '2-digit',
                      }),
                    )
                    .join(' – ')}
                </td>
                <td>{row.guests}</td>
                <td>
                  <Link className={action} href={`/partner/calendar?property=${row.propertyId}`}>
                    View calendar
                  </Link>
                </td>
              </tr>
            ))}
          </OwnerTable>
        </Section>
      )}
      <Section title="Needs your attention · all properties" result={needs}>
        <Form action="/partner" className="flex flex-wrap items-end gap-3">
          {['property', 'from', 'to', 'tab'].map((key) => (
            <input type="hidden" key={key} name={key} value={data?.[key] || ''} />
          ))}
          <label>
            Action category
            <select
              name="task"
              defaultValue={taskFilter}
              className="ml-2 min-h-11 rounded-lg border bg-card p-2"
            >
              {Object.entries(categories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className={action}>Filter actions</button>
        </Form>
        <OwnerTable
          label="Dashboard actions"
          columns={['Category', 'Next action', 'Status', 'Action']}
          empty={!tasks.length ? 'Nothing needs you in this category.' : null}
        >
          {tasks.slice((currentTaskPage - 1) * 8, currentTaskPage * 8).map((task) => (
            <tr key={task.key}>
              <td>{categories[taskCategory(task)]}</td>
              <td>{task.label}</td>
              <td>
                <span
                  className={`rounded-full px-2 py-1 text-tiny ${task.kind === 'action' ? 'bg-warning-bg text-warning' : 'bg-ink-100 text-ink-700'}`}
                >
                  {task.kind === 'action' ? 'Needs you' : 'Information'}
                </span>
              </td>
              <td>
                <Link href={task.href} className={action}>
                  {task.action || 'Open'}
                </Link>
              </td>
            </tr>
          ))}
        </OwnerTable>
        {tasks.length > 8 && (
          <nav aria-label="Dashboard action pages" className="flex items-center gap-4">
            {currentTaskPage > 1 && (
              <Link href={dashboardHref({ taskPage: String(currentTaskPage - 1) })}>
                Previous actions
              </Link>
            )}
            <span>
              Page {currentTaskPage} of {Math.ceil(tasks.length / 8)} · {tasks.length} actions
            </span>
            {currentTaskPage < Math.ceil(tasks.length / 8) && (
              <Link href={dashboardHref({ taskPage: String(currentTaskPage + 1) })}>
                More actions
              </Link>
            )}
          </nav>
        )}
      </Section>
      <div className="grid min-w-0 items-start gap-6 xl:grid-cols-2">
        <Section title="This week · all properties" result={week}>
          <OwnerTable
            minWidth={430}
            label="Weekly visits"
            columns={['Date', 'Visits', 'Properties', 'Action']}
            empty={!week?.data?.length ? 'No visit information available.' : null}
          >
            {week?.data?.map((day) => (
              <tr key={day.date}>
                <td className="whitespace-nowrap">{date(day.date)}</td>
                <td>{day.count}</td>
                <td>{day.properties.join(', ') || 'No visits'}</td>
                <td>
                  <Link
                    href={dashboardHref({ from: day.date, to: day.date, tab: 'all', property: '' })}
                    className={action}
                  >
                    View visits
                  </Link>
                </td>
              </tr>
            ))}
          </OwnerTable>
        </Section>
        <Section title="Recently updated properties" result={properties} href="/partner/listings">
          <OwnerTable
            minWidth={430}
            label="Dashboard properties"
            columns={['Property', 'Status', 'Setup', 'Action']}
            empty={
              !filteredProperties.length
                ? 'No recently updated properties in this view. Open all properties to see your full portfolio.'
                : null
            }
          >
            {filteredProperties.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.title}</td>
                <td>
                  <ListingStatusBadge status={p.status} />
                </td>
                <td>{p.strength == null ? '—' : `${p.strength}%`}</td>
                <td>
                  <Link href={`/partner/listings/${p.id}/overview`} className={action}>
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </OwnerTable>
        </Section>
      </div>
      <Section title="Workspace overview">
        <OwnerTable
          label="Owner workspace sections"
          columns={['Section', 'What you can manage', 'Action']}
        >
          {[
            ['Calendar', 'Availability, holds, blocks and date prices', '/partner/calendar'],
            ['Properties', 'Drafts, setup and published listings', '/partner/listings'],
            ['Earnings', 'Booked rent, statements and payout status', '/partner/earnings'],
            ['Reviews', 'Guest feedback and owner replies', '/partner/reviews'],
            ['Caretakers', 'Invitations and property access', '/partner/team'],
            ['Support', 'Questions and replies from Rentra', '/partner/support'],
            ['Disputes', 'Responses, evidence and case decisions', '/partner/disputes'],
            ['Inbox', 'Notifications and next actions', '/partner/updates'],
            ['Settings', 'Account, notifications and security', '/partner/settings'],
          ].map(([title, description, href]) => (
            <tr key={href}>
              <td className="font-semibold">{title}</td>
              <td>{description}</td>
              <td>
                <Link className={action} href={href}>
                  Open
                </Link>
              </td>
            </tr>
          ))}
        </OwnerTable>
      </Section>
      {earnings?.failure && (
        <InlineAlert action={<RetryButton label="Retry earnings" />}>
          Earnings could not load. Try again.
        </InlineAlert>
      )}
      {earnings?.data && (
        <p className="rounded-xl border bg-card p-4 text-meta text-ink-600">
          {earnings.data.status} {earnings.data.basis} Rent only; guest fees and deposits are
          excluded.{' '}
          {earnings.data.environment === 'live'
            ? 'Live payments.'
            : 'Test or simulated payments; this is not money paid to you.'}
        </p>
      )}
    </div>
  );
}
