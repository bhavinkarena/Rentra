import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Send } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import NotificationControls from '@/components/customer/NotificationControls';
import { AdminEmpty, AdminKpiCard, AdminPage, AdminPageHeader, Pager, StatusBadge } from '@/components/admin/AdminPrimitives';

export const metadata = { title: 'Notification delivery', robots: { index: false, follow: false } };
const date = (value) => value ? new Date(value).toLocaleString('en-IN', {timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'}) : 'Not scheduled';
const tone = (state) => ['delivered','sent'].includes(state)?'success':['failed','blocked','undelivered'].includes(state)?'danger':['unknown','retry'].includes(state)?'warning':'info';

export default async function Monitor({ searchParams }) {
  await requireAdmin();
  const data = await adminApi.notifications({ page: (await searchParams)?.page || 1 });
  const count = (state) => data.counts.find((row)=>row.state===state)?.count || 0;
  const total = data.counts.reduce((sum,row)=>sum+row.count,0);
  const attention = data.counts.filter((row)=>['blocked','failed','undelivered','unknown'].includes(row.state)).reduce((sum,row)=>sum+row.count,0);
  return <AdminPage><AdminPageHeader eyebrow="Messaging operations" title="Notification delivery" description="Track provider handoff and resolve messages safely. Provider acceptance is not handset delivery; unknown sends must be reconciled, never resent blindly."/>
    <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"><AdminKpiCard label="Total messages" value={total} icon={Send} hint="Across all delivery states"/><AdminKpiCard label="Delivered" value={count('delivered')} icon={CheckCircle2} hint="Confirmed by the provider" tone="brand"/><AdminKpiCard label="Pending" value={count('pending')+count('retry')} icon={Clock3} hint="Queued or scheduled to retry" tone="warning"/><AdminKpiCard label="Needs attention" value={attention} icon={AlertTriangle} hint="Failed, blocked, or unknown" tone={attention?'danger':'neutral'}/></section>
    <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs"><div className="border-b border-border p-5"><h2 className="text-h4 font-bold">Delivery log</h2><div className="mt-3 flex flex-wrap gap-2">{data.counts.map((row)=><span key={row.state} className="rounded-full bg-ink-50 px-2.5 py-1 text-[0.68rem] font-semibold capitalize text-ink-600">{row.state}: {row.count}</span>)}</div></div>
      {data.rows.length?<div className="divide-y divide-border">{data.rows.map((message)=><article key={message.id} className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px]"><div><div className="flex flex-wrap items-center gap-2"><Link className="font-semibold text-brand-700 hover:underline" href={`/admin/bookings/${message.order_id}`}>{message.reference}</Link><StatusBadge tone={tone(message.state)}>{message.state}</StatusBadge><span className="text-tiny text-ink-500">{message.attempts} attempt{message.attempts===1?'':'s'}</span></div><p className="mt-2 text-meta font-medium capitalize text-ink-800">{message.template.replaceAll('_',' ')}</p><p className="mt-2 break-all text-tiny text-ink-500">{message.failure_code||'No delivery error'} · {message.provider_id||'No provider ID'}</p><p className="mt-2 text-tiny text-ink-500">Scheduled {date(message.scheduled_at)} · Next check {date(message.next_attempt_at)}</p></div>{['blocked','failed','retry','unknown'].includes(message.state)?<div className="rounded-md border border-border bg-ink-25 p-3"><NotificationControls id={message.id} unknown={message.state==='unknown'}/></div>:null}</article>)}</div>:<AdminEmpty icon={Send} title="No notifications on this page" description="Delivery attempts will appear here as messages are queued."/>}
      <footer className="flex justify-end border-t border-border px-5 py-4"><Pager page={data.page} hasNext={data.hasNext} previousHref={`?page=${data.page-1}`} nextHref={`?page=${data.page+1}`}/></footer>
    </section></AdminPage>;
}
