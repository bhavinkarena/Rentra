import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/admin';
import { sql } from '@/lib/db';
import { notificationMonitor } from '@/lib/notifications/records';
import NotificationControls from '@/components/customer/NotificationControls';
export const metadata = { title: 'Notification delivery', robots: { index: false, follow: false } };
export default async function Monitor({ searchParams }) {
  const admin = await requireAdmin(), data = await notificationMonitor(sql, admin.id, (await searchParams)?.page || 1);
  return <section className="mx-auto max-w-5xl space-y-5 p-4"><h1 className="text-h1">Notification delivery</h1><p>Provider acceptance is not handset delivery. Unknown sends need the original message SID; never send them again blindly.</p>
    <ul className="flex flex-wrap gap-3">{data.counts.map(c => <li key={c.state}>{c.state}: {c.count}</li>)}</ul>
    <ul className="space-y-3">{data.rows.map(n => <li key={n.id} className="rounded border border-border p-4"><Link className="break-all text-brand-700 underline" href={`/admin/bookings/${n.order_id}`}>{n.reference}</Link><p>{n.template} · {n.state} · {n.attempts} send attempt(s)</p><p className="break-all text-meta">{n.failure_code || 'No delivery error'} · {n.provider_id || 'No provider ID'}</p><p className="text-meta">Scheduled: {new Date(n.scheduled_at).toISOString()} · Next check: {new Date(n.next_attempt_at).toISOString()}</p>{['blocked','failed','retry','unknown'].includes(n.state) ? <NotificationControls id={n.id} unknown={n.state === 'unknown'}/> : null}</li>)}</ul>
    {!data.rows.length ? <p>No notifications on this page.</p> : null}<nav className="flex min-h-11 gap-5">{data.page > 1 ? <Link href={`?page=${data.page - 1}`}>Previous</Link> : null}<span>Page {data.page}</span>{data.hasNext ? <Link href={`?page=${data.page + 1}`}>Next</Link> : null}</nav></section>;
}
