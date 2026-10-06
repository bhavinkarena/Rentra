import Link from '@/components/navigation/NavigationLink';
import { ArrowUpRight } from 'lucide-react';
import { requireAdmin } from '@/lib/api/session';
import { adminApi } from '@/lib/api/endpoints';
import { SLA_HOURS } from '@/lib/constants';
import ApplicationQueue from '@/components/admin/ApplicationQueue';
import { AdminPage, AdminPageHeader } from '@/components/admin/AdminPrimitives';
import PortalState from '@/components/portal/PortalState';
import { settle } from '@/lib/api/page-state';

export const metadata = {
  title: 'Owner applications',
  robots: { index: false, follow: false, nocache: true },
};
const DECIDED_MESSAGE = {
  approved: 'Approved. They can add properties now; each property still needs its own approval.',
  more_info: 'Sent back with questions. Not counted as a strike.',
  rejected: 'Rejected. They can correct it and resubmit.',
  blocked: 'Rejected and blocked after the third strike. Only a manual appeal reopens the account.',
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
    ]),
  );
  if (failure) return <PortalState kind={failure} backHref="/admin" backLabel="Admin home" />;
  const [queue, stats] = data;
  return (
    <AdminPage>
      <AdminPageHeader
        title="Owner applications"
        description="Find the next application, review its evidence, and record a clear decision."
        action={
          <Link
            href="/admin/applications/history"
            className="inline-flex min-h-11 items-center gap-2 text-meta font-semibold text-brand-700 hover:underline"
          >
            Decision history
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        }
      />
      {DECIDED_MESSAGE[params?.decided] ? (
        <p role="status" className="mt-5 rounded-md bg-success-bg p-4 text-meta text-success">
          {DECIDED_MESSAGE[params.decided]}
        </p>
      ) : null}
      <section aria-label="All applications summary" className="mt-6 border-y border-border py-5">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-4">
          {[
            ['Waiting', stats.submitted ?? 0],
            [`Past ${SLA_HOURS}h window`, stats.overdue ?? 0],
            ['Sent back', stats.moreInfo ?? 0],
            ['Approved', stats.approved ?? 0],
          ].map(([label, count]) => (
            <div key={label} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <dt className="text-meta text-ink-600">{label}</dt>
              <dd
                className={`text-h4 font-semibold tabular ${label.startsWith('Past') && count ? 'text-danger' : 'text-ink-900'}`}
              >
                {count}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-meta text-ink-600">
          Across all applications. Queue filters below apply to the list.
        </p>
      </section>
      <ApplicationQueue data={queue} query={params} />
    </AdminPage>
  );
}
