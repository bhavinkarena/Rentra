import { AdminPage, AdminPageHeader, AdminTable } from '@/components/admin/AdminPrimitives';
import OwnerTable from '@/components/partner/OwnerTable';
import { buttonVariants as sharedButtonVariants } from '@/components/ui/button';
import Link from '@/components/navigation/NavigationLink';
import Pagination from '@/components/ui/pagination';
import { ChevronDown, ChevronRight, FileText, Plus, Scale } from 'lucide-react';
import { DisputeForm } from './DisputeForms';
import { BackLink, PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { StateBadge, displayMoney as money } from '@/components/customer/BookingDisplay';
const disputeBase = (kind) =>
  kind === 'admin' ? '/admin/disputes' : kind === 'owner' ? '/partner/disputes' : '/disputes';
// Staff read UTC to match logs; guests and owners read India time.
const timeFor = (kind) => (v) =>
  !v
    ? 'Not set'
    : kind === 'admin'
      ? new Date(v).toISOString().replace('T', ' ').replace('.000Z', ' UTC')
      : `${new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} India time`;
const words = (value) => String(value ?? '').replaceAll('_', ' ');
const card = 'rounded-lg border border-border bg-card p-4 sm:p-5';
const pill =
  'inline-flex min-h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50';
const primary = `${sharedButtonVariants({ shape: 'pill', size: 'default' })} `;
const select =
  'block min-h-10 rounded-full border border-border bg-card px-3 text-base capitalize sm:text-meta';

export function DisputeList({ data, kind, canWrite = kind !== 'admin' }) {
  const base = disputeBase(kind),
    f = data.filters,
    time = timeFor(kind);
  const EvidenceTable = kind === 'admin' ? AdminTable : OwnerTable;
  return (
    <div
      className={
        kind === 'admin'
          ? 'mx-auto max-w-(--container-workspace) space-y-6 px-4 py-6 sm:px-6 lg:px-8'
          : kind === 'owner'
            ? 'mx-auto max-w-7xl space-y-5'
            : 'mx-auto max-w-3xl'
      }
    >
      <PageHeader
        title="Disputes and deposit cases"
        description="Service complaints, deposit concerns and provider disputes are separate case types. This workspace cannot charge a participant or submit a provider dispute."
        actions={
          canWrite && (
            <Link className={primary} href={`${base}/new`}>
              <Plus className="size-4" aria-hidden="true" />
              Open a dispute
            </Link>
          )
        }
      />
      <form className="flex flex-wrap items-end gap-3">
        <label className="text-meta font-medium">
          Case status
          <select aria-label="Case status" name="state" defaultValue={f.state} className={select}>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </label>
        <label className="text-meta font-medium">
          Case type
          <select aria-label="Case type" name="kind" defaultValue={f.kind} className={select}>
            {['all', 'service', 'deposit', 'provider'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button className={pill}>Apply filters</button>
      </form>
      {data.items.length ? (
        kind === 'owner' || kind === 'admin' ? (
          <EvidenceTable
            label="Disputes"
            columns={['Subject / reference', 'Type', 'Status', 'Response due', 'Action']}
          >
            {data.items.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong className="block">{c.subject}</strong>
                  <span className="text-tiny text-ink-600">{c.reference}</span>
                </td>
                <td className="capitalize">{words(c.kind)}</td>
                <td>
                  <StateBadge state={c.state} />
                </td>
                <td>
                  {c.requested_party
                    ? `${c.requested_party === kind ? 'Your reply' : 'Reply from ' + c.requested_party} · ${time(c.response_due)}`
                    : 'No response requested'}
                </td>
                <td>
                  <Link
                    href={`${base}/${c.id}`}
                    className="inline-flex min-h-11 items-center rounded-lg border px-3 font-semibold text-brand-800"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </EvidenceTable>
        ) : (
          <ul className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link
                  href={`${base}/${c.id}`}
                  className="flex items-start gap-3 p-4 transition-colors hover:bg-ink-25"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <Scale className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-ink-900">{c.subject}</h2>
                      <StateBadge state={c.state} />
                    </div>
                    <span className="mt-1 block text-meta text-ink-600 capitalize">
                      {words(c.kind)} dispute
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-tiny text-ink-500">
                      {c.reference}
                    </span>
                    {c.requested_party && (
                      <span className="mt-1 block text-meta text-warning">
                        {kind === c.requested_party
                          ? `Rentra needs your reply by ${time(c.response_due)}`
                          : `Response requested from ${c.requested_party} by ${time(c.response_due)}`}
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    className="mt-2 size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : (
        <EmptyState
          icon={Scale}
          title={
            kind === 'owner' && f.kind === 'all' && f.state === 'open'
              ? 'No disputes'
              : 'No cases match these filters'
          }
          description="If something goes wrong with a booking, start from the booking page."
          actionHref={
            kind === 'owner' && f.kind === 'all' && f.state === 'open'
              ? '/partner/bookings'
              : `${base}?state=all&kind=all`
          }
          actionLabel={
            kind === 'owner' && f.kind === 'all' && f.state === 'open'
              ? 'Go to bookings'
              : 'Clear filters'
          }
        />
      )}
      {f.page > 1 || data.hasNext ? (
        <nav aria-label="Dispute pages" className="mt-6 flex justify-center gap-3">
          {f.page > 1 && (
            <Link className={pill} href={`?${new URLSearchParams({ ...f, page: f.page - 1 })}`}>
              Previous
            </Link>
          )}
          {data.hasNext && (
            <Link className={pill} href={`?${new URLSearchParams({ ...f, page: f.page + 1 })}`}>
              Next
            </Link>
          )}
        </nav>
      ) : null}
    </div>
  );
}
export function NewDispute({ context, kind, bookings = [], bookingPages, defaultVisitId }) {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        back={{ href: disputeBase(kind), label: 'All disputes' }}
        title="Open a dispute"
      />
      {!context && kind === 'owner' && (
        <form className="mb-4 flex gap-3">
          <label className="flex-1">
            Find a booking
            <input
              type="search"
              name="q"
              defaultValue={bookingPages?.q || ''}
              className="block min-h-11 w-full rounded-lg border p-3"
              placeholder="Booking reference or property"
            />
          </label>
          <button className={pill}>Search</button>
        </form>
      )}
      {!context && kind === 'owner' && !bookings.length && (
        <p>No bookings match. Try another reference or open a booking from your bookings list.</p>
      )}
      {context ? (
        <div className={card}>
          <h2 className="mb-4 text-h4 wrap-break-word">
            {context.reference} · {context.title}
          </h2>
          <DisputeForm
            kind={kind}
            command="create"
            context={context}
            defaultVisitId={defaultVisitId}
          />
        </div>
      ) : (
        <form className={`${card} space-y-3`}>
          <label className="block text-meta font-medium">
            Booking
            {kind === 'owner' ? (
              <select name="order" required className="mt-1 min-h-11 w-full rounded-lg border p-3">
                <option value="">Choose a booking</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.reference} · {b.title || b.propertyTitle || 'Booked property'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label="Booking order ID"
                name="order"
                required
                className="mt-1 min-h-11 w-full rounded-lg border p-3"
              />
            )}
          </label>
          <p className="text-meta text-ink-600">
            Choose the booking for this dispute. You can also start from its booking detail.
          </p>
          <button className={primary}>Load booking</button>
        </form>
      )}
      {bookingPages && (
        <Pagination
          page={bookingPages.page}
          pageSize={20}
          total={bookingPages.total}
          pages={bookingPages.pages}
          pageSizes={null}
          label="Booking picker pages"
          noun="bookings"
          className="mt-4"
        />
      )}
    </div>
  );
}
export function DisputeDetail({
  data: d,
  kind,
  canRefund = false,
  canReadRecords = kind !== 'admin',
}) {
  const admin = kind === 'admin',
    base = disputeBase(kind),
    time = timeFor(kind),
    book = admin ? '/admin/bookings' : kind === 'owner' ? '/partner/bookings' : '/bookings';
  const Container = admin ? AdminPage : 'div';
  return (
    <Container className="mx-auto max-w-3xl space-y-6 wrap-break-word">
      {admin && (
        <AdminPageHeader
          eyebrow="Finance · Dispute evidence"
          title={d.subject}
          description={`${d.reference} · ${words(d.kind)} · ${words(d.state)}`}
          backHref={base}
          backLabel="Disputes"
        />
      )}
      <header>
        {!admin && <BackLink href={base}>All disputes</BackLink>}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {!admin && <h1 className="text-h2">{d.subject}</h1>}
          <StateBadge state={d.state} />
        </div>
        <p className="mt-2 text-ink-700">
          <span className="capitalize">{words(d.kind)}</span> dispute · Claim{' '}
          <strong className="tabular">{money(d.claimedMinor)}</strong> (not an awarded amount)
        </p>
        <p className="mt-1 font-mono text-tiny break-all text-ink-500">
          {d.reference} · {d.title}
        </p>
        {d.bookingLinkAvailable && canReadRecords && (
          <Link className={`${pill} mt-3`} href={`${book}/${d.orderId}`}>
            <FileText className="size-4" aria-hidden="true" />
            Booking and visit evidence
          </Link>
        )}
      </header>
      <section className={`${card} space-y-2 text-meta text-ink-700`}>
        <h2 className="text-h4 text-ink-900">Financial evidence and limits</h2>
        <p>{d.finance.effect}</p>
        <p>{d.finance.depositNotice}</p>
        {d.kind === 'provider' && (
          <p>
            Provider dispute submission is unavailable. Recording this case does not meet a
            provider’s response deadline or submit evidence to them.
          </p>
        )}
        {!d.finance.allocations.length && (
          <p>
            No verified capture is recorded for this visit. There is no collected balance to refund.
          </p>
        )}
        {d.finance.allocations.length ? (
          <ul className="divide-y divide-border rounded-md border border-border">
            {d.finance.allocations.map((a) => (
              <li
                key={a.payment_id + a.component}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-3 py-2"
              >
                <span className="font-medium capitalize">
                  {a.environment} · {a.component}
                </span>
                <span className="tabular">
                  captured {money(a.captured_minor)}, refunded {money(a.refunded_minor)}, reserved{' '}
                  {money(a.reserved_minor)}{' '}
                  {admin && (
                    <Link
                      className="font-semibold text-brand-700 underline"
                      href={`/admin/finance/payments/${a.payment_id}`}
                    >
                      Payment detail
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        {admin && canRefund && (
          <Link
            className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline"
            href={`/admin/finance/refunds/new?order=${d.orderId}`}
          >
            Review refund in authoritative workflow
          </Link>
        )}
      </section>
      {d.claimSummary && (
        <section className={card}>
          <h2 className="text-h3">Rentra’s summary of the claim</h2>
          <p className="whitespace-pre-wrap">{d.claimSummary}</p>
        </section>
      )}
      {d.requestedParty && (
        <p role="status" className="rounded-lg bg-warning-bg p-4 text-meta text-ink-800">
          {kind === d.requestedParty
            ? `Rentra needs your reply by ${time(d.responseDue)}.`
            : `Response requested from ${d.requestedParty} by ${time(d.responseDue)}.`}{' '}
          A missed deadline does not automatically assign liability.
        </p>
      )}
      {!admin && d.state !== 'resolved' && (
        <p className="text-meta text-ink-600">
          Disputes record what happened and Rentra’s decision. They do not move money yet; any
          refund or payment is handled separately.
        </p>
      )}
      {d.state === 'resolved' && (
        <section className={`${card} space-y-2`}>
          <h2 className="text-h4">Recorded resolution</h2>
          <p className="text-meta text-ink-600">
            <span className="capitalize">{words(d.outcome)}</span> · {time(d.resolvedAt)}
          </p>
          <p className="whitespace-pre-wrap">{d.resolution}</p>
          <p className="text-meta text-ink-600">
            No money moved as a result of this case resolution.
          </p>
          <Link
            className={pill}
            href={admin ? '/admin/support' : kind === 'owner' ? '/partner/support' : '/support'}
          >
            Contact support to appeal or escalate
          </Link>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-h3">Responses and evidence</h2>
        <p className="text-meta text-ink-600">
          Private submissions are visible only to their author and finance staff. Shared messages
          and the resolution are visible to both participants.
        </p>
        {d.messages.map((m) => (
          <article key={m.id} className={`${card} space-y-2`}>
            <div className="flex flex-wrap items-center gap-2 text-tiny text-ink-500">
              <span className="text-meta font-semibold text-ink-900 capitalize">
                {words(m.actor_kind)}
              </span>
              <span className="capitalize">{words(m.kind)}</span>
              <span className="rounded-full bg-ink-100 px-2 py-0.5 font-semibold text-ink-700 capitalize">
                {words(m.audience)}
              </span>
              <span>{time(m.created_at)}</span>
            </div>
            <p className="whitespace-pre-wrap text-ink-800">{m.body}</p>
            {m.attachments.map((a, i) => (
              <p key={a.id}>
                <a
                  className="font-semibold text-brand-700 underline"
                  href={`${base}/${d.id}/attachments/${a.id}`}
                >
                  Download evidence photo {i + 1} ({Math.ceil(a.bytes / 1024)} KB)
                </a>
              </p>
            ))}
          </article>
        ))}
      </section>
      {d.state === 'open' && d.canWrite && (
        <section className={`${card} space-y-4`}>
          <h2 className="text-h4">Respond with evidence</h2>
          <DisputeForm key={'reply' + d.version} kind={kind} command="reply" record={d} />
          {admin && (
            <>
              {[
                ['assign', 'Assignment'],
                ['request_response', 'Request a participant response'],
              ].map(([command, label]) => (
                <details key={command} className="group border-t border-border pt-2">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
                    {label}
                    <ChevronDown
                      className="size-4 transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    />
                  </summary>
                  <DisputeForm key={command + d.version} kind={kind} command={command} record={d} />
                </details>
              ))}
              <h2 className="border-t border-border pt-4 text-h4">Resolve case</h2>
              <DisputeForm key={'resolve' + d.version} kind={kind} command="resolve" record={d} />
            </>
          )}
        </section>
      )}
    </Container>
  );
}
