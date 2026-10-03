import Link from '@/components/navigation/NavigationLink';
import Form from '@/components/navigation/NavigationForm';
import { ChevronRight, Plus, MessageSquare } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import Pagination from '@/components/ui/pagination';
import { ownerSupportCategories, ownerSupportStates } from '@/lib/domain/help';
export const supportTime = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export function RequestStatus({ state }) {
  return (
    <StatusBadge
      state={state}
      tone={state === 'resolved' ? 'success' : state === 'waiting_customer' ? 'warning' : 'info'}
    >
      {ownerSupportStates[state] || state}
    </StatusBadge>
  );
}
export default function RequestInbox({ data }) {
  return (
    <section>
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h1 className="text-h1 font-bold tracking-[-0.03em]">My requests</h1>
          <p className="mt-2 max-w-[60ch] text-meta leading-6 text-ink-600">
            Your conversations with Rentra, all in one place. Open a request to read replies or
            continue the conversation.
          </p>
        </div>
        <Link href="/partner/support/new" className={buttonVariants()}>
          <Plus className="size-4" aria-hidden="true" />
          New request
        </Link>
      </header>
      <Form
        action="/partner/support"
        className="mt-8 flex flex-wrap items-center justify-between gap-4"
      >
        <p className="text-meta text-ink-600">
          {data.total} {data.total === 1 ? 'request' : 'requests'}
          {data.state !== 'all' ? ' in this view' : ''}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-meta font-medium">
            Status
            <select
              className="ml-2 min-h-11 max-w-full rounded-lg border border-input bg-card px-3 text-base"
              name="state"
              defaultValue={data.state}
            >
              <option value="all">All requests</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="waiting_customer">Waiting for your reply</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <button className="min-h-11 rounded-lg border border-border bg-card px-4 text-meta font-semibold hover:bg-ink-25">
            Apply
          </button>
        </div>
      </Form>
      {data.items.length ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {data.items.map((r) => (
            <li key={r.id}>
              <Link
                href={`/partner/support/${r.id}`}
                className="flex items-center gap-4 p-5 hover:bg-ink-25 sm:p-6"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold text-ink-900">{r.subject}</span>
                    {r.unread && (
                      <span className="text-tiny font-semibold text-brand-800">Unread reply</span>
                    )}
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <RequestStatus state={r.state} />
                    <span className="text-tiny text-ink-500">
                      {ownerSupportCategories[r.category] || r.category}
                    </span>
                  </span>
                  <span className="mt-3 block text-tiny text-ink-500">
                    {r.reference} / Updated {supportTime(r.updatedAt)} IST
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-ink-500" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-card px-6 py-14 text-center">
          <MessageSquare className="mx-auto size-6 text-ink-500" aria-hidden="true" />
          <h2 className="mt-4 text-h3 font-semibold">
            {data.state === 'all' ? 'No requests yet' : 'No requests match this view'}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-meta leading-6 text-ink-600">
            {data.state === 'all'
              ? 'Send a question when you need help. Your request and Rentra replies will appear here.'
              : 'Try another status to find your conversation.'}
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand-800 hover:underline"
            href={data.state === 'all' ? '/partner/support/new' : '/partner/support'}
          >
            {data.state === 'all' ? 'Send a request' : 'Clear filters'}
          </Link>
        </div>
      )}
      <Pagination
        page={data.page}
        pageSize={20}
        total={data.total}
        pageSizes={null}
        label="Support request pages"
        noun="requests"
        className="mt-6"
      />
      <p className="mt-5 text-tiny text-ink-500">
        This is not live chat. Return here to check for a reply.
      </p>
    </section>
  );
}
