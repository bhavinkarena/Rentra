import Link from 'next/link';
import { Users } from 'lucide-react';
import CopyReference from '@/components/customer/checkout/CopyReference';
import ClientLifecyclePanel from './ClientLifecyclePanel';
import { AdminEmpty, AdminPage, AdminPageHeader, Pager, StatusBadge } from './AdminPrimitives';

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
const label = (value) => String(value ?? '—').replaceAll('_', ' ');
const when = (value, options = { dateStyle: 'medium' }) =>
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

function Panel({ id, title, children, className = '' }) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={`scroll-mt-24 rounded-lg border border-border bg-card p-5 ${className}`}
    >
      <h2 id={`${id}-title`} className="text-h4 font-bold text-ink-900">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Fact({ term, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed border-border py-1.5 text-meta last:border-b-0">
      <dt className="shrink-0 text-ink-600">{term}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-ink-900">{children}</dd>
    </div>
  );
}

const SECTIONS = [
  ['#profile', 'Profile'],
  ['#application', 'Application'],
  ['#properties', 'Properties'],
  ['#upcoming', 'Upcoming visits'],
  ['#lifecycle', 'Account status'],
  ['#history', 'History'],
  ['#later', 'Not yet available'],
];

export function AdminClientDetail({ data, listHref: backHref = '/admin/clients' }) {
  const { client, application, listings, upcoming, history } = data;
  const title = client.name || client.email;
  return (
    <AdminPage width="max-w-6xl">
      <AdminPageHeader
        breadcrumbs={[{ href: backHref, label: 'Clients' }, { label: title }]}
        eyebrow={client.clientType === 'authorised_agent' ? 'Authorised agent' : 'Owner'}
        title={title}
        description={`${client.email ?? 'No email'} · joined ${when(client.createdAt)}`}
        action={
          <StatusBadge tone={statusTone(client.accountStatus)}>
            {STATUS[client.accountStatus]}
          </StatusBadge>
        }
      />
      <div className="mt-4">
        <CopyReference reference={client.id} label="Client ID" />
      </div>

      <nav aria-label="Sections" className="mt-5 flex flex-wrap gap-2 text-tiny font-semibold">
        {SECTIONS.map(([href, text]) => (
          <a
            key={href}
            href={href}
            className="inline-flex min-h-9 items-center rounded-full border border-border bg-card px-3 text-ink-700 hover:bg-ink-50"
          >
            {text}
          </a>
        ))}
      </nav>

      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-5">
          <Panel id="profile" title="Profile">
            <dl>
              <Fact term="Email">
                {client.email ?? '—'} {client.emailVerifiedAt ? '· verified' : '· not verified'}
              </Fact>
              <Fact term="Mobile">
                {client.phone ? `+91 ${client.phone}` : '—'}{' '}
                {client.phone ? (client.phoneVerifiedAt ? '· verified' : '· not verified') : ''}
              </Fact>
              <Fact term="KYC status">{label(client.kycStatus)}</Fact>
              <Fact term="Language">{client.preferredLocale}</Fact>
              <Fact term="Last sign-in">
                {when(client.lastLoginAt, { dateStyle: 'medium', timeStyle: 'short' })}
              </Fact>
            </dl>
          </Panel>

          <Panel id="application" title="Partner application">
            {application ? (
              <dl>
                <Fact term="Status">{label(application.status)}</Fact>
                <Fact term="Legal name">{application.legalName || '—'}</Fact>
                <Fact term="Submitted">{when(application.submittedAt)}</Fact>
                <Fact term="Reviewed">{when(application.reviewedAt)}</Fact>
                <Fact term="Strikes">{application.strikeCount} of 3</Fact>
                {application.decisionReason ? (
                  <Fact term="Last reason">&ldquo;{application.decisionReason}&rdquo;</Fact>
                ) : null}
                <div className="pt-3">
                  <Link
                    href={`/admin/applications/${application.id}`}
                    className="text-tiny font-bold text-brand-700 hover:underline"
                  >
                    Open application review →
                  </Link>
                </div>
              </dl>
            ) : (
              <p className="text-meta text-ink-600">No application started yet.</p>
            )}
          </Panel>

          <Panel id="properties" title={`Properties (${listings.length})`}>
            {listings.length ? (
              <ul className="divide-y divide-border">
                {listings.map((listing) => (
                  <li
                    key={listing.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink-900">{listing.title}</span>
                      <span className="text-tiny text-ink-500">
                        {listing.cityName ?? 'City not set'} · {listing.publicCode} · updated{' '}
                        {when(listing.updatedAt)}
                      </span>
                    </span>
                    <StatusBadge tone={listing.status === 'live' ? 'success' : 'neutral'}>
                      {label(listing.status)}
                    </StatusBadge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-meta text-ink-600">No properties yet.</p>
            )}
            {client.accountStatus !== 'active' && listings.some((l) => l.status === 'live') ? (
              <p className="mt-3 text-tiny text-ink-600">
                Live listings are hidden from the public while this account is not active.
              </p>
            ) : null}
          </Panel>

          <Panel id="upcoming" title={`Upcoming visits (${upcoming.total})`}>
            {upcoming.items.length ? (
              <>
                <ul className="divide-y divide-border">
                  {upcoming.items.map((visit) => (
                    <li
                      key={visit.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink-900">
                          {visit.day} · {label(visit.slot)} · {visit.listingTitle}
                        </span>
                        <span className="text-tiny text-ink-500">
                          {visit.reference} · {visit.guests} guest{visit.guests === 1 ? '' : 's'} ·{' '}
                          {when(visit.startsAt, {
                            timeZone: visit.timeZone,
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}{' '}
                          ({visit.timeZone})
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <StatusBadge tone="info">{label(visit.state)}</StatusBadge>
                        {visit.orderId ? (
                          <Link
                            href={`/admin/bookings/${visit.orderId}`}
                            className="text-tiny font-bold text-brand-700 hover:underline"
                          >
                            Booking<span className="sr-only"> {visit.orderReference}</span> →
                          </Link>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
                {upcoming.total > upcoming.items.length ? (
                  <p className="mt-2 text-tiny text-ink-500">
                    Showing the next {upcoming.items.length} of {upcoming.total}.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-meta text-ink-600">No upcoming visits.</p>
            )}
            {client.accountStatus === 'suspended' && upcoming.total ? (
              <p className="mt-3 rounded-md bg-info-bg p-3 text-tiny text-ink-700">
                Resolution path: these visits stay confirmed for customers. The client cannot sign
                in, so Rentra operates them from the admin booking records.
              </p>
            ) : null}
          </Panel>

          <Panel id="history" title="History">
            {history.length ? (
              <ol className="divide-y divide-border">
                {history.map((event) => (
                  <li key={event.id} className="py-2.5 text-meta">
                    <p className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono text-tiny text-ink-500">
                        {when(event.at, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                      <span className="font-semibold text-ink-900">{label(event.action)}</span>
                      <span className="text-tiny text-ink-500">
                        {event.adminEmail ? `by ${event.adminEmail}` : event.actorType}
                      </span>
                    </p>
                    {event.fromStatus || event.toStatus ? (
                      <p className="text-tiny text-ink-600">
                        {STATUS[event.fromStatus] ?? event.fromStatus} →{' '}
                        {STATUS[event.toStatus] ?? event.toStatus}
                      </p>
                    ) : null}
                    {event.reason ? (
                      <p className="text-tiny text-ink-600">&ldquo;{event.reason}&rdquo;</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-meta text-ink-600">No recorded activity.</p>
            )}
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <ClientLifecyclePanel clientId={client.id} preview={data.lifecycle} />

          <Panel id="later" title="Not yet available">
            <ul className="space-y-2 text-tiny text-ink-600">
              <li>
                <strong className="text-ink-800">Statements and payouts</strong> — arrive with
                payout destinations and statements (CP21–CP22).
              </li>
              <li>
                <strong className="text-ink-800">Team and caretakers</strong> — arrive with team
                access (CP16).
              </li>
              <li>
                <strong className="text-ink-800">Ownership transfer</strong> — unavailable. Moving a
                property to another client needs a reviewed transfer that preserves historical
                booking and payee attribution; there is no owner-ID edit.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </AdminPage>
  );
}
