import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import SupportManagement from './SupportManagement';
import IncidentRemedyPanel from './IncidentRemedyPanel';
import ReviewEligibilityPanel from './ReviewEligibilityPanel';
import { randomUUID } from 'node:crypto';
import { CalendarDays, Clock3, Inbox, LifeBuoy, MessageSquareText } from 'lucide-react';
import { supportCategories, ownerSupportCategories, supportStates } from '@/lib/domain/help';
import { AdminSupportComposer } from '@/components/customer/SupportForms';
import {
  AdminEmpty,
  AdminTable,
  AdminReadOnly,
  AdminKpiCard,
  AdminPage,
  AdminPageHeader,
  StatusBadge,
} from './AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import { DetailHeader } from '@/components/portal/DetailLayout';
import { StayIssueSummary, LateBadge } from '@/components/customer/StayIssueSummary';

import { adminDateTime as time } from '@/lib/domain/admin-display';
const categories = { ...supportCategories, ...ownerSupportCategories };
const VIEWS = {
  all: 'All cases',
  urgent: 'Urgent',
  aged: 'No reply 12 h+',
  unassigned: 'Unassigned',
  failed_delivery: 'Alert email failed',
};
const EMAIL = {
  pending: 'Email queued',
  retry: 'Email retrying',
  sending: 'Email sending',
  sent: 'Email sent',
  blocked: 'Email blocked',
  failed: 'Email failed',
};
/** Story 4.2: whole hours a case has waited without a public reply, or null when not aged. */
const agedHours = (r) =>
  r.state === 'resolved' || r.firstResponseAt || !r.createdAt
    ? null
    : ((h) => (h >= 12 ? h : null))(Math.floor((Date.now() - new Date(r.createdAt)) / 3_600_000));
function ResponseBadges({ request }) {
  const hours = agedHours(request);
  return (
    <span className="mt-1 flex flex-wrap gap-1.5">
      {request.priority === 'urgent' && <StatusBadge tone="danger">Urgent</StatusBadge>}
      {hours != null && <StatusBadge tone="warning">Aged {hours}h</StatusBadge>}
      {request.alertFailed && <StatusBadge tone="danger">Alert email failed</StatusBadge>}
    </span>
  );
}
const stateTone = (state) =>
  state === 'resolved'
    ? 'success'
    : state === 'waiting_customer'
      ? 'warning'
      : state === 'in_progress'
        ? 'info'
        : 'danger';

export function AdminSupportList({ data }) {
  const listHref = `/admin/support?state=${encodeURIComponent(data.state)}&participant=${data.participant}&assignment=${data.assignment}&view=${data.view}&page=${data.page}${data.property ? `&property=${data.property}` : ''}`;
  const open = data.items.filter((item) => item.state === 'open').length;
  const waiting = data.items.filter((item) => item.state === 'waiting_customer').length;
  return (
    <AdminPage>
      <AdminPageHeader
        title="Support inbox"
        description="Review owner and customer requests, assign operators, and separate support replies from booking or privacy operations."
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
          label="Waiting on page"
          value={waiting}
          icon={Clock3}
          hint="Participant response requested"
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
            {data.property && (
              <p className="mt-1 text-tiny font-semibold text-ink-700">
                Showing one property&apos;s cases ·{' '}
                <Link className="underline" href={`/admin/properties/${data.property}`}>
                  Property
                </Link>{' '}
                ·{' '}
                <Link className="underline" href="/admin/support">
                  Clear
                </Link>
              </p>
            )}
          </div>
          <Form action="/admin/support" className="flex flex-wrap items-end gap-2">
            {data.property && <input type="hidden" name="property" value={data.property} />}
            <label className="text-tiny font-semibold text-ink-600">
              Status
              <select
                className="mt-1 block min-h-10 rounded-md border border-input bg-card px-3 text-base md:text-sm"
                name="state"
                defaultValue={data.state}
              >
                <option value="all">All statuses</option>
                <option value="unresolved">Unresolved requests</option>
                {Object.entries(supportStates).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-tiny font-semibold">
              View
              <select
                className="ml-2 min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
                name="view"
                defaultValue={data.view}
              >
                {Object.entries(VIEWS).map(([value, text]) => (
                  <option key={value} value={value}>
                    {text}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-tiny font-semibold">
              Participant
              <select
                className="ml-2 min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
                name="participant"
                defaultValue={data.participant}
              >
                <option value="all">All</option>
                <option value="client">Owners</option>
                <option value="customer">Customers</option>
              </select>
            </label>
            <label className="text-tiny font-semibold">
              Assignment
              <select
                className="ml-2 min-h-11 rounded-md border p-2 text-base md:text-sm bg-card text-foreground"
                name="assignment"
                defaultValue={data.assignment}
              >
                <option value="all">All</option>
                <option value="mine">Assigned to me</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </label>
            <button className="min-h-11 rounded-md bg-primary px-4 text-tiny font-semibold text-white">
              Filter
            </button>
          </Form>
        </div>
        <AdminTable
          framed={false}
          label="Support requests"
          columns={['Subject', 'Category', 'Status', 'Updated (IST)', 'Request']}
          empty={
            !data.items.length && (
              <AdminEmpty
                icon={Inbox}
                title="No requests match this view"
                description="Choose another status or participant."
              />
            )
          }
        >
          {data.items.map((request) => (
            <tr key={request.id} className="hover:bg-ink-25">
              <td className="px-5 py-4">
                <p className="font-semibold text-ink-900">
                  {request.subject} {request.late && <LateBadge />}
                </p>
                <ResponseBadges request={request} />
                <p className="text-tiny text-ink-600">
                  {request.firstResponseAt
                    ? `First reply ${time(request.firstResponseAt)}`
                    : 'No reply yet'}
                </p>
                <p className="text-tiny">
                  {request.participant === 'client' ? 'Owner' : 'Customer'} · {request.priority}
                  {request.assignedTo ? ' · Assigned' : ' · Unassigned'}
                </p>
                <p className="mt-1 font-mono text-tiny text-ink-500">{request.reference}</p>
              </td>
              <td className="px-4 py-4 text-tiny text-ink-600">
                {categories[request.category] || request.category}
              </td>
              <td className="px-4 py-4">
                <StatusBadge tone={stateTone(request.state)}>
                  {supportStates[request.state]}
                </StatusBadge>
              </td>
              <td className="px-4 py-4 text-tiny text-ink-600">{time(request.updatedAt)}</td>
              <td className="px-5 py-4 text-right">
                <Link
                  className="inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 underline"
                  href={`/admin/support/${request.id}?from=${encodeURIComponent(listHref)}`}
                >
                  View<span className="sr-only"> {request.reference}</span> →
                </Link>
              </td>
            </tr>
          ))}
        </AdminTable>
        <Pagination
          page={data.page}
          pageSize={20}
          total={data.total}
          pageSizes={null}
          label="Support request pages"
          noun="requests"
          className="border-t border-border px-5 py-4"
        />
      </section>
    </AdminPage>
  );
}

export function AdminSupportDetail({
  record,
  listHref = '/admin/support',
  canWrite = false,
  capabilities = [],
}) {
  return (
    <AdminPage width="max-w-[1320px]">
      <DetailHeader
        breadcrumbs={[{ href: listHref, label: 'Support inbox' }, { label: record.reference }]}
        title={record.subject}
        badges={[
          { label: supportStates[record.state], tone: stateTone(record.state) },
          { label: categories[record.category] || record.category, tone: 'info' },
        ]}
        id={{ label: 'Request reference', value: record.reference }}
        chips={[
          { icon: CalendarDays, label: 'Created', value: time(record.createdAt) },
          record.updatedAt
            ? { icon: Clock3, label: 'Updated', value: time(record.updatedAt) }
            : null,
          {
            icon: Clock3,
            label: 'First reply',
            value: record.firstResponseAt ? time(record.firstResponseAt) : 'No reply yet',
          },
          {
            icon: MessageSquareText,
            value: `${record.messages.length} message${record.messages.length === 1 ? '' : 's'}`,
          },
        ]}
      />
      <p className="mt-4">
        Participants: {record.participant === 'client' ? 'Owner' : 'Customer'} and Rentra support.
        Private notes stay with admins.
      </p>
      {record.context?.stayIssue && (
        <div className="mt-4">
          <StayIssueSummary issue={record.context.stayIssue} />
        </div>
      )}
      <nav className="flex flex-wrap gap-4 py-4">
        {capabilities.includes(record.clientId ? 'admin.clients.read' : 'admin.customers.read') && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={
              record.clientId
                ? `/admin/clients/${record.clientId}`
                : `/admin/customers/${record.customerId}`
            }
          >
            Participant detail
          </Link>
        )}
        {record.propertyId && capabilities.includes('admin.properties.read') && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={`/admin/properties/${record.propertyId}`}
          >
            Property detail
          </Link>
        )}
        {record.relatedRequestId && (
          <Link
            className="inline-flex min-h-11 items-center underline"
            href={`/admin/support/${record.relatedRequestId}`}
          >
            Related case (separate thread)
          </Link>
        )}
      </nav>
      {!canWrite && (
        <div className="mt-4">
          <AdminReadOnly />
        </div>
      )}
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                className={`max-w-full break-words rounded-lg p-4 sm:max-w-[85%] ${message.internal ? 'ml-auto border border-dashed border-ink-300 bg-ink-25' : message.author === 'Rentra support' ? 'ml-auto bg-brand-50' : 'border border-border bg-ink-25'}`}
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-tiny font-bold text-ink-900">
                    {message.author}
                    {message.internal ? ' · Private note' : ''}
                  </p>
                  <p className="text-tiny text-ink-500">{time(message.at)}</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-meta leading-6 text-ink-700">
                  {message.body}
                </p>
                {(message.attachments || []).map((photo, i) => (
                  // A plain link, never a prefetching <Link>: every photo view is an audited read.
                  <a
                    key={photo.id}
                    className="inline-flex min-h-11 items-center underline"
                    href={`/admin/support/${record.id}/attachments/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Private photo {i + 1}
                  </a>
                ))}
              </li>
            ))}
          </ol>
        </section>
        <aside className="space-y-5">
          {canWrite && (
            <section className="rounded-md border border-border bg-card p-5">
              <SupportManagement key={record.version} record={record} />
            </section>
          )}
          {record.remedy && (
            <section className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 text-h4 font-bold">Remedy</h2>
              <IncidentRemedyPanel caseId={record.id} remedy={record.remedy} />
            </section>
          )}
          {record.reviewEligibility?.length > 0 && (
            <section className="rounded-md border border-border bg-card p-5">
              <h2 className="mb-3 text-h4 font-bold">Review eligibility</h2>
              <ReviewEligibilityPanel
                caseId={record.id}
                visits={record.reviewEligibility}
                canDecide={record.canReply}
              />
            </section>
          )}
          {record.alerts?.length > 0 && (
            <section className="rounded-md border border-border bg-card p-4">
              <h2 className="text-h4 font-bold">Alert delivery</h2>
              <ul className="mt-2 space-y-2 text-tiny">
                {record.alerts.map((a) => (
                  <li key={a.id}>
                    {a.kind === 'support_urgent' ? 'Urgent' : 'No reply'} · {a.admin} ·{' '}
                    {EMAIL[a.emailState] ?? a.emailState}
                    {a.emailFailure ? ` (${a.emailFailure})` : ''} · {time(a.at)}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <details className="rounded-md border border-border p-4">
            <summary className="min-h-11 cursor-pointer">Case history</summary>
            <ul className="space-y-3">
              {(record.history || []).map((entry, i) => (
                <li key={i}>
                  {entry.action.replaceAll('_', ' ')} · {time(entry.at)}
                  {entry.after?.reason && <p>{entry.after.reason}</p>}
                </li>
              ))}
            </ul>
          </details>
          <section className="rounded-lg border border-border bg-card p-5 shadow-xs">
            <h2 className="text-h4 font-bold">Request context</h2>
            {record.orderId && capabilities.includes('admin.records.read') ? (
              <Link
                className="mt-3 inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
                href={`/admin/bookings/${record.orderId}`}
              >
                {record.context.reference} — {record.context.title}
              </Link>
            ) : null}
            {record.privacy && capabilities.includes('admin.privacy.read') ? (
              <Link
                className="mt-3 inline-flex min-h-11 items-center text-meta font-semibold text-brand-700 hover:underline"
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
            <h2 className="mb-4 text-h4 font-bold">Reply or note</h2>
            <AdminSupportComposer
              record={{
                id: record.id,
                version: record.version,
                participant: record.participant,
                from: listHref,
              }}
              replyKey={randomUUID()}
              noteKey={randomUUID()}
              canReply={canWrite && record.canReply !== false}
              noteCount={record.messages.filter((m) => m.internal).length}
            />
          </section>
        </aside>
      </div>
    </AdminPage>
  );
}
