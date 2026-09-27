import Link from '@/components/navigation/NavigationLink';
import { DisputeForm } from './DisputeForms';
const disputeBase = (kind) =>
  kind === 'admin' ? '/admin/disputes' : kind === 'owner' ? '/partner/disputes' : '/disputes';
import { money } from '@/components/finance/Statements';
const time = (v) =>
  v ? new Date(v).toISOString().replace('T', ' ').replace('.000Z', ' UTC') : 'Not set';
export function DisputeList({ data, kind }) {
  const base = disputeBase(kind),
    f = data.filters;
  return (
    <div className="space-y-6">
      <h1 className="text-h1">Disputes and deposit cases</h1>
      <p>
        Service complaints, deposit concerns and provider disputes are separate case types. This
        workspace cannot charge a participant or submit a provider dispute.
      </p>
      <Link href={`${base}/new`}>Open a dispute</Link>
      <form className="flex flex-wrap gap-4">
        <label>
          Case status
          <select
            aria-label="Case status"
            name="state"
            defaultValue={f.state}
            className="block min-h-11 border p-2"
          >
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          Case type
          <select
            aria-label="Case type"
            name="kind"
            defaultValue={f.kind}
            className="block min-h-11 border p-2"
          >
            {['all', 'service', 'deposit', 'provider'].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded border px-4">Apply filters</button>
      </form>
      {!data.items.length && <p>No cases match these filters.</p>}
      {data.items.map((c) => (
        <article key={c.id} className="space-y-2 rounded border border-border p-4">
          <h2 className="text-h3">
            <Link href={`${base}/${c.id}`}>{c.subject}</Link>
          </h2>
          <p>
            {c.reference} · {c.kind} · {c.state}
          </p>
          {c.requested_party && (
            <p>
              Response requested from {c.requested_party} by {time(c.response_due)}
            </p>
          )}
        </article>
      ))}
      <nav aria-label="Dispute pages" className="flex gap-4">
        {f.page > 1 && (
          <Link href={`?${new URLSearchParams({ ...f, page: f.page - 1 })}`}>Previous</Link>
        )}
        {data.hasNext && (
          <Link href={`?${new URLSearchParams({ ...f, page: f.page + 1 })}`}>Next</Link>
        )}
      </nav>
    </div>
  );
}
export function NewDispute({ context, kind }) {
  return (
    <div className="space-y-5">
      <h1 className="text-h1">Open a dispute</h1>
      {context ? (
        <>
          <h2 className="text-h2">
            {context.reference} · {context.title}
          </h2>
          <DisputeForm kind={kind} command="create" context={context} />
        </>
      ) : (
        <form className="space-y-3">
          <label>
            Booking order ID
            <input
              aria-label="Booking order ID"
              name="order"
              required
              className="block min-h-11 w-full rounded border p-2"
            />
          </label>
          <p>
            Use the booking detail’s Disputes link or enter its order ID. Only your permitted
            booking can be loaded.
          </p>
          <button className="min-h-11 rounded border px-4">Load booking</button>
        </form>
      )}
    </div>
  );
}
export function DisputeDetail({ data: d, kind }) {
  const admin = kind === 'admin',
    base = disputeBase(kind),
    book = admin ? '/admin/bookings' : kind === 'owner' ? '/partner/bookings' : '/bookings';
  return (
    <div className="space-y-6">
      <Link href={base}>All disputes</Link>
      <header>
        <h1 className="text-h1">{d.subject}</h1>
        <p>
          {d.kind} dispute · {d.state} · Claim {money(d.claimedMinor)} (not an awarded amount)
        </p>
        <p>
          {d.reference} · {d.title}
        </p>
      </header>
      {d.bookingLinkAvailable && (
        <Link href={`${book}/${d.orderId}`}>Booking and visit evidence</Link>
      )}
      <section className="space-y-2 rounded border border-border p-4">
        <h2 className="text-h2">Financial evidence and limits</h2>
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
        {d.finance.allocations.map((a) => (
          <p key={a.payment_id + a.component}>
            {a.environment} · {a.component}: captured {money(a.captured_minor)}, refunded{' '}
            {money(a.refunded_minor)}, reserved {money(a.reserved_minor)}{' '}
            {admin && <Link href={`/admin/finance/payments/${a.payment_id}`}>Payment detail</Link>}
          </p>
        ))}
        {admin && (
          <Link href={`/admin/finance/refunds/new?order=${d.orderId}`}>
            Review refund in authoritative workflow
          </Link>
        )}
      </section>
      {d.requestedParty && (
        <p role="status">
          Response requested from {d.requestedParty} by {time(d.responseDue)}. A missed deadline
          does not automatically assign liability.
        </p>
      )}
      {d.state === 'resolved' && (
        <section className="space-y-2 rounded border p-4">
          <h2 className="text-h2">Recorded resolution</h2>
          <p>
            {d.outcome.replaceAll('_', ' ')} · {time(d.resolvedAt)}
          </p>
          <p className="whitespace-pre-wrap">{d.resolution}</p>
          <p>No money moved as a result of this case resolution.</p>
          <Link
            href={admin ? '/admin/support' : kind === 'owner' ? '/partner/support' : '/support'}
          >
            Contact support to appeal or escalate
          </Link>
        </section>
      )}
      <section className="space-y-4">
        <h2 className="text-h2">Responses and evidence</h2>
        <p>
          Private submissions are visible only to their author and finance staff. Shared messages
          and the resolution are visible to both participants.
        </p>
        {d.messages.map((m) => (
          <article key={m.id} className="space-y-2 rounded border border-border p-4">
            <p>
              {m.actor_kind} · {m.kind} · {m.audience} · {time(m.created_at)}
            </p>
            <p className="whitespace-pre-wrap">{m.body}</p>
            {m.attachments.map((a, i) => (
              <p key={a.id}>
                <a href={`${base}/${d.id}/attachments/${a.id}`}>
                  Download evidence photo {i + 1} ({Math.ceil(a.bytes / 1024)} KB)
                </a>
              </p>
            ))}
          </article>
        ))}
      </section>
      {d.state === 'open' && d.canWrite && (
        <>
          <h2 className="text-h2">Respond with evidence</h2>
          <DisputeForm key={'reply' + d.version} kind={kind} command="reply" record={d} />
          {admin && (
            <>
              <details>
                <summary className="min-h-11 cursor-pointer">Assignment</summary>
                <DisputeForm key={'assign' + d.version} kind={kind} command="assign" record={d} />
              </details>
              <details>
                <summary className="min-h-11 cursor-pointer">
                  Request a participant response
                </summary>
                <DisputeForm
                  key={'request' + d.version}
                  kind={kind}
                  command="request_response"
                  record={d}
                />
              </details>
              <h2 className="text-h2">Resolve case</h2>
              <DisputeForm key={'resolve' + d.version} kind={kind} command="resolve" record={d} />
            </>
          )}
        </>
      )}
    </div>
  );
}
