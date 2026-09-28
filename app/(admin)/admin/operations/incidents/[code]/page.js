import Link from '@/components/navigation/NavigationLink';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { settle } from '@/lib/api/page-state';
import PortalState from '@/components/portal/PortalState';
import IncidentControls from '@/components/admin/IncidentControls';
import { AdminPage, AdminPageHeader, StatusBadge } from '@/components/admin/AdminPrimitives';

export const metadata = { title: 'Operational incident', robots: { index: false, follow: false } };
export default async function Page({ params }) {
  const admin = await requireAdmin();
  const { code } = await params;
  const { data, failure } = await settle(adminApi.incident(code));
  if (failure) return <PortalState kind={failure} />;
  const incident = data.incident;
  return (
    <AdminPage>
      <AdminPageHeader
        eyebrow="Operations"
        title={code.replaceAll('_', ' ')}
        description="Live measurement and human incident response are separate records."
      />
      <Link href="/admin/operations" className="mt-4 inline-block text-brand-700 underline">
        Back to operations
      </Link>
      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge tone={data.count ? 'danger' : 'success'}>
            {data.count ? `${data.count} measured` : 'Signal clear'}
          </StatusBadge>
          <StatusBadge tone={incident?.status === 'resolved' ? 'success' : 'warning'}>
            {incident?.status ?? 'No incident opened'}
          </StatusBadge>
        </div>
        <p className="mt-3 text-meta">
          Sampled {new Date(data.sampledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.
          Acknowledgement, assignment and snooze do not change the measured signal.
        </p>
        {incident ? (
          <p className="mt-2 text-meta">
            Assignee: {incident.assignee_name ?? 'Unassigned'} · version {incident.version}
            {incident.snoozed_until
              ? ` · snoozed until ${new Date(incident.snoozed_until).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`
              : ''}
          </p>
        ) : null}
        {data.health ? (
          <p className="mt-2 text-meta">
            Heartbeat: {data.health.stale ? 'stale' : data.health.healthy ? 'healthy' : 'failed'} ·
            last checked{' '}
            {new Date(data.health.checked_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        ) : code.endsWith('_worker_unhealthy') ? (
          <p className="mt-2 text-meta">Heartbeat missing: service health is unknown.</p>
        ) : null}
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {admin.capabilities?.includes('admin.operations.write') ? (
          <IncidentControls
            key={`${incident?.version ?? 0}-${incident?.status ?? 'none'}`}
            code={code}
            incident={incident}
            count={data.count}
            initialRequestKey={randomUUID()}
          />
        ) : (
          <p className="rounded-lg border border-border bg-card p-5">
            Read-only operations access. Incident actions require operations write permission.
          </p>
        )}
        <section className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-bold">Related records</h2>
          {data.records.length ? (
            <ul className="mt-3 space-y-2">
              {data.records.map((row) => (
                <li key={row.id}>
                  <Link href={row.href} className="break-all text-brand-700 underline">
                    {row.label}
                  </Link>{' '}
                  · {row.state}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-meta">
              No record sample for this signal. Review its measured count and service health.
            </p>
          )}
          {data.recordsLimited ? (
            <p className="mt-3 text-tiny">Showing first 25 records only.</p>
          ) : null}
        </section>
      </div>
      <section className="mt-5 rounded-lg border border-border bg-card p-5">
        <h2 className="font-bold">Incident history</h2>
        {data.events.length ? (
          <ol className="mt-3 space-y-3">
            {data.events.map((event) => (
              <li key={event.id} className="border-t border-border pt-3">
                <strong>{event.action}</strong> by {event.actor_name} ·{' '}
                {new Date(event.at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                <p className="mt-1 whitespace-pre-wrap text-meta">{event.note}</p>
                {event.details?.assigneeId ? (
                  <p className="text-tiny">Assigned operator ID: {event.details.assigneeId}</p>
                ) : null}
                {event.details?.snoozedUntil ? (
                  <p className="text-tiny">
                    Snoozed until{' '}
                    {new Date(event.details.snoozedUntil).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                    })}
                  </p>
                ) : null}
                <p className="text-tiny">
                  Measured {event.signal_count} at{' '}
                  {new Date(event.sampled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-meta">No actions recorded.</p>
        )}
      </section>
    </AdminPage>
  );
}
