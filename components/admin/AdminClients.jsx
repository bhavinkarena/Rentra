import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { CalendarDays, Clock, Mail, Phone, Users } from 'lucide-react';
import { randomUUID } from 'node:crypto';
import AccountLifecyclePanel from './AccountLifecyclePanel';
import { FailDestinationForm } from './PayoutDestinationAdmin';
import { changeClientLifecycle } from '@/lib/actions/admin';
import {
  AdminEmpty,
  AdminPage,
  AdminPageHeader,
  AdminFilterBar,
  AdminTable,
  AdminReadOnly,
  StatusBadge,
} from './AdminPrimitives';
import { fieldClass } from '@/components/ui/field';
import { adminDateTime } from '@/lib/domain/admin-display';
import { bookingTime } from '@/lib/domain/booking-record';
import Pagination from '@/components/ui/pagination';
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
export const label = (value) =>
  String(value ?? '—')
    .replaceAll('_', ' ')
    .replace(/\bclient\b/gi, 'owner');
export const when = adminDateTime;

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
        title="Owners"
        description="Owners and authorised agents: onboarding, properties, upcoming visits and account status."
      />

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([key, text]) => (
          <Link
            key={key}
            href={listHref({ q: data.q, status: key, page: 1 })}
            aria-current={data.status === key ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-md border px-3 text-meta font-semibold ${
              data.status === key
                ? 'border-brand-700 bg-primary text-white'
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
        <AdminFilterBar label="Owners filters" className="border-b border-border">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="client-list-title" className="text-h4 font-bold text-ink-900">
                {STATUS[data.status]} owners
              </h2>
              <p className="mt-1 text-meta text-ink-600">
                Newest first · {data.total} matching owners
              </p>
            </div>
            <Form
              action="/admin/clients"
              className="flex min-w-0 flex-wrap items-end gap-2"
              role="search"
            >
              {data.status !== 'all' ? (
                <input type="hidden" name="status" value={data.status} />
              ) : null}
              <label className="min-w-0 flex-1 text-meta font-semibold text-ink-600">
                Name, email or phone
                <input
                  name="q"
                  defaultValue={data.q}
                  maxLength={100}
                  className={`${fieldClass} mt-1 sm:w-56`}
                />
              </label>
              <button className="min-h-11 rounded-md bg-primary px-4 text-meta font-semibold text-white hover:bg-primary-hover">
                Search
              </button>
            </Form>
          </div>
        </AdminFilterBar>

        {data.items.length ? (
          <AdminTable
            label="Owners table"
            columns={[
              'Owner',
              'Status',
              'Application',
              'Properties',
              'Upcoming visits',
              'Joined',
              'Actions',
            ]}
            minWidth={820}
            framed={false}
          >
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
                <td className="px-4 py-4 text-meta text-ink-600 capitalize">
                  {label(client.applicationStatus)}
                </td>
                <td className="px-4 py-4 text-meta text-ink-600 tabular">
                  {client.liveCount} live / {client.listingCount}
                </td>
                <td className="px-4 py-4 text-meta text-ink-600 tabular">
                  {client.upcomingVisits}
                </td>
                <td className="px-4 py-4 text-meta text-ink-600">{when(client.createdAt)}</td>
                <td className="px-5 py-4 text-right">
                  <Link
                    className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
                    href={`/admin/clients/${client.id}?from=${encodeURIComponent(here)}`}
                  >
                    View<span className="sr-only"> owner {client.name || client.email}</span>
                  </Link>
                </td>
              </tr>
            ))}
          </AdminTable>
        ) : (
          <AdminEmpty
            icon={Users}
            title={data.q ? 'No owners match this search' : 'No owners in this view'}
            description="Try another status or a shorter search."
          />
        )}

        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          pages={data.pages}
          pageSizes={null}
          label="Owner pages"
          noun="owners"
          className="border-t border-border px-5 py-4"
        />
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
  {
    key: 'payout',
    label: 'Payout destinations',
    count: data.payoutDestinations?.history?.length ?? 0,
  },
  { key: 'history', label: 'Activity log', count: data.history.length },
];

function VisitRow({ visit, canReadRecords }) {
  return (
    <Row
      primary={`${visit.slot === 'hourly' ? visit.label : `${visit.day} · ${label(visit.slot)}`} · ${visit.listingTitle}`}
      secondary={`${visit.reference} · ${visit.guests} guest${visit.guests === 1 ? '' : 's'} · ${bookingTime(visit.startsAt, visit.timeZone)} (${visit.timeZone})`}
      trailing={<StatusBadge tone="info">{label(visit.state)}</StatusBadge>}
      href={canReadRecords && visit.orderId ? `/admin/bookings/${visit.orderId}` : null}
      hrefLabel={
        <>
          Booking<span className="sr-only"> {visit.orderReference}</span>
        </>
      }
    />
  );
}

function ListingRow({ listing, canReadProperties }) {
  return (
    <Row
      primary={listing.title}
      secondary={`${listing.cityName ?? 'City not set'} · ${listing.publicCode} · updated ${when(listing.updatedAt)}`}
      trailing={
        <StatusBadge tone={listing.status === 'live' ? 'success' : 'neutral'}>
          {label(listing.status)}
        </StatusBadge>
      }
      href={canReadProperties ? `/admin/properties/${listing.id}` : null}
      hrefLabel={
        <>
          Review property<span className="sr-only"> {listing.title}</span>
        </>
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
              <span className="block text-meta text-ink-600">
                Fields: {event.fields.join(', ')}
              </span>
            ) : null}
            {event.fromStatus || event.toStatus ? (
              <span className="block text-meta text-ink-600">
                {statuses[event.fromStatus] ?? event.fromStatus} →{' '}
                {statuses[event.toStatus] ?? event.toStatus}
              </span>
            ) : null}
            {event.revoked != null ? (
              <span className="block text-meta text-ink-600">{event.revoked} session(s) ended</span>
            ) : null}
            {event.reason ? (
              <span className="block text-meta text-ink-600">&ldquo;{event.reason}&rdquo;</span>
            ) : null}
          </span>
        </li>
      )}
    />
  );
}

function AccountBoundaries() {
  return (
    <SectionCard id="account-boundaries" title="Account boundaries">
      <ul className="space-y-2 text-meta text-ink-600">
        <li>Admin and owner sessions stay separate. Staff cannot sign in as this owner.</li>
        <li>
          <strong className="text-ink-800">Ownership transfer</strong> — unavailable. Moving a
          property to another owner needs a reviewed transfer that preserves historical booking and
          payee attribution; there is no owner-ID edit.
        </li>
      </ul>
    </SectionCard>
  );
}

export function AdminClientDetail({
  data,
  listHref: backHref = '/admin/clients',
  tab,
  params,
  capabilities = [],
}) {
  const { client, application, listings, upcoming, history } = data;
  const title = client.name || client.email;
  const tabs = CLIENT_TABS(data);
  const active = pickTab(tab, tabs);
  const live = listings.filter((listing) => listing.status === 'live').length;
  const strikes = application?.strikeCount ?? 0;
  const canWrite = capabilities.includes('admin.clients.write');
  const canReadProperties = capabilities.includes('admin.properties.read');
  const canReadRecords = capabilities.includes('admin.records.read');
  const lifecycle = (
    <AccountLifecyclePanel
      subjectId={client.id}
      preview={{
        ...data.lifecycle,
        consequences: data.lifecycle.consequences.map((line) =>
          line.replace(/\bclient\b/gi, 'owner'),
        ),
      }}
      command={changeClientLifecycle}
      canWrite={canWrite}
    />
  );
  const hiddenNote =
    client.accountStatus !== 'active' && live ? (
      <p className="px-5 pb-4 text-meta text-ink-600">
        Live listings are hidden from the public while this account is not active.
      </p>
    ) : null;
  const visitRows = (items) => (
    <RowList
      items={items}
      empty="No upcoming visits."
      render={(visit) => <VisitRow key={visit.id} visit={visit} canReadRecords={canReadRecords} />}
    />
  );
  const listingRows = (items) => (
    <RowList
      items={items}
      empty="No properties yet."
      render={(listing) => (
        <ListingRow key={listing.id} listing={listing} canReadProperties={canReadProperties} />
      )}
    />
  );

  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: backHref, label: 'Owners' }, { label: title }]}
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
        id={{ label: 'Owner ID', value: client.id, display: client.id.slice(0, 8) }}
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
              <AccountBoundaries />
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
                Resolution path: these visits stay confirmed for customers. The owner cannot sign
                in, so Rentra operates them from the admin booking records.
              </p>
            ) : null}
          </SectionCard>
        ) : null}

        {active === 'application' ? (
          <SectionCard
            id="application"
            title="Owner application"
            action={
              application && capabilities.includes('admin.applications.read') ? (
                <Link
                  href={`/admin/applications/${application.id}`}
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
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
                  { label: 'Owner ID', value: client.id, mono: true },
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

        {active === 'payout' && data.payoutDestinations ? (
          <SectionCard
            id="payout"
            title="Payout destinations"
            description="Versions are append-only; payouts keep the version they were created with. Provider verification is not available, so no version can be marked verified here."
          >
            <div className="space-y-4 text-meta">
              <p
                role="status"
                className="rounded-md border border-warning/25 bg-warning-bg p-3 text-warning"
              >
                <strong>
                  {data.payoutDestinations.readiness.ready ? 'Ready.' : 'Payouts disabled.'}
                </strong>{' '}
                {data.payoutDestinations.readiness.reason}
              </p>
              {data.payoutDestinations.history.length ? (
                <ol className="space-y-3">
                  {data.payoutDestinations.history.map((d) => (
                    <li key={d.id} className="space-y-1 rounded-md border border-border p-3">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        Version {d.version} · {d.masked}{' '}
                        <StatusBadge
                          tone={
                            d.state === 'failed'
                              ? 'danger'
                              : d.state === 'verified'
                                ? 'success'
                                : d.state === 'submitted'
                                  ? 'warning'
                                  : 'neutral'
                          }
                        >
                          {d.stateLabel}
                        </StatusBadge>
                      </p>
                      <p className="text-ink-600">
                        {d.holderName} · name comparison: {d.nameCheck} (not verification) · source{' '}
                        {d.source} · open payouts pinned: {d.pinnedPayouts}
                      </p>
                      {d.state === 'failed' ? (
                        <p className="text-danger">
                          Failed by {d.decidedBy ?? 'admin'}: {d.failureReason}
                        </p>
                      ) : null}
                      {canWrite && ['submitted', 'verified'].includes(d.state) ? (
                        <FailDestinationForm
                          key={`${d.id}-${d.state}`}
                          clientId={client.id}
                          destination={d}
                          requestKey={randomUUID()}
                        />
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No payout destination submitted.</p>
              )}
              {!canWrite ? (
                <AdminReadOnly>
                  Inspect payout methods and history. Marking a method failed requires owners write
                  permission.
                </AdminReadOnly>
              ) : null}
            </div>
          </SectionCard>
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
