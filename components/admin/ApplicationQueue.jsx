import Link from 'next/link';
import { AlertTriangle, Clock, Inbox, MousePointerClick, RotateCcw, UserCheck } from 'lucide-react';
import { AdminEmpty, Pager, StatusBadge } from './AdminPrimitives';

const STATUS = {
  submitted: 'Waiting',
  more_info_needed: 'Sent back',
  approved: 'Approved',
  rejected: 'Rejected',
  draft: 'Drafts',
  all: 'All',
};
const ASSIGNEE = { any: 'Anyone', me: 'Assigned to me', unassigned: 'Unassigned' };
const tone = (status) =>
  status === 'approved'
    ? 'success'
    : status === 'rejected'
      ? 'danger'
      : status === 'submitted'
        ? 'info'
        : 'warning';

export function queueHref({ status = 'submitted', assignee = 'any', q = '', page = 1 }) {
  const params = new URLSearchParams();
  if (status !== 'submitted') params.set('status', status);
  if (assignee !== 'any') params.set('assignee', assignee);
  if (q) params.set('q', q);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin?${query}` : '/admin';
}

/** Gate 1 work queue: URL-backed status, assignee, search and page. */
export default function ApplicationQueue({ data }) {
  const here = queueHref(data);
  return (
    <section
      className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs"
      aria-labelledby="queue-title"
    >
      <div className="space-y-4 border-b border-border p-4 sm:p-5">
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
          <form action="/admin" className="flex items-end gap-2" role="search">
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
                className="mt-1 block min-h-10 w-52 max-w-full rounded-md border border-border bg-white px-3 text-meta"
              />
            </label>
            <button className="min-h-10 rounded-md bg-brand-700 px-4 text-tiny font-semibold text-white">
              Search
            </button>
          </form>
        </div>
        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {Object.entries(STATUS).map(([key, text]) => (
            <Link
              key={key}
              href={queueHref({ ...data, status: key, page: 1 })}
              aria-current={data.status === key ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-tiny font-semibold ${
                data.status === key
                  ? 'border-brand-700 bg-brand-700 text-white'
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
              href={queueHref({ ...data, assignee: key, page: 1 })}
              aria-current={data.assignee === key ? 'page' : undefined}
              className={`inline-flex min-h-9 items-center rounded-md border px-3 text-tiny font-semibold ${
                data.assignee === key
                  ? 'border-ink-800 bg-ink-800 text-white'
                  : 'border-border bg-card text-ink-700 hover:bg-ink-50'
              }`}
            >
              {text}
            </Link>
          ))}
        </nav>
      </div>

      {data.items.length ? (
        <ul className="divide-y divide-border">
          {data.items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/admin/applications/${item.id}?from=${encodeURIComponent(here)}`}
                className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 hover:bg-ink-50 sm:px-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-semibold text-ink-900">
                    {item.legalName || item.email}
                  </span>
                  <span className="block truncate text-tiny text-ink-500">
                    {item.email}
                    {item.clientType === 'authorised_agent' ? ' · agent' : ''}
                  </span>
                </span>
                <StatusBadge tone={tone(item.status)}>
                  {STATUS[item.status] ?? item.status}
                </StatusBadge>
                {item.resubmission ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-info-bg px-2.5 py-1 text-tiny font-bold text-ink-700">
                    <RotateCcw className="size-3" aria-hidden="true" /> Resubmitted
                  </span>
                ) : null}
                {item.blocker ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2.5 py-1 text-tiny font-bold text-danger">
                    <AlertTriangle className="size-3" aria-hidden="true" /> {item.blocker}
                  </span>
                ) : null}
                {item.strikeCount > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-tiny font-bold text-amber-800">
                    strike {item.strikeCount}/3
                  </span>
                ) : null}
                {item.ctaClicks >= 2 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-tiny font-bold text-brand-700">
                    <MousePointerClick className="size-3" aria-hidden="true" /> {item.ctaClicks}{' '}
                    tries
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1 text-tiny text-ink-600">
                  <UserCheck className="size-3" aria-hidden="true" />
                  {item.assignee ? (item.assignedToMe ? 'You' : item.assignee.email) : 'Unassigned'}
                </span>
                {item.ageHours != null ? (
                  <span
                    className={`inline-flex items-center gap-1 text-tiny font-bold tabular ${item.overdue ? 'text-danger' : 'text-ink-600'}`}
                  >
                    <Clock className="size-3" aria-hidden="true" /> {item.ageHours}h
                    {item.overdue ? ' · overdue' : ''}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <AdminEmpty
          icon={Inbox}
          title={data.q ? 'No applications match this search' : 'Nothing in this view'}
          description={
            data.status === 'submitted'
              ? 'No submitted applications are waiting for this filter.'
              : 'Choose another status or reviewer filter.'
          }
        />
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4">
        <p className="text-tiny text-ink-500">
          {data.total} application{data.total === 1 ? '' : 's'} · page {data.page} of {data.pages}
        </p>
        <Pager
          page={data.page}
          hasNext={data.page < data.pages}
          previousHref={queueHref({ ...data, page: data.page - 1 })}
          nextHref={queueHref({ ...data, page: data.page + 1 })}
        />
      </footer>
    </section>
  );
}
