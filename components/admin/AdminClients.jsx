import Link from 'next/link';
import { CalendarDays, Clock, Mail, Phone, Users } from 'lucide-react';
import AccountLifecyclePanel from './AccountLifecyclePanel';
import { changeClientLifecycle } from '@/lib/actions/admin';
import { AdminEmpty, AdminPage, AdminPageHeader, Pager, StatusBadge } from './AdminPrimitives';
import {
  DetailHeader,
  DetailTabs,
  FieldGrid,
  MetricStrip,
  Row,
  RowList,
  SectionCard,
  pickTab,
} from '@/components/portal/DetailLayout';

const STATUS = {
  all: 'All',
  active: 'Active',
  pending_application: 'Onboarding',
  suspended: 'Suspended',
  blocked: 'Blocked',
};
const statusTone = (status) =>
  status === 'active'
    ? 'success'
    : status === 'suspended' || status === 'blocked'
      ? 'danger'
      : 'warning';
export const label = (value) => String(value ?? '—').replaceAll('_', ' ');
export const when = (value, options = { dateStyle: 'medium' }) =>
  value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', ...options }) : '—';

function listHref({ q, status, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status && status !== 'all') params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/clients?${query}` : '/admin/clients';
}

export function AdminClientList({ data }) {
  const here = listHref(data);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="People"
        title="Clients"
        description="Owners and authorised agents: onboarding, properties, upcoming visits and account status."
      />

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([key, text]) => (
          <Link
            key={key}
            href={listHref({ q: data.q, status: key, page: 1 })}
            aria-current={data.status === key ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-tiny font-semibold ${
              data.status === key
                ? 'border-brand-700 bg-brand-700 text-white'
                : 'border-border bg-card text-ink-700 hover:bg-ink-50'
            }`}
          >
            {text}
            <span className="tabular">{data.counts[key]}</span>
          </Link>
        ))}
      </nav>

      <section
        className="mt-4 overflow-hidden rounded-lg border border-border bg-card shadow-xs"
        aria-labelledby="client-list-title"
      >
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="client-list-title" className="text-h4 font-bold text-ink-900">
              {STATUS[data.status]} clients
            </h2>
            <p className="mt-1 text-tiny text-ink-500">
              Newest first · Loaded {when(new Date(), { timeStyle: 'short' })}
            </p>
          </div>
          <form action="/admin/clients" className="flex items-end gap-2" role="search">
            {data.status !== 'all' ? (
              <input type="hidden" name="status" value={data.status} />
            ) : null}
            <label className="text-tiny font-semibold text-ink-600">
              Name, email or phone
              <input
                name="q"
                defaultValue={data.q}
                maxLength={100}
                className="mt-1 block min-h-10 w-56 max-w-full rounded-md border border-border bg-white px-3 text-meta"
              />
            </label>
            <button className="min-h-10 rounded-md bg-brand-700 px-4 text-tiny font-semibold text-white">
              Search
            </button>
          </form>
        </div>

        {data.items.length ? (
          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Clients table"
          >
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-ink-25 text-[0.65rem] font-bold tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Properties</th>
                  <th className="px-4 py-3">Upcoming visits</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((client) => (
                  <tr key={client.id} className="hover:bg-ink-25">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900">{client.name || 'Name not set'}</p>
                      <p className="mt-0.5 text-tiny break-all text-ink-500">{client.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={statusTone(client.accountStatus)}>
                        {STATUS[client.accountStatus]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600 capitalize">
                      {label(client.applicationStatus)}
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600 tabular">
                      {client.liveCount} live / {client.listingCount}
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600 tabular">
                      {client.upcomingVisits}
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600">{when(client.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="text-tiny font-bold text-brand-700 hover:underline"
                        href={`/admin/clients/${client.id}?from=${encodeURIComponent(here)}`}
                      >
                        Open<span className="sr-only"> {client.name || client.email}</span> →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            icon={Users}
            title={data.q ? 'No clients match this search' : 'No clients in this view'}
            description="Try another status or a shorter search."
          />
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="text-tiny text-ink-500">
            {data.total} client{data.total === 1 ? '' : 's'} · page {data.page} of {data.pages}
          </p>
          <Pager
            page={data.page}
            hasNext={data.page < data.pages}
            previousHref={listHref({ ...data, page: data.page - 1 })}
            nextHref={listHref({ ...data, page: data.page + 1 })}
          />
        </footer>
      </section>
    </AdminPage>
  );
}

const CLIENT_TABS = (data) => [
  { key: 'overview', label: 'Overview' },
  { key: 'properties', label: 'Properties', count: data.listings.length },
  { key: 'visits', label: 'Upcoming visits', count: data.upcoming.total },
  { key: 'application', label: 'Application' },
  { key: 'account', label: 'Account details' },
  { key: 'history', label: 'Activity log', count: data.history.length },
];

function VisitRow({ visit }) {
  return (
    <Row
      primary={`${visit.day} · ${label(visit.slot)} · ${visit.listingTitle}`}
      secondary={`${visit.reference} · ${visit.guests} guest${visit.guests === 1 ? '' : 's'} · ${when(visit.startsAt, { timeZone: visit.timeZone, dateStyle: 'medium', timeStyle: 'short' })} (${visit.timeZone})`}
      trailing={<StatusBadge tone="info">{label(visit.state)}</StatusBadge>}
      href={visit.orderId ? `/admin/bookings/${visit.orderId}` : null}
      hrefLabel={
        <>
          Booking<span className="sr-only"> {visit.orderReference}</span>
        </>
      }
    />
  );
}

function ListingRow({ listing }) {
  return (
    <Row
      primary={listing.title}
      secondary={`${listing.cityName ?? 'City not set'} · ${listing.publicCode} · updated ${when(listing.updatedAt)}`}
      trailing={
        <StatusBadge tone={listing.status === 'live' ? 'success' : 'neutral'}>
          {label(listing.status)}
        </StatusBadge>
      }
    />
  );
}

export function HistoryList({ history, statuses = STATUS }) {
  return (
    <RowList
      items={history}
      empty="No recorded activity."
      render={(event) => (
        <li key={event.id} className="flex gap-3 px-5 py-3.5 text-meta">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-600" aria-hidden="true" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink-900 capitalize">
              {label(event.action)}
            </span>
            <span className="block text-tiny text-ink-500">
              {when(event.at, { dateStyle: 'medium', timeStyle: 'short' })} ·{' '}
              {event.adminEmail ? `by ${event.adminEmail}` : event.actorType}
            </span>
            {event.fields ? (
              <span className="block text-tiny text-ink-600">
                Fields: {event.fields.join(', ')}
              </span>
            ) : null}
            {event.fromStatus || event.toStatus ? (
              <span className="block text-tiny text-ink-600">
                {statuses[event.fromStatus] ?? event.fromStatus} →{' '}
                {statuses[event.toStatus] ?? event.toStatus}
              </span>
            ) : null}
            {event.revoked != null ? (
              <span className="block text-tiny text-ink-600">{event.revoked} session(s) ended</span>
            ) : null}
            {event.reason ? (
              <span className="block text-tiny text-ink-600">&ldquo;{event.reason}&rdquo;</span>
            ) : null}
          </span>
        </li>
      )}
    />
  );
}

function NotYetAvailable() {
  return (
    <SectionCard id="later" title="Not yet available">
      <ul className="space-y-2 text-tiny text-ink-600">
        <li>
          <strong className="text-ink-800">Statements and payouts</strong> — arrive with payout
          destinations and statements (CP21–CP22).
        </li>
        <li>
          <strong className="text-ink-800">Team and caretakers</strong> — arrive with team access
          (CP16).
        </li>
        <li>
          <strong className="text-ink-800">Ownership transfer</strong> — unavailable. Moving a
          property to another client needs a reviewed transfer that preserves historical booking and
          payee attribution; there is no owner-ID edit.
        </li>
      </ul>
    </SectionCard>
  );
}

export function AdminClientDetail({ data, listHref: backHref = '/admin/clients', tab, params }) {
  const { client, application, listings, upcoming, history } = data;
  const title = client.name || client.email;
  const tabs = CLIENT_TABS(data);
  const active = pickTab(tab, tabs);
  const live = listings.filter((listing) => listing.status === 'live').length;
  const strikes = application?.strikeCount ?? 0;
  const lifecycle = (
    <AccountLifecyclePanel
      subjectId={client.id}
      preview={data.lifecycle}
      command={changeClientLifecycle}
    />
  );
  const hiddenNote =
    client.accountStatus !== 'active' && live ? (
      <p className="px-5 pb-4 text-tiny text-ink-600">
        Live listings are hidden from the public while this account is not active.
      </p>
    ) : null;
  const visitRows = (items) => (
    <RowList
      items={items}
      empty="No upcoming visits."
      render={(visit) => <VisitRow key={visit.id} visit={visit} />}
    />
  );
  const listingRows = (items) => (
    <RowList
      items={items}
      empty="No properties yet."
      render={(listing) => <ListingRow key={listing.id} listing={listing} />}
    />
  );

  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: backHref, label: 'Clients' }, { label: title }]}
        title={title}
        badges={[
          { label: STATUS[client.accountStatus], tone: statusTone(client.accountStatus) },
          {
            label: client.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner',
            tone: 'info',
          },
          application
            ? {
                label: `Application ${label(application.status)}`,
                tone: application.status === 'approved' ? 'success' : 'warning',
              }
            : null,
        ].filter(Boolean)}
        id={{ label: 'Client ID', value: client.id, display: client.id.slice(0, 8) }}
        chips={[
          { icon: Mail, value: client.email ?? 'No email' },
          client.phone ? { icon: Phone, value: `+91 ${client.phone}` } : null,
          { icon: CalendarDays, label: 'Joined', value: when(client.createdAt) },
          {
            icon: Clock,
            label: 'Last sign-in',
            value: when(client.lastLoginAt, { dateStyle: 'medium', timeStyle: 'short' }),
          },
        ]}
      />

      <MetricStrip
        items={[
          {
            label: 'Live properties',
            value: `${live} / ${listings.length}`,
            hint: 'live of all',
            tone: live ? 'success' : 'neutral',
          },
          { label: 'Upcoming visits', value: upcoming.total, hint: 'confirmed or in progress' },
          {
            label: 'Open sessions',
            value: data.lifecycle.effects.openSessions,
            hint: 'portal sign-ins',
          },
          {
            label: 'Application',
            value: application ? label(application.status) : 'Not started',
            hint: 'Gate 1',
          },
          {
            label: 'Strikes',
            value: `${strikes} / 3`,
            hint: 'rejections',
            tone: strikes >= 2 ? 'danger' : 'neutral',
          },
          {
            label: 'Identity',
            value: client.kycStatus === 'verified' ? 'Reviewed' : label(client.kycStatus),
            hint: client.kycStatus === 'verified' ? 'by Rentra staff' : 'documents',
          },
        ]}
      />

      <DetailTabs
        tabs={tabs}
        active={active}
        basePath={`/admin/clients/${client.id}`}
        params={params}
      />

      <div className="mt-6">
        {active === 'overview' ? (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <SectionCard
                id="upcoming"
                title="Next visits"
                description={upcoming.total ? `${upcoming.total} upcoming` : undefined}
                flush
              >
                {visitRows(upcoming.items.slice(0, 5))}
              </SectionCard>
              <SectionCard id="properties-summary" title="Properties" flush>
                {listingRows(listings.slice(0, 5))}
                {hiddenNote}
              </SectionCard>
              <NotYetAvailable />
            </div>
            <div className="space-y-5 lg:sticky lg:top-24">{lifecycle}</div>
          </div>
        ) : null}

        {active === 'properties' ? (
          <SectionCard
            id="properties"
            title="All properties"
            description="Newest change first"
            flush
          >
            {listingRows(listings)}
            {hiddenNote}
          </SectionCard>
        ) : null}

        {active === 'visits' ? (
          <SectionCard
            id="upcoming"
            title="Upcoming visits"
            description={
              upcoming.total > upcoming.items.length
                ? `Showing the next ${upcoming.items.length} of ${upcoming.total}`
                : 'Times in the property timezone'
            }
            flush
          >
            {visitRows(upcoming.items)}
            {client.accountStatus === 'suspended' && upcoming.total ? (
              <p className="m-5 rounded-md bg-info-bg p-3 text-tiny text-ink-700">
                Resolution path: these visits stay confirmed for customers. The client cannot sign
                in, so Rentra operates them from the admin booking records.
              </p>
            ) : null}
          </SectionCard>
        ) : null}

        {active === 'application' ? (
          <SectionCard
            id="application"
            title="Partner application"
            action={
              application ? (
                <Link
                  href={`/admin/applications/${application.id}`}
                  className="text-tiny font-bold text-brand-700 hover:underline"
                >
                  Open application review →
                </Link>
              ) : null
            }
          >
            {application ? (
              <FieldGrid
                fields={[
                  { label: 'Status', value: label(application.status) },
                  { label: 'Legal name', value: application.legalName || '—' },
                  { label: 'Submitted', value: when(application.submittedAt) },
                  { label: 'Reviewed', value: when(application.reviewedAt) },
                  { label: 'Strikes', value: `${application.strikeCount} of 3` },
                  application.decisionReason
                    ? { label: 'Last reason', value: `“${application.decisionReason}”` }
                    : null,
                ]}
              />
            ) : (
              <p className="text-meta text-ink-600">No application started yet.</p>
            )}
          </SectionCard>
        ) : null}

        {active === 'account' ? (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <SectionCard id="profile" title="Account details">
              <FieldGrid
                fields={[
                  { label: 'Client ID', value: client.id, mono: true },
                  { label: 'Name', value: client.name || '—' },
                  {
                    label: 'Email',
                    value: `${client.email ?? '—'}${client.emailVerifiedAt ? ' · verified' : ''}`,
                  },
                  {
                    label: 'Mobile',
                    value: client.phone
                      ? `+91 ${client.phone}${client.phoneVerifiedAt ? ' · verified' : ''}`
                      : '—',
                  },
                  {
                    label: 'Listing as',
                    value: client.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner',
                  },
                  {
                    label: 'Identity documents',
                    value:
                      client.kycStatus === 'verified'
                        ? 'Reviewed by Rentra staff'
                        : label(client.kycStatus),
                  },
                  { label: 'Language', value: client.preferredLocale },
                  { label: 'Account status', value: STATUS[client.accountStatus] },
                  {
                    label: 'Joined',
                    value: when(client.createdAt, { dateStyle: 'medium', timeStyle: 'short' }),
                  },
                  {
                    label: 'Last sign-in',
                    value: when(client.lastLoginAt, { dateStyle: 'medium', timeStyle: 'short' }),
                  },
                ]}
              />
            </SectionCard>
            <div className="space-y-5 lg:sticky lg:top-24">{lifecycle}</div>
          </div>
        ) : null}

        {active === 'history' ? (
          <SectionCard
            id="history"
            title="Activity log"
            description="Latest 50 account and application events"
            flush
          >
            <HistoryList history={history} />
          </SectionCard>
        ) : null}
      </div>
    </AdminPage>
  );
}
