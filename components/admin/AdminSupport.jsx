import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { CalendarDays, Clock3, Inbox, LifeBuoy, MessageSquareText } from 'lucide-react';
import { supportCategories, supportStates } from '@/lib/domain/help';
import { SupportReplyForm } from '@/components/customer/SupportForms';
import {
  AdminEmpty,
  AdminKpiCard,
  AdminPage,
  AdminPageHeader,
  Pager,
  StatusBadge,
} from './AdminPrimitives';
import { DetailHeader } from '@/components/portal/DetailLayout';

const time = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
const stateTone = (state) =>
  state === 'resolved'
    ? 'success'
    : state === 'waiting_customer'
      ? 'warning'
      : state === 'in_progress'
        ? 'info'
        : 'danger';

export function AdminSupportList({ data }) {
  const listHref = `/admin/support?state=${encodeURIComponent(data.state)}&page=${data.page}`;
  const open = data.items.filter((item) => item.state === 'open').length;
  const waiting = data.items.filter((item) => item.state === 'waiting_customer').length;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Customer care"
        title="Support inbox"
        description="Review customer requests, keep conversations moving, and separate support replies from booking or privacy operations."
      />
      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminKpiCard
          label="Matching requests"
          value={data.total}
          icon={LifeBuoy}
          hint="Across this filtered view"
        />
        <AdminKpiCard
          label="Open on page"
          value={open}
          icon={Inbox}
          hint="Waiting for staff attention"
          tone={open ? 'danger' : 'neutral'}
        />
        <AdminKpiCard
          label="Waiting on customer"
          value={waiting}
          icon={Clock3}
          hint="Customer response requested"
          tone="warning"
        />
        <AdminKpiCard
          label="Page"
          value={data.page}
          icon={MessageSquareText}
          hint="20 requests per page"
        />
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-h4 font-bold text-ink-900">Requests</h2>
            <p className="mt-1 text-tiny text-ink-500">
              Most recently updated first · Loaded {time(new Date())}
            </p>
          </div>
          <form action="/admin/support" className="flex items-end gap-2">
            <label className="text-tiny font-semibold text-ink-600">
              Status
              <select
                className="mt-1 block min-h-10 rounded-md border border-border bg-white px-3"
                name="state"
                defaultValue={data.state}
              >
                <option value="all">All statuses</option>
                {Object.entries(supportStates).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <button className="min-h-10 rounded-md bg-brand-700 px-4 text-tiny font-semibold text-white">
              Filter
            </button>
          </form>
        </div>
        {data.items.length ? (
          <div
            className="relative overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Support requests table"
          >
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-ink-25 text-[0.65rem] font-bold tracking-wider text-ink-500 uppercase">
                <tr>
                  <th className="px-5 py-3">Request</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((request) => (
                  <tr key={request.id} className="hover:bg-ink-25">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink-900">{request.subject}</p>
                      <p className="mt-1 font-mono text-[0.68rem] text-ink-500">
                        {request.reference}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600">
                      {supportCategories[request.category]}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={stateTone(request.state)}>
                        {supportStates[request.state]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-tiny text-ink-600">{time(request.updatedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="text-tiny font-bold text-brand-700 hover:underline"
                        href={`/admin/support/${request.id}?from=${encodeURIComponent(listHref)}`}
                      >
                        Open<span className="sr-only"> {request.reference}</span> →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <AdminEmpty
            icon={Inbox}
            title="No requests match this view"
            description="Choose another status or check back when customers contact support."
          />
        )}
        <footer className="flex justify-between border-t border-border px-5 py-4">
          <p className="text-tiny text-ink-500">
            {data.total} request{data.total === 1 ? '' : 's'}
          </p>
          <Pager
            page={data.page}
            hasNext={data.hasNext}
            previousHref={`?state=${data.state}&page=${data.page - 1}`}
            nextHref={`?state=${data.state}&page=${data.page + 1}`}
          />
        </footer>
      </section>
    </AdminPage>
  );
}

export function AdminSupportDetail({ record, listHref = '/admin/support' }) {
  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: listHref, label: 'Support inbox' }, { label: record.reference }]}
        title={record.subject}
        badges={[
          { label: supportStates[record.state], tone: stateTone(record.state) },
          { label: supportCategories[record.category], tone: 'info' },
        ]}
        id={{ label: 'Request reference', value: record.reference }}
        chips={[
          { icon: CalendarDays, label: 'Created', value: time(record.createdAt) },
          record.updatedAt
            ? { icon: Clock3, label: 'Updated', value: time(record.updatedAt) }
            : null,
          {
            icon: MessageSquareText,
            value: `${record.messages.length} message${record.messages.length === 1 ? '' : 's'}`,
          },
        ]}
      />
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-h4 font-bold">Conversation</h2>
            <p className="mt-1 text-tiny text-ink-500">
              {record.messages.length} message{record.messages.length === 1 ? '' : 's'}
            </p>
          </div>
          <ol className="space-y-4 p-5">
            {record.messages.map((message) => (
              <li
                key={message.id}
                className={`max-w-[85%] rounded-lg p-4 ${message.author === 'Rentra support' ? 'ml-auto bg-brand-50' : 'border border-border bg-ink-25'}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-tiny font-bold text-ink-900">{message.author}</p>
                  <p className="text-[0.65rem] text-ink-500">{time(message.at)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-meta leading-6 text-ink-700">
                  {message.body}
                </p>
              </li>
            ))}
          </ol>
        </section>
        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="text-h4 font-bold">Request context</h2>
            {record.orderId ? (
              <Link
                className="mt-3 block text-meta font-semibold text-brand-700 hover:underline"
                href={`/admin/bookings/${record.orderId}`}
              >
                {record.context.reference} — {record.context.title}
              </Link>
            ) : null}
            {record.privacy ? (
              <Link
                className="mt-3 block text-meta font-semibold text-brand-700 hover:underline"
                href="/admin/privacy"
              >
                Linked {record.privacy.kind === 'access' ? 'data copy' : 'deletion'} request
              </Link>
            ) : null}
            <dl className="mt-4 space-y-2 text-tiny">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Policy</dt>
                <dd className="font-semibold">{record.policyVersion}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Last updated</dt>
                <dd className="text-right font-semibold">{time(record.updatedAt)}</dd>
              </div>
            </dl>
          </section>
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="mb-4 text-h4 font-bold">Reply and update</h2>
            <SupportReplyForm
              key={record.version}
              record={{ id: record.id, version: record.version }}
              requestKey={randomUUID()}
              admin
            />
          </section>
        </aside>
      </div>
    </AdminPage>
  );
}
