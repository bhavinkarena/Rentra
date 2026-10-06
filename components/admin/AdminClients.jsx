import PeopleDirectory from './PeopleDirectory';
import CopyChip from '@/components/portal/CopyChip';
import { detailTabHref } from '@/lib/domain/detail-navigation';
import { buttonVariants } from '@/components/ui/button';
import Link from '@/components/navigation/NavigationLink';
import { randomUUID } from 'node:crypto';
import AccountLifecyclePanel from './AccountLifecyclePanel';
import { FailDestinationForm } from './PayoutDestinationAdmin';
import { changeClientLifecycle } from '@/lib/actions/admin';
import { AdminPage, AdminPageHeader, AdminReadOnly, StatusBadge } from './AdminPrimitives';
import { adminDateTime } from '@/lib/domain/admin-display';
import { bookingTime, describeVisit } from '@/lib/domain/booking-record';
import {
  DetailTabs,
  FieldGrid,
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

export function AdminClientList({ data }) {
  return <PeopleDirectory type="clients" data={data} statuses={STATUS} />;
}

const CLIENT_TABS = (data) => [
  { key: 'overview', label: 'Overview' },
  { key: 'properties', label: 'Properties', count: data.listings.length },
  { key: 'visits', label: 'Visits', count: data.upcoming.total },
  { key: 'application', label: 'Application' },
  { key: 'account', label: 'Account' },
  {
    key: 'payout',
    label: 'Payout',
    count: data.payoutDestinations?.history?.length ?? 0,
  },
  { key: 'history', label: 'Activity', count: data.history.length },
];

function VisitRow({ visit, canReadRecords }) {
  return (
    <Row
      primary={`${describeVisit(visit, { timeZone: visit.timeZone })} / ${visit.listingTitle}`}
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
            <span className="block text-meta text-ink-500">
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
    <AdminPage className="[&_dt]:text-meta [&_dt]:font-medium [&_dt]:tracking-normal [&_dt]:normal-case [&_.text-tiny]:text-meta [&_h2+p]:text-meta">
      <AdminPageHeader
        title={title}
        description={
          client.email || (client.phone ? `+91 ${client.phone}` : 'Contact not recorded')
        }
        backHref={backHref}
        backLabel={backHref.startsWith('/admin/search') ? 'Search results' : 'Owners'}
        action={
          <Link
            href={detailTabHref(`/admin/clients/${client.id}`, 'account', tabs, params)}
            className={buttonVariants({ variant: 'outline' })}
          >
            Manage account
          </Link>
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge tone={statusTone(client.accountStatus)}>
          {STATUS[client.accountStatus]}
        </StatusBadge>
        <CopyChip label="Owners ID" value={client.id} display={client.id.slice(0, 8)} />
        <span className="text-meta text-ink-600">
          {client.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner'}
        </span>
      </div>
      <DetailTabs
        wrap
        tabs={tabs}
        active={active}
        basePath={`/admin/clients/${client.id}`}
        params={params}
      />

      <div className="mt-6">
        {active === 'overview' ? (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
            </div>
            <SectionCard title="Owner context">
              <dl className="space-y-4 text-meta">
                <div>
                  <dt className="text-ink-600">Mobile</dt>
                  <dd className="mt-1 break-words">
                    {client.phone ? `+91 ${client.phone}` : 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Properties</dt>
                  <dd className="mt-1 tabular">
                    {live} live / {listings.length} total
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Application</dt>
                  <dd className="mt-1">
                    {application ? label(application.status) : 'Not started'} / {strikes} of 3
                    strikes
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Identity documents</dt>
                  <dd className="mt-1">
                    {client.kycStatus === 'verified'
                      ? 'Reviewed by Rentra staff'
                      : label(client.kycStatus)}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Open sessions</dt>
                  <dd className="mt-1 tabular">{data.lifecycle.effects.openSessions}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Joined</dt>
                  <dd className="mt-1">{when(client.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Last sign-in</dt>
                  <dd className="mt-1">{when(client.lastLoginAt)}</dd>
                </div>
              </dl>
            </SectionCard>
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
              <p className="m-5 rounded-md bg-info-bg p-3 text-meta text-ink-700">
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
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
            <AccountBoundaries />
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
                <ol className="divide-y divide-border [&_details]:rounded-none [&_details]:border-0 [&_details]:p-0">
                  {data.payoutDestinations.history.map((d) => (
                    <li key={d.id} className="space-y-2 py-5 first:pt-0 last:pb-0">
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
