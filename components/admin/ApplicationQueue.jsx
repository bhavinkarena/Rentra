import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { AlertTriangle, Clock, Inbox, MousePointerClick, RotateCcw, UserCheck } from 'lucide-react';
import { AdminEmpty, AdminFilterBar, AdminTable, StatusBadge } from './AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import { adminDateTime } from '@/lib/domain/admin-display';
import { fieldClass } from '@/components/ui/field';
import { applicationQueueHref as queueHref } from '@/lib/domain/admin-navigation';

const STATUS = {
  submitted: 'Waiting',
  more_info_needed: 'Sent back',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Drafts',
  all: 'All',
};
const ASSIGNEE = { any: 'Anyone', me: 'Assigned to me', unassigned: 'Unassigned' };
/** Gate 1 work queue: URL-backed status, assignee, search and page. */
export default function ApplicationQueue({ data, query = {} }) {
  const here = queueHref(data, query);
  return (
    <section
      className="mt-6 overflow-hidden rounded-lg border border-border bg-card"
      aria-labelledby="queue-title"
    >
      <AdminFilterBar label="Application filters" className="border-b border-border">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="queue-title" className="text-h4 font-bold text-ink-900">
              {STATUS[data.status]} applications
            </h2>
            <p className="mt-0.5 text-tiny text-ink-500">
              {data.status === 'submitted'
                ? `Oldest first · ${data.slaHours}h service window`
                : 'Most recently changed first'}
            </p>
          </div>
          <Form
            action="/admin/applications"
            className="flex flex-wrap items-end gap-2"
            role="search"
          >
            {Object.entries(query)
              .filter(([key]) => !['status', 'assignee', 'q', 'page', 'decided'].includes(key))
              .flatMap(([key, value]) =>
                (Array.isArray(value) ? value : [value]).map((item, index) => (
                  <input key={`${key}-${index}`} type="hidden" name={key} value={item} />
                )),
              )}
            {data.status !== 'submitted' ? (
              <input type="hidden" name="status" value={data.status} />
            ) : null}
            {data.assignee !== 'any' ? (
              <input type="hidden" name="assignee" value={data.assignee} />
            ) : null}
            <label className="text-tiny font-semibold text-ink-600">
              Name or email
              <input
                name="q"
                defaultValue={data.q}
                maxLength={100}
                className={`${fieldClass} mt-1 block w-52 max-w-full`}
              />
            </label>
            <button className="min-h-11 rounded-md bg-primary px-4 text-tiny font-semibold text-white">
              Search
            </button>
          </Form>
        </div>
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {Object.entries(STATUS).map(([key, text]) => (
            <Link
              key={key}
              href={queueHref({ ...data, status: key, page: 1 }, query)}
              aria-current={data.status === key ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 text-tiny font-semibold ${
                data.status === key
                  ? 'border-brand-700 bg-primary text-white'
                  : 'border-border bg-card text-ink-700 hover:bg-ink-50'
              }`}
            >
              {text} <span className="tabular">{data.counts[key]}</span>
            </Link>
          ))}
        </nav>
        <nav aria-label="Filter by reviewer" className="flex flex-wrap gap-2">
          {Object.entries(ASSIGNEE).map(([key, text]) => (
            <Link
              key={key}
              href={queueHref({ ...data, assignee: key, page: 1 }, query)}
              aria-current={data.assignee === key ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-md border px-3 text-tiny font-semibold ${
                data.assignee === key
                  ? 'border-ink-800 bg-ink-800 text-white'
                  : 'border-border bg-card text-ink-700 hover:bg-ink-50'
              }`}
            >
              {text}
            </Link>
          ))}
        </nav>
      </AdminFilterBar>

      <AdminTable
        label="Owner applications"
        columns={['Owner', 'Submitted (IST)', 'Waiting', 'State', 'Reviewer', 'Review']}
        framed={false}
        minWidth={900}
        empty={
          !data.items.length ? (
            <AdminEmpty
              icon={Inbox}
              title={data.q ? 'No applications match this search' : 'Nothing in this view'}
              description={
                data.status === 'submitted'
                  ? 'No submitted applications are waiting for this filter.'
                  : 'Choose another status or reviewer filter.'
              }
            />
          ) : null
        }
      >
        {data.items.map((item) => (
          <tr key={item.id}>
            <th scope="row" className="min-w-56 text-left font-normal">
              <Link
                href={`/admin/applications/${item.id}?from=${encodeURIComponent(here)}`}
                className="inline-flex min-h-11 items-center font-semibold text-ink-900 hover:text-brand-700"
              >
                {item.legalName || item.email}
              </Link>
              <p className="break-all text-meta text-ink-600">
                {item.email}
                {item.clientType === 'authorised_agent' ? ' · agent' : ''}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {item.resubmission ? (
                  <StatusBadge tone="info">
                    <RotateCcw className="size-3" aria-hidden="true" />
                    Resubmitted
                  </StatusBadge>
                ) : null}
                {item.blocker ? (
                  <StatusBadge tone="danger">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {item.blocker}
                  </StatusBadge>
                ) : null}
                {item.strikeCount > 0 ? (
                  <StatusBadge tone="warning">Strike {item.strikeCount}/3</StatusBadge>
                ) : null}
                {item.ctaClicks >= 2 ? (
                  <StatusBadge tone="neutral">
                    <MousePointerClick className="size-3" aria-hidden="true" />
                    {item.ctaClicks} tries
                  </StatusBadge>
                ) : null}
              </div>
            </th>
            <td className="whitespace-nowrap">{adminDateTime(item.submittedAt)}</td>
            <td className="whitespace-nowrap">
              <span
                className={`inline-flex items-center gap-1 tabular ${item.overdue ? 'font-semibold text-danger' : 'text-ink-600'}`}
              >
                <Clock className="size-4" aria-hidden="true" />
                {item.ageHours == null
                  ? 'Not waiting'
                  : `${item.ageHours}h${item.overdue ? ' · overdue' : ''}`}
              </span>
            </td>
            <td>
              <StatusBadge domain="application" state={item.status} />
            </td>
            <td>
              <span className="inline-flex items-center gap-1">
                <UserCheck className="size-4 shrink-0" aria-hidden="true" />
                {item.assignee ? (item.assignedToMe ? 'You' : item.assignee.email) : 'Unassigned'}
              </span>
            </td>
            <td>
              <Link
                href={`/admin/applications/${item.id}?from=${encodeURIComponent(here)}`}
                aria-label={`Review application for ${item.legalName || item.email}`}
                className="inline-flex min-h-11 items-center rounded-md px-3 font-semibold text-brand-700 hover:bg-brand-50"
              >
                Review
              </Link>
            </td>
          </tr>
        ))}
      </AdminTable>

      <Pagination
        page={data.page}
        pageSize={data.pageSize}
        total={data.total}
        pages={data.pages}
        pageSizes={null}
        label="Application pages"
        noun="applications"
        className="border-t border-border px-5 py-4"
      />
    </section>
  );
}
