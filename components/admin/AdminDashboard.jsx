import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import RetryButton from '@/components/portal/RetryButton';
import { ArrowUpRight, ChevronRight } from 'lucide-react';
import { AdminPage, AdminPageHeader, AdminEmpty, StatusBadge } from './AdminPrimitives';
import { Field, Select } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
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
const destinations = {
  overview: '/admin',
  analytics: '/admin/analytics',
  activity: '/admin/activity',
};
const descriptions = {
  overview: "Priority work and today's visits across your authorized workspaces.",
  analytics: 'Marketplace activity and financial evidence for the selected period.',
  activity: 'Recent decisions and the latest recorded service observations.',
};
const linkClass =
  'inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 underline-offset-4 hover:underline';
const groupClass = 'overflow-hidden rounded-lg border border-border bg-card';

function value(metric) {
  return metric.availability === 'unavailable'
    ? 'Unavailable'
    : metric.unit === 'minor'
      ? displayMoney(metric.value)
      : BigInt(metric.value).toLocaleString('en-IN');
}

function SectionHeading({ title, children, href, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-x-6 gap-y-1">
      <div>
        <h2 className="text-h3 font-semibold tracking-tight text-ink-900">{title}</h2>
        {children ? (
          <p className="mt-1 max-w-[65ch] text-meta leading-6 text-ink-600">{children}</p>
        ) : null}
      </div>
      {href ? (
        <Link href={href} className={linkClass}>
          {action}
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function AttentionRows({ rows }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => (
        <li key={row.href}>
          <Link
            href={row.href}
            className="flex min-h-20 items-center gap-4 px-5 py-4 transition-colors hover:bg-ink-25 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <p className="break-words text-base font-semibold text-ink-900">{row.label}</p>
              <p className="mt-1 text-meta text-ink-600">
                {humaniseStatus(row.state)} <span aria-hidden="true">/</span> {names[row.module]}
              </p>
            </div>
            {row.urgent ? <StatusBadge tone="warning">Urgent</StatusBadge> : null}
            <ChevronRight className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AdminDashboard({ data, view = 'overview' }) {
  const { scope, modules } = data;
  const available = Object.entries(modules).filter(([, m]) => m.availability === 'available');
  const metrics = available.flatMap(([, m]) => m.metrics ?? []);
  const waiting = metrics.filter((m) => m.dateBasis === 'Waiting now');
  const period = metrics.filter((m) => m.dateBasis !== 'Waiting now' && m.key !== 'visits');
  const attention = available
    .flatMap(([key, m]) => (m.attention ?? []).map((row) => ({ ...row, module: key })))
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent));
  const bookings = modules.bookings?.availability === 'available' ? modules.bookings : null;
  const applications =
    modules.applications?.availability === 'available' ? modules.applications : null;
  const health = modules.health?.availability === 'available' ? modules.health : null;
  const query = new URLSearchParams({ period: scope.period, environment: scope.environment });
  const unavailable = Object.entries(modules).filter(([, m]) => m.availability === 'unavailable');
  return (
    <AdminPage>
      <AdminPageHeader
        title={view === 'overview' ? 'Dashboard' : view === 'analytics' ? 'Analytics' : 'Activity'}
        description={descriptions[view]}
        action={<RetryButton label="Refresh" />}
      />
      <nav aria-label="Dashboard views" className="mt-6 flex gap-6 border-b border-border sm:gap-8">
        {Object.entries(destinations).map(([key, href]) => (
          <Link
            key={key}
            href={`${href}?${query}`}
            aria-current={view === key ? 'page' : undefined}
            className={`flex min-h-12 items-center border-b-2 px-1 text-meta font-semibold transition-colors ${view === key ? 'border-brand-600 text-brand-800' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
          >
            {key === 'overview' ? 'Overview' : humaniseStatus(key)}
          </Link>
        ))}
      </nav>
      <div className="mt-5 mb-8 flex flex-wrap items-end justify-between gap-4">
        <Form action={destinations[view]} className="flex flex-wrap items-end gap-3">
          <Field id="dashboard-period" label="Period (IST)">
            <Select
              id="dashboard-period"
              name="period"
              defaultValue={scope.period}
              className="mt-1 block w-auto min-w-36"
            >
              {[
                ['today', 'Today'],
                ['7d', 'Last 7 days'],
                ['30d', 'Last 30 days'],
                ['90d', 'Last 90 days'],
              ].map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field id="dashboard-environment" label="Environment">
            <Select
              id="dashboard-environment"
              name="environment"
              defaultValue={scope.environment}
              className="mt-1 block w-auto min-w-28"
            >
              {['live', 'test', 'simulated'].map((v) => (
                <option key={v} value={v}>
                  {humaniseStatus(v)}
                </option>
              ))}
            </Select>
          </Field>
          <button className={buttonVariants({ variant: 'outline' })}>Apply</button>
        </Form>
        <p className="text-meta leading-6 text-ink-600">
          {scope.from} to {scope.to} (IST)
          <br />
          Refreshed {adminDateTime(scope.generatedAt)}
        </p>
      </div>
      {scope.environment !== 'live' ? (
        <p role="status" className="mb-6 rounded-md bg-warning-bg p-4 text-meta text-warning">
          {humaniseStatus(scope.environment)} data. These figures do not represent live bank money.
        </p>
      ) : null}
      {unavailable.length ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
          <p className="text-meta text-ink-700">
            {unavailable.map(([key]) => names[key]).join(', ')} unavailable. Other authorized
            modules remain available.
          </p>
          <RetryButton />
        </div>
      ) : null}
      {!Object.keys(modules).length ? (
        <div className={groupClass}>
          <AdminEmpty
            title="No dashboard modules assigned"
            description="Open an authorized workspace from the navigation, or contact an operator administrator for access."
          >
            <Link href="/admin/help" className={linkClass}>
              Help & guide
            </Link>
          </AdminEmpty>
        </div>
      ) : null}
      {view === 'overview' && available.length ? (
        <>
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className="min-w-0">
              <SectionHeading title="Needs attention">
                Urgent items first, then waiting records from each queue.
              </SectionHeading>
              <div className={groupClass}>
                {attention.length ? (
                  <>
                    <AttentionRows rows={attention.slice(0, 6)} />
                    {attention.length > 6 ? (
                      <details className="border-t border-border">
                        <summary className="cursor-pointer px-6 py-4 text-meta font-semibold text-brand-700">
                          Show {attention.length - 6} more records
                        </summary>
                        <AttentionRows rows={attention.slice(6)} />
                      </details>
                    ) : null}
                  </>
                ) : (
                  <AdminEmpty
                    title="No waiting records"
                    description="No waiting records were returned by your authorized queues."
                  />
                )}
              </div>
              <p className="mt-3 text-meta text-ink-600">
                Up to eight records per queue; totals use the full dataset.
              </p>
            </section>
            {waiting.length ? (
              <aside aria-label="Current queues" className="min-w-0">
                <SectionHeading title="Current queues">
                  Waiting now, across environments unless labelled.
                </SectionHeading>
                <div className={groupClass}>
                  <ul className="divide-y divide-border">
                    {waiting.map((m) => (
                      <li key={m.key}>
                        <Link
                          href={m.href}
                          className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-ink-25"
                        >
                          <div className="min-w-0">
                            <p className="text-meta font-medium leading-6 text-ink-700">
                              {m.label}
                            </p>
                            {m.environment !== 'all' ? (
                              <p className="mt-1 text-meta text-ink-600">
                                {humaniseStatus(m.environment)} environment
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-h4 font-semibold text-ink-900 tabular">
                            {value(m)}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                {applications ? (
                  <p className="mt-3 text-meta leading-6 text-ink-600">
                    {applications.counts.unassigned} unassigned applications;{' '}
                    {applications.counts.overdue} past the 48-hour SLA.
                  </p>
                ) : null}
                {modules.support?.availability === 'available' ? (
                  <p className="mt-2 text-meta leading-6 text-ink-600">
                    {modules.support.counts.urgent} urgent support requests in total.
                  </p>
                ) : null}
              </aside>
            ) : null}
          </div>
          {bookings ? (
            <section className="mt-10">
              <SectionHeading
                title="Today's visits"
                href={bookings.todayHref}
                action="All today's visits"
              >
                {bookings.visits.arrivals} arrivals / {bookings.visits.departures} departures /{' '}
                {bookings.visits.hourly} hourly. Arrivals and departures can overlap.
              </SectionHeading>
              <div className={groupClass}>
                {bookings.todayVisits.length ? (
                  <ul className="divide-y divide-border">
                    {bookings.todayVisits.map((row) => (
                      <li key={row.id}>
                        <Link
                          href={row.href}
                          className="grid gap-3 px-5 py-5 hover:bg-ink-25 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center sm:px-6"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-base font-semibold text-ink-900">
                              {row.title}
                            </p>
                            <p className="mt-1 text-meta text-ink-600">
                              {row.reference} / {row.order_reference}
                            </p>
                          </div>
                          <p className="text-meta leading-6 text-ink-600">
                            {row.hours_known ? (
                              <>
                                {adminDateTime(row.starts_at)}
                                <br />
                                {adminDateTime(row.ends_at)}
                              </>
                            ) : (
                              'Hours not recorded'
                            )}
                          </p>
                          <span className="flex items-center gap-3">
                            <StatusBadge domain="visit" state={row.state} />
                            <ChevronRight className="size-4" aria-hidden="true" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AdminEmpty
                    title="No visits scheduled today"
                    description="No visits were returned for today in this environment."
                  />
                )}
              </div>
              <p className="mt-3 text-meta text-ink-600">
                {bookings.metrics.find((m) => m.key === 'visits')?.value} visits in total; up to
                eight shown. {bookings.visits.hours_unknown} with hours not recorded.
              </p>
            </section>
          ) : null}
        </>
      ) : null}
      {view === 'analytics' ? (
        <>
          {period.length ? (
            <section>
              <SectionHeading title="Selected-period totals">
                Each measure uses its own date basis. Booked rent, captures and refunds are separate
                measures.
              </SectionHeading>
              <div className={groupClass}>
                <dl className="grid sm:grid-cols-2">
                  {period.map((m) => (
                    <div key={m.key} className="border-b border-border p-5 last:border-b-0 sm:p-6">
                      <dt>
                        <Link href={m.href} className={linkClass}>
                          {m.label}
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                      </dt>
                      <dd className="mt-1 break-words text-h2 font-semibold text-ink-900 tabular">
                        {value(m)}
                      </dd>
                      <dd className="mt-2 max-w-[65ch] text-meta leading-6 text-ink-600">
                        {m.dateBasis}
                        {m.availability === 'unavailable'
                          ? '. No provider capture evidence in this scope.'
                          : ''}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          ) : null}
          <AdminAnalytics key={`${scope.period}-${scope.environment}`} modules={modules} />
          {!period.length && !bookings && !applications && Object.keys(modules).length ? (
            <AdminEmpty
              title="No analytics available"
              description="Analytics need access to booking, financial or application data."
            />
          ) : null}
        </>
      ) : null}
      {view === 'activity' ? (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {applications ? (
            <section className="min-w-0">
              <SectionHeading
                title="Recent decisions"
                href={applications.historyHref}
                action="All decisions"
              >
                Recorded decisions in the selected IST period.
              </SectionHeading>
              <div className={groupClass}>
                {applications.recentActivity.length ? (
                  <ul className="divide-y divide-border">
                    {applications.recentActivity.map((row) => (
                      <li key={row.id}>
                        <Link
                          href={row.href}
                          className="flex flex-wrap items-start gap-3 px-5 py-5 hover:bg-ink-25 sm:px-6"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-base font-semibold text-ink-900">
                              {row.label}
                            </p>
                            <p className="mt-1 text-meta text-ink-600">{adminDateTime(row.at)}</p>
                          </div>
                          <StatusBadge domain="application" state={row.state} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AdminEmpty
                    title="No decisions in this period"
                    description="Recorded application decisions will appear here."
                  />
                )}
              </div>
            </section>
          ) : null}
          {health ? (
            <section className="min-w-0">
              <SectionHeading
                title="Service observations"
                href={health.href}
                action="Service health"
              >
                Recorded observations, not a live uptime guarantee.
              </SectionHeading>
              <div className={groupClass}>
                {health.services.length ? (
                  <ul className="divide-y divide-border">
                    {health.services.map((row) => (
                      <li
                        key={row.service}
                        className="flex flex-wrap items-start gap-3 px-5 py-5 sm:px-6"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-base font-semibold text-ink-900">
                            {humaniseStatus(row.service)}
                          </p>
                          <p className="mt-1 text-meta text-ink-600">
                            Checked {adminDateTime(row.checked_at)}
                          </p>
                        </div>
                        <StatusBadge
                          tone={row.stale ? 'neutral' : row.healthy ? 'success' : 'warning'}
                        >
                          {row.stale
                            ? 'Stale observation'
                            : row.healthy
                              ? 'Healthy'
                              : 'Needs attention'}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <AdminEmpty
                    title="No service observations recorded"
                    description="Service health is unavailable until an observation is recorded."
                  />
                )}
              </div>
            </section>
          ) : null}
          {!applications && !health && Object.keys(modules).length ? (
            <AdminEmpty
              title="No activity available"
              description="This view needs access to application decisions or service observations."
            />
          ) : null}
        </div>
      ) : null}
    </AdminPage>
  );
}
