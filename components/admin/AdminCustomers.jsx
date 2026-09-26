import Link from 'next/link';
import { CalendarDays, Clock, Mail, Phone, UserRound } from 'lucide-react';
import AccountLifecyclePanel from './AccountLifecyclePanel';
import { CustomerProfileCorrection, CustomerSessionRevocation } from './CustomerAccountForms';
import { HistoryList, label, when } from './AdminClients';
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
import { AdminEmpty, AdminPage, AdminPageHeader, Pager, StatusBadge } from './AdminPrimitives';
import { customerAccountCommand } from '@/lib/actions/admin';

const STATUS = {
  all: 'All',
  active: 'Active',
  pending_application: 'Not activated',
  suspended: 'Restricted',
  blocked: 'Blocked',
};
const verbsFor = (status) => ({
  suspend: 'Restrict access',
  reinstate: status === 'pending_application' ? 'Activate access' : 'Reinstate access',
});
const tone = (status) =>
  status === 'active' ? 'success' : status === 'pending_application' ? 'warning' : 'danger';

function listHref({ q, status, page }) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (status && status !== 'all') params.set('status', status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/customers?${query}` : '/admin/customers';
}

export function AdminCustomerList({ data }) {
  const here = listHref(data);
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="People"
        title="Customers"
        description="Guest accounts with their bookings, support, reviews and privacy requests."
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
        aria-labelledby="customer-list-title"
      >
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="customer-list-title" className="text-h4 font-bold text-ink-900">
              {STATUS[data.status]} customers
            </h2>
            <p className="mt-1 text-tiny text-ink-500">
              Newest first · Loaded {when(new Date(), { timeStyle: 'short' })}
            </p>
          </div>
          <form action="/admin/customers" className="flex items-end gap-2" role="search">
            {data.status !== 'all' ? (
              <input type="hidden" name="status" value={data.status} />
            ) : null}
            <label className="text-tiny font-semibold text-ink-600">
              Name, email or phone digits
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
            aria-label="Customers table"
          >
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-ink-25 text-[0.65rem] font-bold tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Bookings</th>
                  <th className="px-4 py-3">Open support</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((customer) => (
                  <tr key={customer.id} className="hover:bg-ink-25">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900">
                        {customer.name || 'Name not set'}
                      </p>
                      <p className="mt-0.5 text-tiny break-all text-ink-500">
                        {customer.email || 'No email'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-meta text-ink-700 tabular">
                      {customer.phone ? `+91 ${customer.phone}` : '—'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={tone(customer.accountStatus)}>
                        {STATUS[customer.accountStatus] ?? label(customer.accountStatus)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600 tabular">
                      {customer.orderCount}
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600 tabular">
                      {customer.openSupport}
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600">{when(customer.createdAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="text-tiny font-bold text-brand-700 hover:underline"
                        href={`/admin/customers/${customer.id}?from=${encodeURIComponent(here)}`}
                      >
                        Open
                        <span className="sr-only"> {customer.name || customer.phone}</span> →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            icon={UserRound}
            title={data.q ? 'No customers match this search' : 'No customers in this view'}
            description="Try another status or fewer phone digits."
          />
        )}

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
          <p className="text-tiny text-ink-500">
            {data.total} customer{data.total === 1 ? '' : 's'} · page {data.page} of {data.pages}
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

const CUSTOMER_TABS = (data) => [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings', count: data.bookings.total },
  { key: 'support', label: 'Support', count: data.support.total },
  { key: 'reviews', label: 'Reviews', count: data.reviews.total },
  { key: 'privacy', label: 'Privacy', count: data.privacy.length },
  { key: 'account', label: 'Account details' },
  { key: 'history', label: 'Activity log', count: data.history.length },
];

function BookingRow({ order }) {
  return (
    <Row
      primary={order.title}
      secondary={`${order.reference} · first visit ${order.firstVisit ?? '—'} · booked ${when(order.createdAt)}`}
      trailing={<StatusBadge tone="info">{label(order.state)}</StatusBadge>}
      href={`/admin/bookings/${order.id}`}
      hrefLabel={
        <>
          Record<span className="sr-only"> {order.reference}</span>
        </>
      }
    />
  );
}

function SupportRow({ request }) {
  return (
    <Row
      primary={request.subject}
      secondary={`${request.reference} · updated ${when(request.updatedAt)}`}
      trailing={<StatusBadge tone="neutral">{label(request.state)}</StatusBadge>}
      href={`/admin/support/${request.id}`}
      hrefLabel={
        <>
          Open<span className="sr-only"> {request.reference}</span>
        </>
      }
    />
  );
}

export function AdminCustomerDetail({
  data,
  listHref: backHref = '/admin/customers',
  tab,
  params,
}) {
  const { customer, bookings, support, reviews, privacy, sessions, history } = data;
  const title =
    customer.name || `Customer ${customer.phone ? `••${customer.phone.slice(-4)}` : ''}`;
  const tabs = CUSTOMER_TABS(data);
  const active = pickTab(tab, tabs);
  const openSupport = support.items.filter((request) => request.state !== 'resolved').length;
  const effects = data.lifecycle.effects;

  const sessionPanel = (
    <SectionCard
      id="sessions"
      title="Sessions"
      description={`${sessions.open} open session${sessions.open === 1 ? '' : 's'} · latest sign-in ${when(sessions.latest, { dateStyle: 'medium', timeStyle: 'short' })}`}
    >
      <CustomerSessionRevocation customer={customer} openSessions={sessions.open} />
    </SectionCard>
  );
  const sidebar = (
    <div className="space-y-5 lg:sticky lg:top-20">
      {sessionPanel}
      <AccountLifecyclePanel
        subjectId={customer.id}
        preview={data.lifecycle}
        command={customerAccountCommand}
        verbs={verbsFor(customer.accountStatus)}
        statuses={STATUS}
      />
      <p className="px-1 text-tiny text-ink-500">
        No impersonation: staff never sign in as a customer. Authentication recovery (a lost phone)
        is not available here.
      </p>
    </div>
  );
  const bookingRows = (items) => (
    <RowList
      items={items}
      empty="No bookings."
      render={(order) => <BookingRow key={order.id} order={order} />}
    />
  );
  const supportRows = (items) => (
    <RowList
      items={items}
      empty="No support requests."
      render={(request) => <SupportRow key={request.id} request={request} />}
    />
  );

  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: backHref, label: 'Customers' }, { label: title }]}
        title={title}
        badges={[
          { label: STATUS[customer.accountStatus], tone: tone(customer.accountStatus) },
          { label: 'Customer', tone: 'info' },
          customer.phoneVerifiedAt ? { label: 'Phone verified', tone: 'success' } : null,
        ].filter(Boolean)}
        id={{ label: 'Customer ID', value: customer.id, display: customer.id.slice(0, 8) }}
        chips={[
          customer.phone ? { icon: Phone, value: `+91 ${customer.phone}` } : null,
          customer.email ? { icon: Mail, value: customer.email } : null,
          { icon: CalendarDays, label: 'Joined', value: when(customer.createdAt) },
          {
            icon: Clock,
            label: 'Last sign-in',
            value: when(customer.lastLoginAt, { dateStyle: 'medium', timeStyle: 'short' }),
          },
        ]}
      />

      <MetricStrip
        items={[
          { label: 'Bookings', value: bookings.total, hint: 'booking orders' },
          {
            label: 'Upcoming visits',
            value: effects.upcomingVisits,
            hint: 'confirmed or in progress',
          },
          {
            label: 'Open support',
            value: effects.openSupport,
            hint: 'not resolved',
            tone: effects.openSupport ? 'warning' : 'neutral',
          },
          { label: 'Reviews', value: reviews.total, hint: 'written' },
          { label: 'Open sessions', value: sessions.open, hint: 'signed-in devices' },
          {
            label: 'Privacy',
            value: privacy.filter((request) => request.state !== 'closed').length,
            hint: 'open requests',
          },
        ]}
      />

      <DetailTabs
        tabs={tabs}
        active={active}
        basePath={`/admin/customers/${customer.id}`}
        params={params}
      />

      <div className="mt-6">
        {active === 'overview' ? (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="space-y-5">
              <SectionCard id="recent-bookings" title="Recent bookings" flush>
                {bookingRows(bookings.items.slice(0, 5))}
              </SectionCard>
              <SectionCard
                id="recent-support"
                title="Support"
                description={openSupport ? `${openSupport} open on this list` : undefined}
                flush
              >
                {supportRows(support.items.slice(0, 5))}
              </SectionCard>
            </div>
            {sidebar}
          </div>
        ) : null}

        {active === 'bookings' ? (
          <SectionCard
            id="bookings"
            title="Bookings"
            description={
              bookings.total > bookings.items.length
                ? `Latest ${bookings.items.length} of ${bookings.total}`
                : 'Newest first'
            }
            flush
          >
            {bookingRows(bookings.items)}
          </SectionCard>
        ) : null}

        {active === 'support' ? (
          <SectionCard id="support" title="Support requests" flush>
            {supportRows(support.items)}
          </SectionCard>
        ) : null}

        {active === 'reviews' ? (
          <SectionCard
            id="reviews"
            title="Reviews written"
            description="Read only — ratings are never edited from a customer record"
            action={
              <Link
                href="/admin/reviews"
                className="text-tiny font-bold text-brand-700 hover:underline"
              >
                Open moderation →
              </Link>
            }
            flush
          >
            <RowList
              items={reviews.items}
              empty="No reviews."
              render={(review) => (
                <Row
                  key={review.id}
                  primary={`${review.rating}/5 · ${review.listingTitle ?? 'Property'}`}
                  secondary={when(review.createdAt)}
                  trailing={
                    <StatusBadge tone="neutral">{label(review.moderationState)}</StatusBadge>
                  }
                />
              )}
            />
          </SectionCard>
        ) : null}

        {active === 'privacy' ? (
          <SectionCard
            id="privacy"
            title="Privacy requests"
            description="Export and deletion fulfillment arrives with privacy jobs (CP27)"
            action={
              <Link
                href="/admin/privacy"
                className="text-tiny font-bold text-brand-700 hover:underline"
              >
                Privacy workflow →
              </Link>
            }
            flush
          >
            <RowList
              items={privacy}
              empty="No privacy requests."
              render={(request) => (
                <Row
                  key={request.id}
                  primary={<span className="capitalize">{request.kind} request</span>}
                  secondary={when(request.createdAt)}
                  trailing={<StatusBadge tone="neutral">{label(request.state)}</StatusBadge>}
                />
              )}
            />
          </SectionCard>
        ) : null}

        {active === 'account' ? (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <SectionCard id="profile" title="Account details">
              <FieldGrid
                fields={[
                  { label: 'Customer ID', value: customer.id, mono: true },
                  { label: 'Name', value: customer.name || '—' },
                  {
                    label: 'Phone (sign-in)',
                    value: customer.phone
                      ? `+91 ${customer.phone}${customer.phoneVerifiedAt ? ' · verified' : ''}`
                      : '—',
                  },
                  {
                    label: 'Email',
                    value: customer.email
                      ? `${customer.email}${customer.emailVerifiedAt ? ' · verified' : ' · not verified'}`
                      : '—',
                  },
                  { label: 'Language', value: customer.preferredLocale },
                  {
                    label: 'Marketing messages',
                    value: customer.marketingConsent ? 'Opted in' : 'Not opted in',
                  },
                  { label: 'Account status', value: STATUS[customer.accountStatus] },
                  {
                    label: 'Joined',
                    value: when(customer.createdAt, { dateStyle: 'medium', timeStyle: 'short' }),
                  },
                ]}
              />
              <CustomerProfileCorrection customer={customer} />
            </SectionCard>
            {sidebar}
          </div>
        ) : null}

        {active === 'history' ? (
          <SectionCard
            id="history"
            title="Activity log"
            description="Admin actions and account events; routine sign-ins excluded"
            flush
          >
            <HistoryList history={history} statuses={STATUS} />
          </SectionCard>
        ) : null}
      </div>
    </AdminPage>
  );
}
