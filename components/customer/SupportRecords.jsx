import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import Form from '@/components/navigation/NavigationForm';
import Link from '@/components/navigation/NavigationLink';
import { randomUUID } from 'node:crypto';
import {
  supportCategories,
  supportStates,
  ownerSupportCategories,
  ownerSupportStates,
} from '@/lib/domain/help';
import { SupportReplyForm } from './SupportForms';
import { ChevronRight, MessageSquare, Plus } from 'lucide-react';
import OwnerContactStrip from '@/components/partner/OwnerContactStrip';
import { BackLink, PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBadge } from './BookingDisplay';
const link = 'inline-flex min-h-11 items-center font-semibold text-brand-700 hover:underline';
const primary = `${sharedButtonVariants({ shape: 'pill', size: 'default' })} `;
const secondary =
  'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50';
const time = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
export function SupportList({ data, admin = false, owner = false }) {
  const states = owner ? ownerSupportStates : supportStates;
  const categories = owner ? ownerSupportCategories : supportCategories;
  const base = admin ? '/admin/support' : owner ? '/partner/support' : '/support';
  return (
    <section className="mx-auto max-w-3xl">
      <PageHeader
        title={admin ? 'Support inbox' : 'Your support requests'}
        description="Requests and replies are saved here. This is not live chat. Return here to check for a reply."
        actions={
          !admin ? (
            <>
              <Link className={secondary} href={owner ? '/partner/help' : '/help'}>
                Help and contact details
              </Link>
              <Link className={primary} href={`${base}/new`}>
                <Plus className="size-4" aria-hidden="true" />
                New support request
              </Link>
            </>
          ) : null
        }
      />
      {owner && <OwnerContactStrip />}
      <Form className="flex flex-wrap items-center justify-between gap-3" action={base}>
        <p className="text-meta text-ink-600">{data.total} request(s)</p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-meta font-medium">
            Status
            <select
              className="min-h-10 max-w-48 rounded-full border border-input bg-card px-3 text-base sm:text-meta"
              name="state"
              defaultValue={data.state}
            >
              <option value="all">All</option>
              {Object.entries(states).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button className={secondary}>Filter requests</button>
        </div>
      </Form>
      {data.items.length ? (
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {data.items.map((r) => (
            <li key={r.id}>
              <Link
                href={`${base}/${r.id}`}
                className="flex items-start gap-3 p-4 transition-colors hover:bg-ink-25"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <MessageSquare className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink-900">{r.subject}</span>
                    {r.unread && (
                      <span
                        className="size-2 rounded-full bg-brand-600"
                        aria-label="Unread reply"
                      />
                    )}
                    <StateBadge state={r.state}>{states[r.state]}</StateBadge>
                  </span>
                  <span className="mt-1 block text-meta text-ink-600">
                    {categories[r.category] || supportCategories[r.category]} · Updated{' '}
                    {time(r.updatedAt)} India time
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-tiny text-ink-500">
                    {r.reference}
                  </span>
                </span>
                <ChevronRight
                  className="mt-2 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={MessageSquare}
          title={owner && data.state === 'all' ? 'No requests yet' : 'No requests match this view'}
          description={
            owner
              ? 'Questions about verification, bookings or payouts? We usually reply within 1 working day.'
              : 'Your requests and replies appear here.'
          }
          actionHref={data.state === 'all' ? `${base}/new` : base}
          actionLabel={data.state === 'all' ? 'New request' : 'Clear filters'}
        />
      )}
      {data.page > 1 || data.hasNext ? (
        <nav
          aria-label="Support request pages"
          className="mt-6 flex items-center justify-center gap-3"
        >
          {data.page > 1 ? (
            <Link className={secondary} href={`?state=${data.state}&page=${data.page - 1}`}>
              Previous
            </Link>
          ) : null}
          <span className="text-meta text-ink-600">Page {data.page}</span>
          {data.hasNext ? (
            <Link className={secondary} href={`?state=${data.state}&page=${data.page + 1}`}>
              Next
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
export function SupportDetail({ record, admin = false, owner = false }) {
  const states = owner ? ownerSupportStates : supportStates;
  const categories = owner ? ownerSupportCategories : supportCategories;
  const base = admin ? '/admin/support' : owner ? '/partner/support' : '/support';
  return (
    <article className="mx-auto max-w-3xl space-y-6 wrap-break-word">
      <header>
        <BackLink href={base}>Back to support requests</BackLink>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-h2">{record.subject}</h1>
          <StateBadge state={record.state}>{states[record.state]}</StateBadge>
        </div>
        <p className="mt-2 font-mono text-tiny break-all text-ink-500">{record.reference}</p>
      </header>
      {owner && <OwnerContactStrip />}
      <section className="space-y-1 rounded-lg border border-border bg-card p-4 text-meta text-ink-700 sm:p-5">
        <h2 className="mb-2 font-semibold text-ink-900">Request context</h2>
        <p>
          {categories[record.category] || supportCategories[record.category]} · Created{' '}
          {time(record.createdAt)} India time
        </p>
        {record.orderId ? (
          <>
            <Link
              className={link}
              href={`${admin ? '/admin' : owner ? '/partner' : ''}/bookings/${record.orderId}`}
            >
              {record.context.reference} — {record.context.title}
            </Link>
            <p>
              Accepted booking policy: {record.context.bookingPolicyVersion} ·{' '}
              {record.context.cancellationTier || 'Tier not recorded'} · {record.context.timeZone}
            </p>
            <p>
              Your booking remains unchanged by this conversation. Use the booking record to check
              its current status.
            </p>
          </>
        ) : null}
        {record.context.visitReference && (
          <p>
            Visit {record.context.visitReference} · {record.context.visitDate} ·{' '}
            {record.context.slot?.replaceAll('_', ' ')}
          </p>
        )}
        {record.privacy ? (
          <>
            <Link className={link} href={admin ? '/admin/privacy' : '/account/privacy'}>
              Linked privacy request
            </Link>
            <p>
              {record.privacy.kind === 'access' ? 'Account data copy' : 'Account deletion'} ·{' '}
              {record.privacy.state.replaceAll('_', ' ')}
            </p>
            <p>This status is separate from the support conversation.</p>
          </>
        ) : null}
        <p>
          <Link className={link} href={`/policies/terms/${record.policyVersion}`}>
            Service terms at request creation
          </Link>
        </p>
      </section>
      <p className="text-meta text-ink-600">
        Participants: {record.participant === 'client' ? 'You (owner)' : 'You (customer)'} and
        Rentra support. Other cases linked by admins keep their own private conversations.
      </p>
      {record.propertyId && (
        <Link className={link} href={`/partner/listings/${record.propertyId}`}>
          Property: {record.context.propertyTitle}
        </Link>
      )}
      <section>
        <h2 className="text-h3">Conversation</h2>
        <ol className="mt-4 space-y-3">
          {record.messages.map((m) => (
            <li key={m.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="font-semibold">{m.author}</p>
                <p className="text-tiny text-ink-500">
                  {time(m.at)} India time · {states[m.state]}
                </p>
              </div>
              <p className="mt-2 whitespace-pre-wrap wrap-break-word text-ink-800">{m.body}</p>
              {(m.attachments || []).map((photo, i) => (
                // A plain link, never a prefetching <Link>: every photo view is an audited read.
                <a
                  key={photo.id}
                  className={link}
                  href={`${base}/${record.id}/attachments/${photo.id}`}
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
      <section className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <h2 className="mb-4 text-h4">
          {record.state === 'resolved' ? 'Reply or reopen this request' : 'Add a reply'}
        </h2>
        <SupportReplyForm
          key={record.version}
          record={{ id: record.id, version: record.version, participant: record.participant }}
          requestKey={randomUUID()}
          admin={admin}
          owner={owner}
        />
      </section>
    </article>
  );
}
