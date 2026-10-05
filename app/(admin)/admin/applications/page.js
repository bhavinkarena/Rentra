import Link from '@/components/navigation/NavigationLink';
import {
  AlertTriangle,
  CheckCircle2,
  CircleCheckBig,
  Clock,
  FileClock,
  RotateCcw,
} from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { SLA_HOURS } from '@/lib/constants';
import ApplicationQueue from '@/components/admin/ApplicationQueue';
import {
  AdminPage,
  AdminPageHeader,
  AdminKpiCard as Stat,
  StatusBadge,
} from '@/components/admin/AdminPrimitives';
import PortalState from '@/components/portal/PortalState';
import { settle } from '@/lib/api/page-state';

export const metadata = {
  title: 'Owner applications',
  robots: { index: false, follow: false, nocache: true },
};

const DECIDED_MESSAGE = {
  approved: 'Approved. They can add properties now — each one still needs Gate 2.',
  more_info: 'Sent back with questions. Not counted as a strike.',
  rejected: 'Rejected. They can correct it and resubmit.',
  blocked: 'Rejected and blocked — third strike. Only a manual appeal reopens it.',
};

export default async function AdminQueuePage({ searchParams }) {
  const admin = await requireAdmin();
  if (!admin.capabilities?.includes('admin.applications.read'))
    return <PortalState kind="forbidden" backHref="/admin" backLabel="Admin home" />;
  const params = await searchParams;
  const { data, failure } = await settle(
    Promise.all([
      adminApi.applications({
        status: params?.status,
        assignee: params?.assignee,
        q: params?.q,
        page: params?.page,
      }),
      adminApi.applicationStats(),
      adminApi.recentDecisions(8),
    ]),
  );
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Admin home" />;
  const [queue, stats, recent] = data;
  const waiting = stats.submitted ?? 0;
  const overdue = stats.overdue ?? 0;

  return (
    <AdminPage>
      {params?.decided && DECIDED_MESSAGE[params.decided] ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-success-bg p-4 text-meta text-brand-900">
          <CircleCheckBig className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
          <p>{DECIDED_MESSAGE[params.decided]}</p>
        </div>
      ) : null}

      <AdminPageHeader
        title="Owner applications"
        description="Review owner applications, keep decisions consistent, and make sure nothing misses the service window."
        action={
          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-2 text-tiny font-bold ${overdue ? 'bg-danger-bg text-danger' : 'bg-brand-50 text-brand-800'}`}
          >
            {overdue ? (
              <AlertTriangle className="size-4" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            )}
            {overdue ? `${overdue} past SLA` : 'SLA on track'}
          </div>
        }
      />

      <section
        className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Application summary"
      >
        <Stat
          label="Waiting"
          value={waiting}
          hint="Ready for an admin decision"
          icon={FileClock}
          tone={waiting ? 'brand' : 'neutral'}
        />
        <Stat
          label={`Past ${SLA_HOURS}h SLA`}
          value={overdue}
          hint="Applications needing priority"
          icon={Clock}
          tone={overdue ? 'danger' : 'neutral'}
        />
        <Stat
          label="Sent back"
          value={stats.moreInfo ?? 0}
          hint="Waiting for partner updates"
          icon={RotateCcw}
        />
        <Stat
          label="Approved"
          value={stats.approved ?? 0}
          hint="Partners cleared to list"
          icon={CheckCircle2}
          tone="success"
        />
      </section>

      <ApplicationQueue data={queue} query={params} />

      {recent.length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-h4 font-bold text-ink-900">Recently decided</h2>
            <p className="mt-0.5 text-tiny text-ink-500">
              Every decision is reversible and remains available for audit
            </p>
          </div>
          <ul className="divide-y divide-border">
            {recent.map((decision) => (
              <li
                key={decision.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-meta sm:px-5"
              >
                <Link
                  href={`/admin/applications/${decision.id}`}
                  className="min-w-0 flex-1 truncate font-semibold text-ink-800 hover:text-brand-700"
                >
                  {decision.email}
                </Link>
                <StatusBadge domain="application" state={decision.status} />
                <span className="shrink-0 text-tiny text-ink-500">
                  {decision.accountStatus}
                  {decision.adminEmail ? ` · by ${decision.adminEmail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </AdminPage>
  );
}
