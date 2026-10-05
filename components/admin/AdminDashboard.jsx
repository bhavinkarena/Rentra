import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import RetryButton from '@/components/portal/RetryButton';
import { AdminPage, AdminPageHeader, AdminTable, AdminEmpty } from './AdminPrimitives';
import AdminAnalytics from './AdminAnalytics';
import { displayMoney } from '@/lib/domain/display-money';
import { adminDateTime } from '@/lib/domain/admin-display';
import { humaniseStatus } from '@/lib/domain/status';

const names = {
  applications: 'Owner applications',
  properties: 'Property reviews',
  bookings: 'Bookings',
  finance: 'Finance',
  support: 'Support',
  health: 'Service health',
};
const linkClass =
  'inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 underline';

function Metric({ metric }) {
  return (
    <article className="min-w-0 rounded-lg border border-border bg-card p-5">
      <h3 className="text-meta font-semibold text-ink-700">{metric.label}</h3>
      <p className="mt-2 break-words text-h2 font-bold text-ink-900 tabular">
        {metric.availability === 'unavailable'
          ? 'Unavailable'
          : metric.unit === 'minor'
            ? displayMoney(metric.value)
            : BigInt(metric.value).toLocaleString('en-IN')}
      </p>
      <p className="mt-3 text-tiny leading-5 text-ink-600">{metric.dateBasis}</p>
      {metric.availability === 'unavailable' ? (
        <p className="mt-2 text-tiny text-ink-600">No provider capture evidence in this scope.</p>
      ) : null}
      <Link className={linkClass} href={metric.href}>
        Open {metric.label.toLowerCase()}
      </Link>
    </article>
  );
}

export default function AdminDashboard({ data }) {
  const { scope, modules } = data;
  const available = Object.values(modules).filter((m) => m.availability === 'available');
  const metrics = available.flatMap((m) => m.metrics ?? []);
  const priority = [
    'applications',
    'properties',
    'bookings',
    'visits',
    'rent',
    'captured',
    'support',
    'cases',
    'refunded',
    'refundPending',
  ];
  const summary = [...metrics]
    .sort((a, b) => priority.indexOf(a.key) - priority.indexOf(b.key))
    .slice(0, 6);
  const waiting = summary.filter((m) => m.dateBasis === 'Waiting now');
  const period = summary.filter((m) => m.dateBasis !== 'Waiting now');
  const additional = metrics.filter((m) => !summary.includes(m));
  const attention = available
    .flatMap((m) => m.attention ?? [])
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const urgent = attention.filter((row) => row.urgent);
  const bookings = modules.bookings?.availability === 'available' ? modules.bookings : null;
  const applications =
    modules.applications?.availability === 'available' ? modules.applications : null;
  const health = modules.health?.availability === 'available' ? modules.health : null;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Admin workspace"
        title="Dashboard"
        description="Review urgent work, today's visits and marketplace activity within your permissions."
        action={<RetryButton label="Refresh" />}
      />
      <Form
        action="/admin"
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4"
      >
        <label className="text-meta font-semibold text-ink-700">
          IST period
          <select
            name="period"
            defaultValue={scope.period}
            className="mt-1 block min-h-11 rounded-md border border-input bg-card px-3"
          >
            {[
              ['today', 'Today'],
              ['7d', 'Last 7 days'],
              ['30d', 'Last 30 days'],
              ['90d', 'Last 90 days'],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <details open className="sm:contents">
          <summary className="cursor-pointer py-3 text-meta font-semibold text-brand-700 sm:hidden">
            Filters
          </summary>
          <label className="block text-meta font-semibold text-ink-700">
            Environment
            <select
              name="environment"
              defaultValue={scope.environment}
              className="mt-1 block min-h-11 rounded-md border border-input bg-card px-3"
            >
              {['live', 'test', 'simulated'].map((value) => (
                <option key={value} value={value}>
                  {humaniseStatus(value)}
                </option>
              ))}
            </select>
          </label>
        </details>
        <button className="min-h-11 rounded-md bg-primary px-4 text-meta font-semibold text-white">
          Apply
        </button>
        <p className="w-full text-tiny text-ink-600">
          {scope.from} to {scope.to} (IST) · {humaniseStatus(scope.environment)} · Refreshed{' '}
          {adminDateTime(scope.generatedAt)}
        </p>
      </Form>
      {scope.environment !== 'live' ? (
        <p className="mt-3 rounded-md bg-warning-bg p-4 text-meta text-warning">
          {humaniseStatus(scope.environment)} data. These figures do not represent live bank money.
        </p>
      ) : null}
      {!Object.keys(modules).length ? (
        <div className="mt-6">
          <AdminEmpty
            title="No dashboard modules assigned"
            description="Open an authorized workspace from the navigation, or contact an operator administrator for access."
          />
          <Link href="/admin/help" className={linkClass}>
            Help & guide
          </Link>
        </div>
      ) : null}
      {Object.entries(modules)
        .filter(([, m]) => m.availability === 'unavailable')
        .map(([key]) => (
          <section key={key} className="mt-4 rounded-lg border border-border bg-card p-5">
            <h2 className="text-h4 font-semibold">{names[key]} unavailable</h2>
            <p className="my-3 text-meta text-ink-600">
              This module could not be loaded. Other authorized modules remain available.
            </p>
            <RetryButton />
          </section>
        ))}
      {urgent.length ? (
        <aside
          aria-label="Urgent attention"
          className="mt-6 rounded-lg border border-warning/30 bg-warning-bg p-5"
        >
          <h2 className="text-h4 font-semibold text-ink-900">Urgent attention</h2>
          <p className="mt-2 text-meta text-ink-700">
            {applications?.counts.overdue
              ? `${applications.counts.overdue} applications past 48 hours. `
              : ''}
            {modules.finance?.exceptions
              ? `${modules.finance.exceptions} financial exceptions. `
              : ''}
            {modules.support?.counts?.urgent
              ? `${modules.support.counts.urgent} urgent support requests. `
              : ''}
            Open incidents and oldest urgent records appear below.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-5">
            {urgent.slice(0, 4).map((row) => (
              <Link key={row.href} className={linkClass} href={row.href}>
                {row.label}
              </Link>
            ))}
          </div>
        </aside>
      ) : null}
      {waiting.length ? (
        <section className="mt-8" aria-label="Waiting now">
          <h2 className="mb-4 text-h3 font-semibold">Waiting now</h2>
          <p className="mb-3 text-tiny text-ink-600">
            Current queues across environments; pending refunds follow the selected environment.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {waiting.map((m) => (
              <Metric key={m.key} metric={m} />
            ))}
          </div>
          {applications ? (
            <p className="mt-3 text-meta text-ink-600">
              {applications.counts.unassigned} unassigned applications ·{' '}
              {applications.counts.overdue} past the 48-hour SLA
            </p>
          ) : null}
        </section>
      ) : null}
      {period.length ? (
        <section className="mt-8" aria-label="Period and today totals">
          <h2 className="mb-4 text-h3 font-semibold">Period & today totals</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {period.map((m) => (
              <Metric key={m.key} metric={m} />
            ))}
          </div>
        </section>
      ) : null}
      <AdminAnalytics modules={modules} />
      {additional.length ? (
        <section className="mt-8">
          <h2 className="mb-4 text-h3 font-semibold">Other authorized totals</h2>
          <AdminTable
            label="Other authorized totals"
            columns={['Metric', 'Value', 'Date basis']}
            minWidth={560}
          >
            {additional.map((m) => (
              <tr key={m.key}>
                <td className="px-4 py-3">
                  <Link className={linkClass} href={m.href}>
                    Open {m.label.toLowerCase()}
                  </Link>
                </td>
                <td className="px-4 py-3 tabular">
                  {m.availability === 'unavailable'
                    ? 'Unavailable'
                    : m.unit === 'minor'
                      ? displayMoney(m.value)
                      : m.value}
                </td>
                <td className="px-4 py-3">{m.dateBasis}</td>
              </tr>
            ))}
          </AdminTable>
        </section>
      ) : null}
      {available.length ? (
        <section className="mt-8">
          <h2 className="mb-4 text-h3 font-semibold">Needs attention</h2>
          <AdminTable
            label="Needs attention"
            columns={['Record or queue', 'State', 'Priority']}
            minWidth={560}
            empty={!attention.length ? 'No waiting records in the authorized queues.' : null}
          >
            {attention.map((row) => (
              <tr key={row.href}>
                <td className="px-4 py-3">
                  <Link href={row.href} className={linkClass}>
                    {row.label}
                  </Link>
                </td>
                <td className="px-4 py-3">{humaniseStatus(row.state)}</td>
                <td className="px-4 py-3">{row.urgent ? 'Urgent' : 'Queue'}</td>
              </tr>
            ))}
          </AdminTable>
          <p className="mt-2 text-tiny text-ink-600">
            Up to eight records per queue; totals use the full dataset.
          </p>
          <div className="flex flex-wrap gap-x-5">
            {Object.entries(modules)
              .filter(([, m]) => m.availability === 'available' && m.href)
              .map(([key, m]) => (
                <Link key={key} href={m.href} className={linkClass}>
                  All {names[key].toLowerCase()}
                </Link>
              ))}
          </div>
        </section>
      ) : null}
      {bookings ? (
        <section className="mt-8">
          <h2 className="mb-3 text-h3 font-semibold">Today&apos;s visits</h2>
          <p className="mb-4 text-meta text-ink-600">
            {bookings.visits.arrivals} arrivals · {bookings.visits.departures} departures ·{' '}
            {bookings.visits.hourly} hourly · {bookings.visits.hours_unknown} with hours not
            recorded. Arrival and departure counts can overlap.
          </p>
          <AdminTable
            label="Today's visits"
            columns={['Visit / booking', 'Property', 'State', 'Start / end (IST)']}
            minWidth={760}
            empty={
              !bookings.todayVisits.length
                ? 'No visits scheduled for today in this environment.'
                : null
            }
          >
            {bookings.todayVisits.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3">
                  <Link className={linkClass} href={row.href}>
                    {row.reference}
                  </Link>
                  <p className="text-tiny text-ink-600">{row.order_reference}</p>
                </td>
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">{humaniseStatus(row.state)}</td>
                <td className="px-4 py-3">
                  {row.hours_known ? (
                    <>
                      {adminDateTime(row.starts_at)}
                      <br />
                      {adminDateTime(row.ends_at)}
                    </>
                  ) : (
                    'Hours not recorded'
                  )}
                </td>
              </tr>
            ))}
          </AdminTable>
          <Link className={linkClass} href={bookings.todayHref}>
            All today&apos;s visits
          </Link>
        </section>
      ) : null}
      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        {applications ? (
          <section className="min-w-0">
            <h2 className="mb-4 text-h3 font-semibold">Recent decisions</h2>
            <AdminTable
              label="Recent decisions"
              columns={['Application', 'Decision', 'At (IST)']}
              minWidth={560}
              empty={!applications.recentActivity.length ? 'No decisions in this period.' : null}
            >
              {applications.recentActivity.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <Link className={linkClass} href={row.href}>
                      {row.label}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{humaniseStatus(row.state)}</td>
                  <td className="px-4 py-3">{adminDateTime(row.at)}</td>
                </tr>
              ))}
            </AdminTable>
            <Link className={linkClass} href={applications.historyHref}>
              All decisions
            </Link>
          </section>
        ) : null}
        {health ? (
          <section className="min-w-0">
            <h2 className="mb-4 text-h3 font-semibold">Service health</h2>
            <AdminTable
              label="Service health"
              columns={['Service', 'Health', 'Last checked (IST)']}
              minWidth={560}
              empty={
                !health.services.length ? 'Unavailable: no service observations recorded.' : null
              }
            >
              {health.services.map((row) => (
                <tr key={row.service}>
                  <td className="px-4 py-3">{humaniseStatus(row.service)}</td>
                  <td className="px-4 py-3">
                    {row.stale ? 'Stale observation' : row.healthy ? 'Healthy' : 'Needs attention'}
                  </td>
                  <td className="px-4 py-3">{adminDateTime(row.checked_at)}</td>
                </tr>
              ))}
            </AdminTable>
            <Link href={health.href} className={linkClass}>
              Open service health
            </Link>
          </section>
        ) : null}
      </div>
    </AdminPage>
  );
}
