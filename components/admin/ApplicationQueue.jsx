import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { ChevronRight, Inbox } from 'lucide-react';
import { AdminEmpty, StatusBadge } from './AdminPrimitives';
import Pagination from '@/components/ui/pagination';
import { adminDateTime } from '@/lib/domain/admin-display';
import { Field, Select, fieldClass } from '@/components/ui/field';
import { buttonVariants } from '@/components/ui/button';
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
export default function ApplicationQueue({ data, query = {} }) {
  const here = queueHref(data, query);
  return (
    <section className="mt-6" aria-labelledby="queue-title">
      <nav
        aria-label="Filter by status"
        className="flex gap-5 overflow-x-auto overscroll-x-contain border-b border-border"
      >
        {Object.entries(STATUS).map(([key, text]) => (
          <Link
            key={key}
            href={queueHref({ ...data, status: key, page: 1 }, query)}
            aria-current={data.status === key ? 'page' : undefined}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 border-b-2 px-1 text-meta font-semibold ${data.status === key ? 'border-brand-600 text-brand-800' : 'border-transparent text-ink-600 hover:text-ink-900'}`}
          >
            {text}
            <span className="text-meta font-normal tabular">{data.counts[key]}</span>
          </Link>
        ))}
      </nav>
      <Form
        action="/admin/applications"
        role="search"
        aria-label="Application filters"
        className="my-5 flex flex-wrap items-end gap-3"
      >
        {Object.entries(query)
          .filter(([key]) => !['status', 'assignee', 'q', 'page', 'decided'].includes(key))
          .flatMap(([key, v]) =>
            (Array.isArray(v) ? v : [v]).map((item, i) => (
              <input key={`${key}-${i}`} type="hidden" name={key} value={item} />
            )),
          )}
        {data.status !== 'submitted' ? (
          <input type="hidden" name="status" value={data.status} />
        ) : null}
        <div className="w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-96">
          <Field id="application-search" label="Name or email">
            <input
              id="application-search"
              name="q"
              defaultValue={data.q}
              maxLength={100}
              placeholder="Search applications"
              className={fieldClass}
            />
          </Field>
        </div>
        <Field id="application-reviewer" label="Reviewer">
          <Select
            id="application-reviewer"
            name="assignee"
            defaultValue={data.assignee}
            className="w-auto max-w-full"
          >
            {Object.entries(ASSIGNEE).map(([v, text]) => (
              <option key={v} value={v}>
                {text}
              </option>
            ))}
          </Select>
        </Field>
        <button className={buttonVariants({ variant: 'outline' })}>Apply filters</button>
        {data.q || data.assignee !== 'any' ? (
          <Link
            href={queueHref({ ...data, q: '', assignee: 'any', page: 1 }, query)}
            className={buttonVariants({ variant: 'ghost' })}
          >
            Clear filters
          </Link>
        ) : null}
      </Form>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="queue-title" className="text-h3 font-semibold text-ink-900">
          {STATUS[data.status]} applications
        </h2>
        <p className="text-meta text-ink-600">
          {data.status === 'submitted'
            ? `Oldest first / ${data.slaHours}h review window`
            : 'Most recently changed first'}
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {data.items.length ? (
          <ul className="divide-y divide-border">
            {data.items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/applications/${item.id}?from=${encodeURIComponent(here)}`}
                  aria-label={`Review application for ${item.legalName || item.email}`}
                  className="grid gap-4 px-5 py-5 transition-colors hover:bg-ink-25 sm:px-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold text-ink-900">
                      {item.legalName || item.email}
                    </p>
                    <p className="mt-1 break-all text-meta text-ink-600">
                      {item.email}
                      {item.clientType === 'authorised_agent' ? ' / Authorised agent' : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {item.resubmission ? (
                        <StatusBadge tone="info">Resubmitted</StatusBadge>
                      ) : null}
                      {item.blocker ? (
                        <StatusBadge tone="danger">{item.blocker}</StatusBadge>
                      ) : null}
                      {item.strikeCount > 0 ? (
                        <StatusBadge tone="warning">Strike {item.strikeCount}/3</StatusBadge>
                      ) : null}
                      {item.ctaClicks >= 2 ? (
                        <span className="text-meta text-ink-600">{item.ctaClicks} tries</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p
                      className={`text-meta tabular ${item.overdue ? 'font-semibold text-danger' : 'text-ink-700'}`}
                    >
                      {item.ageHours == null
                        ? 'Not waiting'
                        : `${item.ageHours}h waiting${item.overdue ? ' / overdue' : ''}`}
                    </p>
                    <p className="mt-1 text-meta leading-6 text-ink-600">
                      Submitted {adminDateTime(item.submittedAt)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <StatusBadge domain="application" state={item.status} />
                    <p className="mt-2 break-all text-meta text-ink-600">
                      {item.assignee
                        ? item.assignedToMe
                          ? 'Assigned to you'
                          : item.assignee.email
                        : 'Unassigned'}
                    </p>
                  </div>
                  <span className="flex items-center gap-2 text-meta font-semibold text-brand-700">
                    Review
                    <ChevronRight className="size-4" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <AdminEmpty
            icon={Inbox}
            title={data.q ? 'No applications match this search' : 'No applications in this view'}
            description={
              data.status === 'submitted'
                ? 'No submitted applications are waiting for these filters.'
                : 'Choose another status or reviewer filter.'
            }
          />
        )}
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
      </div>
    </section>
  );
}
