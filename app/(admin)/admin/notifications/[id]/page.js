import Link from '@/components/navigation/NavigationLink';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import NotificationControls from '@/components/customer/NotificationControls';
import {
  AdminPage,
  AdminPageHeader,
  AdminReadOnly,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import { safeReturnPath } from '@/lib/domain/portal-state';
export const metadata = { title: 'Notification detail', robots: { index: false, follow: false } };
import { adminDateTime as date } from '@/lib/domain/admin-display';
import { deliveryMeta, deliveryOperation } from '@/lib/domain/admin-delivery';
export default async function Page({ params, searchParams }) {
  const listHref = safeReturnPath((await searchParams)?.from, '/admin/notifications');
  const admin = await requireAdmin();
  const { id } = await params;
  const { data, failure } = await settle(adminApi.notification(id));
  if (failure) return <PortalState kind={failure} />;
  const meta = deliveryMeta(data.state);
  const operation = deliveryOperation(data);
  return (
    <AdminPage>
      <AdminPageHeader
        title="Message delivery detail"
        description="Provider acceptance and confirmed delivery are separate states. Unknown sends require reconciliation against the original SID."
      />
      <Link
        href={listHref}
        className="mt-4 inline-flex min-h-11 items-center text-brand-700 underline"
      >
        Back to delivery log
      </Link>
      {!admin.capabilities?.includes('admin.notifications.write') && (
        <div className="mt-4">
          <AdminReadOnly />
        </div>
      )}
      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <div className="flex gap-3">
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
          {admin.capabilities?.includes('admin.records.read') ? (
            <Link
              href={`/admin/bookings/${data.order_id}`}
              className="inline-flex min-h-11 items-center text-brand-700 underline"
            >
              {data.reference}
            </Link>
          ) : (
            <p>{data.reference}</p>
          )}
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
        {admin.capabilities?.includes('admin.notifications.write') && operation ? (
          <div className="mt-5 max-w-md">
            <NotificationControls id={data.id} unknown={operation === 'reconcile'} />
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
