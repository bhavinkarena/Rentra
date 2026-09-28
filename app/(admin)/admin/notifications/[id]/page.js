import Link from '@/components/navigation/NavigationLink';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import NotificationControls from '@/components/customer/NotificationControls';
import { AdminPage, AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';
export const metadata = { title: 'Notification detail', robots: { index: false, follow: false } };
const date = (value) =>
  value ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not recorded';
export default async function Page({ params }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { data, failure } = await settle(adminApi.notification(id));
  if (failure) return <PortalState kind={failure} />;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Delivery"
        title="Notification detail"
        description="Provider acceptance and confirmed delivery are separate states. Unknown sends require reconciliation against the original SID."
      />
      <Link href="/admin/notifications" className="mt-4 inline-block text-brand-700 underline">
        Back to delivery log
      </Link>
      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <div className="flex gap-3">
          <StatusBadge tone={data.state === 'delivered' ? 'success' : 'warning'}>
            {data.state}
          </StatusBadge>
          <Link href={`/admin/bookings/${data.order_id}`} className="text-brand-700 underline">
            {data.reference}
          </Link>
        </div>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ['Template', data.template],
            ['Template version', data.templateVersion ?? 'Not recorded'],
            ['Channel', data.channel],
            ['Recipient', data.recipient ?? 'Not recorded'],
            ['Event key', data.event_key],
            ['Attempts', data.attempts],
            ['Provider SID', data.provider_id ?? 'Not recorded'],
            ['Failure code', data.failure_code ?? 'None'],
            ['Scheduled', date(data.scheduled_at)],
            ['Next attempt', date(data.next_attempt_at)],
            ['Delivered', date(data.delivered_at)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-tiny text-ink-500">{label}</dt>
              <dd className="break-all font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {admin.capabilities?.includes('admin.notifications.write') &&
        ['blocked', 'failed', 'retry', 'unknown'].includes(data.state) ? (
          <div className="mt-5 max-w-md">
            <NotificationControls id={data.id} unknown={data.state === 'unknown'} />
          </div>
        ) : null}
      </section>
      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <h2 className="font-bold">Recorded operator actions</h2>
        {data.history.length ? (
          <ul className="mt-3 space-y-2">
            {data.history.map((row, index) => (
              <li key={`${row.at}-${index}`}>
                {row.action} · {date(row.at)}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-meta">No operator actions recorded.</p>
        )}
      </section>
    </AdminPage>
  );
}
