import Link from 'next/link';
import { UserRound } from 'lucide-react';
import CopyReference from '@/components/customer/checkout/CopyReference';
import AccountLifecyclePanel from './AccountLifecyclePanel';
import { CustomerProfileCorrection, CustomerSessionRevocation } from './CustomerAccountForms';
import { Fact, Panel, label, when } from './AdminClients';
import { AdminEmpty, AdminPage, AdminPageHeader, Pager, StatusBadge } from './AdminPrimitives';
import { customerAccountCommand } from '@/lib/actions/admin';

const STATUS = { all: 'All', active: 'Active', suspended: 'Restricted', blocked: 'Blocked' };
const VERBS = { suspend: 'Restrict access', reinstate: 'Reinstate access' };
const tone = (status) => (status === 'active' ? 'success' : 'danger');

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
        description="Guest accounts with their bookings, support, reviews and privacy requests. Phone numbers are masked in this list."
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
                    <td className="px-4 py-4 font-mono text-tiny text-ink-600">
                      {customer.phoneMasked ?? '—'}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={tone(customer.accountStatus)}>
                        {STATUS[customer.accountStatus]}
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
                        <span className="sr-only"> {customer.name || customer.phoneMasked}</span> →
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

function RecordList({ items, empty, render }) {
  if (!items.length) return <p className="text-meta text-ink-600">{empty}</p>;
  return <ul className="divide-y divide-border">{items.map(render)}</ul>;
}

const SECTIONS = [
  ['#profile', 'Profile'],
  ['#bookings', 'Bookings'],
  ['#support', 'Support'],
  ['#reviews', 'Reviews'],
  ['#privacy', 'Privacy'],
  ['#sessions', 'Sessions'],
  ['#lifecycle', 'Account status'],
  ['#history', 'History'],
];

export function AdminCustomerDetail({ data, listHref: backHref = '/admin/customers' }) {
  const { customer, bookings, support, reviews, privacy, sessions, history } = data;
  const title =
    customer.name || `Customer ${customer.phone ? `••${customer.phone.slice(-4)}` : ''}`;
  return (
    <AdminPage width="max-w-6xl">
      <AdminPageHeader
        breadcrumbs={[{ href: backHref, label: 'Customers' }, { label: title }]}
        eyebrow="Customer"
        title={title}
        description={`Joined ${when(customer.createdAt)} · last sign-in ${when(customer.lastLoginAt)}`}
        action={
          <StatusBadge tone={tone(customer.accountStatus)}>
            {STATUS[customer.accountStatus]}
          </StatusBadge>
        }
      />
      <div className="mt-4">
        <CopyReference reference={customer.id} label="Customer ID" />
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
              <Fact term="Phone (sign-in)">
                {customer.phone ? `+91 ${customer.phone}` : '—'}
                {customer.phoneVerifiedAt ? ' · verified' : ''}
              </Fact>
              <Fact term="Email">
                {customer.email ?? '—'}
                {customer.email
                  ? customer.emailVerifiedAt
                    ? ' · verified'
                    : ' · not verified'
                  : ''}
              </Fact>
              <Fact term="Language">{customer.preferredLocale}</Fact>
              <Fact term="Marketing messages">
                {customer.marketingConsent ? 'Opted in' : 'Not opted in'}
              </Fact>
            </dl>
            <CustomerProfileCorrection customer={customer} />
          </Panel>

          <Panel id="bookings" title={`Bookings (${bookings.total})`}>
            <RecordList
              items={bookings.items}
              empty="No bookings."
              render={(order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">{order.title}</span>
                    <span className="text-tiny text-ink-500">
                      {order.reference} · first visit {order.firstVisit ?? '—'}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge tone="info">{label(order.state)}</StatusBadge>
                    <Link
                      href={`/admin/bookings/${order.id}`}
                      className="text-tiny font-bold text-brand-700 hover:underline"
                    >
                      Record<span className="sr-only"> {order.reference}</span> →
                    </Link>
                  </span>
                </li>
              )}
            />
          </Panel>

          <Panel id="support" title={`Support requests (${support.total})`}>
            <RecordList
              items={support.items}
              empty="No support requests."
              render={(request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">{request.subject}</span>
                    <span className="text-tiny text-ink-500">
                      {request.reference} · updated {when(request.updatedAt)}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge tone="neutral">{label(request.state)}</StatusBadge>
                    <Link
                      href={`/admin/support/${request.id}`}
                      className="text-tiny font-bold text-brand-700 hover:underline"
                    >
                      Open<span className="sr-only"> {request.reference}</span> →
                    </Link>
                  </span>
                </li>
              )}
            />
          </Panel>

          <Panel id="reviews" title={`Reviews written (${reviews.total})`}>
            <RecordList
              items={reviews.items}
              empty="No reviews."
              render={(review) => (
                <li
                  key={review.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink-900">
                      {review.rating}/5 · {review.listingTitle ?? 'Property'}
                    </span>
                    <span className="text-tiny text-ink-500">{when(review.createdAt)}</span>
                  </span>
                  <StatusBadge tone="neutral">{label(review.moderationState)}</StatusBadge>
                </li>
              )}
            />
            <p className="mt-2 text-tiny text-ink-500">
              Moderation happens in{' '}
              <Link href="/admin/reviews" className="font-semibold text-brand-700 hover:underline">
                Reviews
              </Link>
              ; ratings are never edited from a customer record.
            </p>
          </Panel>

          <Panel id="privacy" title="Privacy requests">
            <RecordList
              items={privacy}
              empty="No privacy requests."
              render={(request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span className="font-semibold text-ink-900 capitalize">
                    {request.kind} request · {when(request.createdAt)}
                  </span>
                  <StatusBadge tone="neutral">{label(request.state)}</StatusBadge>
                </li>
              )}
            />
            <p className="mt-2 text-tiny text-ink-500">
              Export and deletion are handled in the{' '}
              <Link href="/admin/privacy" className="font-semibold text-brand-700 hover:underline">
                privacy workflow
              </Link>
              ; fulfillment arrives with privacy jobs (CP27).
            </p>
          </Panel>

          <Panel id="history" title="History">
            <RecordList
              items={history}
              empty="No recorded activity."
              render={(event) => (
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
                  {event.fields ? (
                    <p className="text-tiny text-ink-600">Fields: {event.fields.join(', ')}</p>
                  ) : null}
                  {event.fromStatus || event.toStatus ? (
                    <p className="text-tiny text-ink-600">
                      {STATUS[event.fromStatus] ?? event.fromStatus} →{' '}
                      {STATUS[event.toStatus] ?? event.toStatus}
                    </p>
                  ) : null}
                  {event.revoked != null ? (
                    <p className="text-tiny text-ink-600">{event.revoked} session(s) ended</p>
                  ) : null}
                  {event.reason ? (
                    <p className="text-tiny text-ink-600">&ldquo;{event.reason}&rdquo;</p>
                  ) : null}
                </li>
              )}
            />
          </Panel>
        </div>

        <div className="space-y-5 lg:sticky lg:top-24">
          <Panel id="sessions" title="Sessions">
            <p className="text-meta text-ink-700">
              <strong>{sessions.open}</strong> open session{sessions.open === 1 ? '' : 's'} · latest
              sign-in {when(sessions.latest, { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <CustomerSessionRevocation customer={customer} openSessions={sessions.open} />
          </Panel>
          <AccountLifecyclePanel
            subjectId={customer.id}
            preview={data.lifecycle}
            command={customerAccountCommand}
            verbs={VERBS}
            statuses={STATUS}
          />
          <p className="px-1 text-tiny text-ink-500">
            No impersonation: staff never sign in as a customer. Authentication recovery (a lost
            phone) is not available here.
          </p>
        </div>
      </div>
    </AdminPage>
  );
}
