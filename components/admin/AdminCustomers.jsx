import PeopleDirectory from './PeopleDirectory';
import CopyChip from '@/components/portal/CopyChip';
import { detailTabHref } from '@/lib/domain/detail-navigation';
import { buttonVariants } from '@/components/ui/button';
import Link from '@/components/navigation/NavigationLink';
import AccountLifecyclePanel from './AccountLifecyclePanel';
import { CustomerProfileCorrection, CustomerSessionRevocation } from './CustomerAccountForms';
import { HistoryList, label, when } from './AdminClients';
import {
  DetailTabs,
  FieldGrid,
  Row,
  RowList,
  SectionCard,
  pickTab,
} from '@/components/portal/DetailLayout';
import { AdminPage, AdminPageHeader, AdminReadOnly, StatusBadge } from './AdminPrimitives';
import { customerAccountCommand } from '@/lib/actions/admin';
import { formatLocalDate } from '@/lib/domain/booking-dates';

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

export function AdminCustomerList({ data }) {
  return <PeopleDirectory type="customers" data={data} statuses={STATUS} />;
}

const CUSTOMER_TABS = (data) => [
  { key: 'overview', label: 'Overview' },
  { key: 'bookings', label: 'Bookings', count: data.bookings.total },
  { key: 'support', label: 'Support', count: data.support.total },
  { key: 'reviews', label: 'Reviews', count: data.reviews.total },
  { key: 'privacy', label: 'Privacy', count: data.privacy.length },
  { key: 'account', label: 'Account' },
  { key: 'history', label: 'Activity', count: data.history.length },
];

function BookingRow({ order, canReadRecords }) {
  return (
    <Row
      primary={order.title}
      secondary={`${order.reference} / first visit ${order.firstVisit ? formatLocalDate(order.firstVisit) : 'Not recorded'} / booked ${when(order.createdAt)}`}
      trailing={<StatusBadge tone="info">{label(order.state)}</StatusBadge>}
      href={canReadRecords ? `/admin/bookings/${order.id}` : null}
      hrefLabel={
        <>
          Record<span className="sr-only"> {order.reference}</span>
        </>
      }
    />
  );
}

function SupportRow({ request, canReadSupport }) {
  return (
    <Row
      primary={request.subject}
      secondary={`${request.reference} · updated ${when(request.updatedAt)}`}
      trailing={<StatusBadge tone="neutral">{label(request.state)}</StatusBadge>}
      href={canReadSupport ? `/admin/support/${request.id}` : null}
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
  capabilities = [],
}) {
  const { customer, bookings, support, reviews, privacy, sessions, history } = data;
  const title =
    customer.name || `Customer ${customer.phone ? `••${customer.phone.slice(-4)}` : ''}`;
  const tabs = CUSTOMER_TABS(data);
  const active = pickTab(tab, tabs);
  const openSupport = support.items.filter((request) => request.state !== 'resolved').length;
  const effects = data.lifecycle.effects;
  const canWrite = capabilities.includes('admin.customers.write');

  const sessionPanel = (
    <SectionCard
      id="sessions"
      title="Session revocation"
      description={`${sessions.open} open session${sessions.open === 1 ? '' : 's'} · latest sign-in ${when(sessions.latest, { dateStyle: 'medium', timeStyle: 'short' })}`}
    >
      {canWrite ? (
        <details>
          <summary className="min-h-11 cursor-pointer content-center text-meta font-semibold text-brand-700">
            Sign out devices
          </summary>
          <CustomerSessionRevocation customer={customer} openSessions={sessions.open} />
        </details>
      ) : (
        <p className="text-meta text-ink-600">
          Read-only session history. Signing out devices requires customers write permission.
        </p>
      )}
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
        canWrite={canWrite}
      />
      <p className="px-1 text-meta text-ink-500">
        No impersonation: staff never sign in as a customer. Authentication recovery (a lost phone)
        is not available here.
      </p>
    </div>
  );
  const bookingRows = (items) => (
    <RowList
      items={items}
      empty="No bookings."
      render={(order) => (
        <BookingRow
          key={order.id}
          order={order}
          canReadRecords={capabilities.includes('admin.records.read')}
        />
      )}
    />
  );
  const supportRows = (items) => (
    <RowList
      items={items}
      empty="No support requests."
      render={(request) => (
        <SupportRow
          key={request.id}
          request={request}
          canReadSupport={capabilities.includes('admin.support.read')}
        />
      )}
    />
  );

  return (
    <AdminPage className="[&_dt]:text-meta [&_dt]:font-medium [&_dt]:tracking-normal [&_dt]:normal-case [&_.text-tiny]:text-meta [&_h2+p]:text-meta">
      <AdminPageHeader
        title={title}
        description={
          customer.email || (customer.phone ? `+91 ${customer.phone}` : 'Contact not recorded')
        }
        backHref={backHref}
        backLabel={backHref.startsWith('/admin/search') ? 'Search results' : 'Customers'}
        action={
          <Link
            href={detailTabHref(`/admin/customers/${customer.id}`, 'account', tabs, params)}
            className={buttonVariants({ variant: 'outline' })}
          >
            Manage account
          </Link>
        }
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge tone={tone(customer.accountStatus)}>
          {STATUS[customer.accountStatus]}
        </StatusBadge>
        <CopyChip label="Customers ID" value={customer.id} display={customer.id.slice(0, 8)} />
        {customer.phoneVerifiedAt ? <StatusBadge tone="success">Phone verified</StatusBadge> : null}
      </div>
      <DetailTabs
        wrap
        tabs={tabs}
        active={active}
        basePath={`/admin/customers/${customer.id}`}
        params={params}
      />

      <div className="mt-6">
        {active === 'overview' ? (
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
            <SectionCard title="Customer context">
              <dl className="space-y-4 text-meta">
                <div>
                  <dt className="text-ink-600">Mobile</dt>
                  <dd className="mt-1">
                    {customer.phone ? `+91 ${customer.phone}` : 'Not recorded'}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Upcoming visits</dt>
                  <dd className="mt-1 tabular">{effects.upcomingVisits}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Open support</dt>
                  <dd className="mt-1 tabular">{effects.openSupport}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Open sessions</dt>
                  <dd className="mt-1 tabular">{sessions.open}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Open privacy requests in this record</dt>
                  <dd className="mt-1 tabular">
                    {privacy.filter((request) => request.state !== 'closed').length}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-600">Joined</dt>
                  <dd className="mt-1">{when(customer.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-ink-600">Last sign-in</dt>
                  <dd className="mt-1">{when(customer.lastLoginAt)}</dd>
                </div>
              </dl>
            </SectionCard>
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
              capabilities.includes('admin.reviews.read') ? (
                <Link
                  href="/admin/reviews"
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
                >
                  Open moderation →
                </Link>
              ) : null
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
            description="Requests and recorded states; fulfillment is managed in the privacy workspace."
            action={
              capabilities.includes('admin.privacy.read') ? (
                <Link
                  href="/admin/privacy"
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
                >
                  Privacy workflow →
                </Link>
              ) : null
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
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
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
              {canWrite ? (
                <details className="mt-5 border-t border-border pt-3">
                  <summary className="min-h-11 cursor-pointer content-center text-meta font-semibold text-brand-700">
                    Correct profile
                  </summary>
                  <CustomerProfileCorrection customer={customer} />
                </details>
              ) : (
                <p className="mt-4 text-meta text-ink-600">
                  Read-only profile. Corrections require customers write permission.
                </p>
              )}
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
