import Link from '@/components/navigation/NavigationLink';
import { AlertTriangle, CheckCircle2, Clock3, Send } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { deliveryMeta } from '@/lib/domain/admin-delivery';
import { adminDateTime as date } from '@/lib/domain/admin-display';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import {
  AdminEmpty,
  AdminTable,
  AdminKpiCard,
  AdminPage,
  AdminPageHeader,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import Pagination from '@/components/ui/pagination';

export const metadata = { title: 'Notification delivery', robots: { index: false, follow: false } };
export default async function Monitor({ searchParams }) {
  const admin = await requireAdmin();
  const { data, failure } = await settle(
    adminApi.notifications({ page: (await searchParams)?.page || 1 }),
  );
  if (failure) return <PortalState kind={failure} />;
  const count = (state) => data.counts.find((row) => row.state === state)?.count || 0;
  const total = data.counts.reduce((sum, row) => sum + row.count, 0);
  const attention = data.counts
    .filter((row) => ['blocked', 'failed', 'undelivered', 'unknown'].includes(row.state))
    .reduce((sum, row) => sum + row.count, 0);
  return (
    <AdminPage>
      <AdminPageHeader
        title="Message delivery"
        description="Track provider handoff and resolve messages safely. Provider acceptance is not handset delivery; unknown sends must be reconciled, never resent blindly."
      />
      <section className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <AdminKpiCard
          label="Total messages"
          value={total}
          icon={Send}
          hint="Across all delivery states"
        />
        <AdminKpiCard
          label="Delivered"
          value={count('delivered')}
          icon={CheckCircle2}
          hint="Confirmed by the provider"
          tone="brand"
        />
        <AdminKpiCard
          label="Pending"
          value={count('pending') + count('retry')}
          icon={Clock3}
          hint="Queued or scheduled to retry"
          tone="warning"
        />
        <AdminKpiCard
          label="Needs attention"
          value={attention}
          icon={AlertTriangle}
          hint="Failed, blocked, or unknown"
          tone={attention ? 'danger' : 'neutral'}
        />
      </section>
      <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
        <div className="border-b border-border p-5">
          <h2 className="text-h4 font-bold">Delivery log</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {data.counts.map((row) => (
              <span
                key={row.state}
                className="rounded-full bg-ink-50 px-2.5 py-1 text-tiny font-semibold capitalize text-ink-600"
              >
                {deliveryMeta(row.state).label}: {row.count}
              </span>
            ))}
          </div>
        </div>
        <AdminTable
          framed={false}
          label="Message delivery"
          columns={[
            'Message',
            'Delivery outcome',
            'Attempts and evidence',
            'Scheduled (IST)',
            'Inspect',
          ]}
          empty={
            !data.rows.length && (
              <AdminEmpty
                icon={Send}
                title="No messages on this page"
                description="Messages appear here when queued."
              />
            )
          }
        >
          {data.rows.map((message) => {
            const meta = deliveryMeta(message.state);
            return (
              <tr key={message.id}>
                <td className="px-4 py-4">
                  <p className="font-semibold">{message.template.replaceAll('_', ' ')}</p>
                  {admin.capabilities?.includes('admin.records.read') ? (
                    <Link
                      className="inline-flex min-h-11 items-center underline"
                      href={`/admin/bookings/${message.order_id}`}
                    >
                      {message.reference}
                    </Link>
                  ) : (
                    <p>{message.reference}</p>
                  )}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                </td>
                <td className="max-w-xs break-all px-4 py-4">
                  <p>{message.attempts} attempts</p>
                  <p>{message.failure_code || 'No recorded error'}</p>
                  <p>{message.provider_id || 'No provider ID'}</p>
                </td>
                <td className="px-4 py-4">
                  <p>{date(message.scheduled_at)}</p>
                  <p>Next check: {date(message.next_attempt_at)}</p>
                </td>
                <td className="px-4 py-4">
                  <Link
                    className="inline-flex min-h-11 items-center underline"
                    href={`/admin/notifications/${message.id}?from=${encodeURIComponent(`/admin/notifications?page=${data.page}`)}`}
                  >
                    View
                    <span className="sr-only">
                      {' '}
                      {message.template.replaceAll('_', ' ')} for {message.reference}
                    </span>
                  </Link>
                </td>
              </tr>
            );
          })}
        </AdminTable>
        <Pagination
          page={data.page}
          pageSize={30}
          total={total}
          pageSizes={null}
          label="Notification pages"
          noun="notifications"
          className="border-t border-border px-5 py-4"
        />
      </section>
    </AdminPage>
  );
}
