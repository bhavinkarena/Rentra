import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { bookingMoney as money, bookingTime as time } from '@/lib/domain/booking-record';
import { VisitLifecycle } from './VisitLifecycle';

const linkClass = 'inline-flex min-h-11 items-center text-brand-700 underline';
const badge = 'inline-block rounded-full bg-ink-50 px-3 py-1 text-meta';
function href(base, data, changes) { return `${base}?${new URLSearchParams({ tab: data.tab, q: data.q, page: String(data.page), ...changes })}`; }

export function BookingHistory({ data, base = '/bookings', operational = false }) {
  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header><h1 className="text-h1">{operational ? 'Booking records' : 'Your bookings'}</h1><p className="mt-2">Each order keeps its original property details and individual visit statuses. Mixed orders can appear in more than one tab.</p></header>
    <form action={base} className="flex flex-wrap items-end gap-3"><input type="hidden" name="tab" value={data.tab}/><label className="min-w-0 flex-1">Search property or booking reference<input className="mt-1 block min-h-11 w-full rounded-md border border-border p-2" name="q" maxLength={100} defaultValue={data.q}/></label><button className="min-h-11 rounded-md bg-brand-700 px-4 text-white">Search</button></form>
    <nav aria-label="Booking history filters" className="flex flex-wrap gap-4">{['all', 'upcoming', 'past', 'cancelled'].map(tab => <Link key={tab} aria-current={data.tab === tab ? 'page' : undefined} className={linkClass + (data.tab === tab ? ' font-bold' : '')} href={href(base, data, { tab, page: '1' })}>{tab[0].toUpperCase() + tab.slice(1)}</Link>)}</nav>
    <p>{data.total} order{data.total === 1 ? '' : 's'} found</p>
    <ul className="space-y-4">{data.items.map(item => <li key={item.id} className="space-y-2 rounded-lg border border-border p-4">
      <Link className={linkClass + ' text-h3'} href={`${base}/${item.id}`}>{item.title}</Link><p className="break-all text-meta">{item.reference}</p>
      <div className="flex flex-wrap gap-2"><span className={badge}>Booking: {item.state}</span>{item.payments.map((p, index) => <span key={index} className={badge}>Payment ({p.environment}): {p.state}</span>)}</div>
      <p>{item.visitCount} visit{item.visitCount === 1 ? '' : 's'} · {item.visitStates.join(', ') || 'No visits recorded'}</p>
      {!item.payments.length ? <p className="text-meta">No verified payment record</p> : null}
    </li>)}</ul>
    {!data.items.length ? <p>No bookings match these filters.</p> : null}
    <nav aria-label="Booking pages" className="flex flex-wrap items-center gap-5">{data.page > 1 ? <Link className={linkClass} href={href(base, data, { page: String(data.page - 1) })}>Previous</Link> : null}<span>Page {data.page} of {data.pages}</span>{data.page < data.pages ? <Link className={linkClass} href={href(base, data, { page: String(data.page + 1) })}>Next</Link> : null}</nav>
  </div>;
}

export function BookingDetail({ record, base = '/bookings', operational = false }) {
  const test = record.payments.some(p => p.environment === 'test');
  const confirmed = record.visits.some(v => ['confirmed', 'handed_over', 'returned', 'completed', 'disputed'].includes(v.state));
  return <article className="mx-auto max-w-4xl space-y-6 break-words p-4 sm:p-6">
    <Link href={base} className={linkClass}>Back to bookings</Link>
    <header><h1 className="text-h1">{confirmed ? (test ? 'Test booking record' : 'Booking record') : 'Booking status'}</h1><h2 className="mt-2 text-h3">{record.title}</h2><p className="mt-2 break-all text-meta">{record.reference}</p><p className="mt-3"><span className={badge}>Booking: {record.state}</span></p></header>
    {test ? <p className="rounded-md bg-brand-50 p-4">Razorpay Test booking. No actual bank money was collected by the Test gateway. This record is not a real-money receipt.</p> : null}
    <a className={linkClass} href={`${base}/${record.id}/summary`}>Download booking summary (.txt)</a>
    <p><a className={linkClass} href={`${base}/${record.id}/calendar`}>Download calendar (.ics)</a></p>
    {!operational ? <p><Link className={linkClass} href={`/bookings/${record.id}/reviews`}>Review visits and see review status</Link></p> : <p><Link className={linkClass} href={base === '/admin/bookings' ? '/admin/reviews' : '/partner/reviews'}>Customer reviews</Link></p>}
    {!operational ? <p><Link className={linkClass} href={`/bookings/${record.id}/again`}>Book again with new dates</Link></p> : null}
    {!operational && record.payments.some(p => p.recoverable) ? <p><Link className={linkClass} href={`/checkout/${record.id}`}>View checkout and payment recovery</Link></p> : null}
    {!operational && test ? <p><Link className={linkClass} href={`/bookings/${record.id}/cancel`}>Cancel visits or change plans</Link></p> : null}
    {new Set(record.visits.map(v => v.state)).size > 1 ? <p className={badge}>Mixed visit statuses — check each visit below.</p> : null}
    <section><h2 className="text-h3">Customer and purpose</h2><p>{record.contact.name || 'Name not recorded'} · {record.contact.phone || 'Phone not recorded'}</p><p>{record.purpose || 'Purpose not recorded'}</p></section>
    <section><h2 className="text-h3">Accepted price</h2><p>Rent {money(record.rentMinor)} + fee {money(record.feeMinor)}</p><p>Total: {money(record.rentMinor == null || record.feeMinor == null ? null : record.rentMinor + record.feeMinor)}</p><p>Separate deposit: {money(record.depositMinor)}</p></section>
    <section><h2 className="text-h3">Visits</h2><p className="mt-2 text-meta">Times in {record.timeZone}. Separate visits do not include access between dates.</p><ul className="mt-3 space-y-4">{record.visits.map(v => <li key={v.id} className="space-y-2 rounded-lg border border-border p-4">
      <h3 className="font-semibold">{v.date} · {v.slot.replaceAll('_', ' ')} · {v.guests} guests</h3><p className="break-all text-meta">Visit {v.reference}</p><span className={badge}>{v.state}</span>
      <p>Arrival: {time(v.startsAt, record.timeZone)}<br/>Departure: {time(v.endsAt, record.timeZone)}</p>
      <p>Rent {money(v.rentMinor)} + fee {money(v.feeMinor)}</p><p>Separate deposit: {money(v.depositMinor)}</p>
      <ol aria-label={`Timeline for ${v.reference}`} className="list-inside list-disc text-meta">{v.timeline.map((event, index) => <li key={index}>{event.kind}: {time(event.at, record.timeZone)}</li>)}</ol>
      {record.arrival?.visitIds.includes(v.id) ? <p className="text-meta">Confirmed visit: arrival details below apply.</p> : null}
      {v.evidence?.length ? <ul className="text-meta">{v.evidence.map(e => <li key={e.id}>{e.kind} recorded ({e.nature}) · occurred {time(e.occurredAt, record.timeZone)}{operational ? <p>{e.note}</p> : null}</li>)}</ul> : null}
      {operational ? <VisitLifecycle key={`${v.id}-${v.version}`} requestKey={randomUUID()} visit={v} admin={base === '/admin/bookings'}/> : null}
    </li>)}</ul></section>
    <section><h2 className="text-h3">Private arrival details</h2>{record.arrival ? <div className="mt-3 space-y-2 rounded-lg bg-brand-50 p-4"><p>{record.arrival.address || 'Exact address has not been provided. Contact the host before travelling.'}</p><p>Host: {record.arrival.hostName || 'Not recorded'} · {record.arrival.hostPhone || 'Contact number not provided'}</p>{record.arrival.latitude != null && record.arrival.longitude != null ? <a className={linkClass} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(record.arrival.latitude + ',' + record.arrival.longitude)}`} rel="noreferrer" target="_blank">Open exact location in maps</a> : null}<p className="text-meta">For confirmed visits only. These are the host’s current arrival details; prices and terms above are the accepted booking record.</p></div> : <p className="mt-2">Arrival details unlock only for a confirmed visit. A payment attempt alone does not grant access.</p>}</section>
    <section><h2 className="text-h3">Payments</h2>{record.payments.map(p => <div key={p.id} className="mt-3 space-y-2 rounded-lg border border-border p-4"><span className={badge}>Payment ({p.environment}): {p.state}</span><p>{p.provider} · {p.purpose} collection</p><p className="break-all text-meta">Provider order: {p.providerOrderId || 'Not yet assigned'}</p><p>Expected {p.environment} amount: {money(p.expectedMinor)}</p><p>Verified {p.environment} capture: {money(p.capturedMinor)}</p><p>{p.environment} refunds completed: {money(p.refundedMinor)}</p><p>Actual bank collection: {money(p.actualBankMinor)}</p></div>)}{!record.payments.length ? <p>No verified payment record. Historical reported amounts are not proof of collection.</p> : null}</section>
    {record.payments.some(p => p.refunds?.length) ? <section><h2 className="text-h3">Refund obligations</h2>{record.payments.flatMap(p => (p.refunds || []).map((refund, index) => <p key={`${p.id}-${index}`}>{p.environment} refund: {refund.state} · requested {money(refund.expectedMinor)} · completed {money(refund.actualMinor)}{p.environment === 'test' ? ' · actual bank refund: ₹0' : ''}{refund.providerRefundId ? ` · provider reference: ${refund.providerRefundId}` : ''}{refund.needsReview ? ' · Reconciliation needs attention; the refund is not yet confirmed.' : ''}</p>))}</section> : null}
    <section><h2 className="text-h3">Accepted rules</h2><p>Cancellation: {record.policy.cancellationTier || 'Not recorded'} · Policy {record.policy.version || 'Not recorded'}</p><ul className="mt-2 list-inside list-disc">{record.policy.houseRules.map((rule, index) => <li key={index}>{rule}</li>)}</ul></section>
    <section><h2 className="text-h3">Order timeline</h2><ol className="mt-2 list-inside list-disc">{record.events.map((event, index) => <li key={index}>{event.kind.replaceAll('_', ' ')} · {time(event.at, record.timeZone)}</li>)}</ol>{!record.events.length ? <p>No order events were recorded for this historical booking.</p> : null}</section>
  </article>;
}
