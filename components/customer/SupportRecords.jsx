import Link from 'next/link';
import { randomUUID } from 'node:crypto';
import { supportCategories, supportStates } from '@/lib/domain/help';
import { SupportReplyForm } from './SupportForms';
const link = 'inline-flex min-h-11 items-center text-brand-700 underline';
const time = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
export function SupportList({ data, admin = false }) {
  const base = admin ? '/admin/support' : '/support';
  return <section className="mx-auto max-w-4xl space-y-5 p-4"><h1 className="text-h1">{admin ? 'Support inbox' : 'Your support requests'}</h1>
    <p>Requests and replies are saved here. This is not live chat. Return here to check for a reply.</p>
    {!admin ? <nav className="flex flex-wrap gap-5"><Link className={link} href="/support/new">New support request</Link><Link className={link} href="/help">Help and contact details</Link></nav> : null}
    <form className="flex flex-wrap items-end gap-3" action={base}><label>Status<select className="ml-3 min-h-11 rounded border border-border p-2" name="state" defaultValue={data.state}><option value="all">All</option>{Object.entries(supportStates).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="min-h-11 rounded border border-border px-4">Filter requests</button></form>
    <p>{data.total} request(s)</p><ul className="space-y-3">{data.items.map(r => <li key={r.id} className="rounded-lg border border-border p-4"><Link className={link} href={`${base}/${r.id}`}>{r.subject}</Link><p className="break-all text-meta">{r.reference} · {supportCategories[r.category]} · {supportStates[r.state]}</p><p className="text-meta">Updated {time(r.updatedAt)} India time</p></li>)}</ul>
    {!data.items.length ? <p>No requests match this view.</p> : null}<nav aria-label="Support request pages" className="flex gap-5">{data.page > 1 ? <Link className={link} href={`?state=${data.state}&page=${data.page-1}`}>Previous</Link> : null}<span className="py-3">Page {data.page}</span>{data.hasNext ? <Link className={link} href={`?state=${data.state}&page=${data.page+1}`}>Next</Link> : null}</nav>
  </section>;
}
export function SupportDetail({ record, admin = false }) {
  const base = admin ? '/admin/support' : '/support';
  return <article className="mx-auto max-w-3xl space-y-6 break-words p-4"><Link className={link} href={base}>Back to support requests</Link><header><h1 className="text-h1">{record.subject}</h1><p className="mt-3 break-all">{record.reference} · {supportStates[record.state]}</p></header>
    <section className="rounded-lg bg-brand-50 p-4"><h2 className="font-semibold">Request context</h2><p>{supportCategories[record.category]} · Created {time(record.createdAt)} India time</p>
      {record.orderId ? <><Link className={link} href={`${admin ? '/admin' : ''}/bookings/${record.orderId}`}>{record.context.reference} — {record.context.title}</Link><p>Accepted booking policy: {record.context.bookingPolicyVersion} · {record.context.cancellationTier || 'Tier not recorded'} · {record.context.timeZone}</p><p>Your booking remains unchanged by this conversation. Use the booking record to check its current status.</p></> : null}
      {record.privacy ? <><Link className={link} href={admin ? '/admin/privacy' : '/account/privacy'}>Linked privacy request</Link><p>{record.privacy.kind === 'access' ? 'Account data copy' : 'Account deletion'} · {record.privacy.state.replaceAll('_',' ')}</p><p>This status is separate from the support conversation.</p></> : null}
      <p><Link className={link} href={`/policies/terms/${record.policyVersion}`}>Service terms at request creation</Link></p>
    </section>
    <section><h2 className="text-h3">Conversation</h2><ol className="mt-4 space-y-4">{record.messages.map(m => <li key={m.id} className="rounded-lg border border-border p-4"><p className="font-semibold">{m.author}</p><p className="text-meta">{time(m.at)} India time · {supportStates[m.state]}</p><p className="mt-3 whitespace-pre-wrap break-words">{m.body}</p></li>)}</ol></section>
    <section><h2 className="mb-4 text-h3">{record.state === 'resolved' ? 'Reply or reopen this request' : 'Add a reply'}</h2><SupportReplyForm key={record.version} record={{ id: record.id, version: record.version }} requestKey={randomUUID()} admin={admin}/></section>
  </article>;
}
