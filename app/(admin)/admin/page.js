import Link from 'next/link';
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

export const metadata = {
  title: 'Review queue',
  robots: { index: false, follow: false, nocache: true },
};

const DECIDED_MESSAGE = {
  approved: 'Approved. They can add properties now — each one still needs Gate 2.',
  more_info: 'Sent back with questions. Not counted as a strike.',
  rejected: 'Rejected. They can correct it and resubmit.',
  blocked: 'Rejected and blocked — third strike. Only a manual appeal reopens it.',
};

export default async function AdminQueuePage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const [queue, stats, recent] = await Promise.all([
    adminApi.applications({
      status: params?.status,
      assignee: params?.assignee,
      q: params?.q,
      page: params?.page,
    }),
    adminApi.applicationStats(),
    adminApi.recentDecisions(8),
  ]);
  const waiting = stats.submitted ?? 0;
  const overdue = stats.overdue ?? 0;

  return (
    <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {params?.decided && DECIDED_MESSAGE[params.decided] ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-success-bg p-4 text-meta text-brand-900">
          <CircleCheckBig className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden="true" />
          <p>{DECIDED_MESSAGE[params.decided]}</p>
        </div>
      ) : null}

      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.12em] text-brand-700 uppercase">
            Partner verification
          </p>
          <h1 className="mt-1 text-h1 text-ink-900">Review queue</h1>
          <p className="mt-2 max-w-2xl text-meta leading-6 text-ink-600">
            Review partner applications, keep decisions consistent, and make sure nothing misses the
            service window.
          </p>
        </div>
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
      </header>

      <section
        className="mt-7 grid grid-cols-2 gap-3 xl:grid-cols-4"
        aria-label="Application summary"
      >
        <Stat
          label="Waiting"
          value={waiting}
          hint="Ready for an admin decision"
          icon={FileClock}
          tone={waiting ? 'act' : 'calm'}
        />
        <Stat
          label={`Past ${SLA_HOURS}h SLA`}
          value={overdue}
          hint="Applications needing priority"
          icon={Clock}
          tone={overdue ? 'bad' : 'calm'}
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

      <ApplicationQueue data={queue} />

      {recent.length > 0 ? (
        <section className="mt-6 overflow-hidden rounded-lg border border-border bg-card shadow-xs">
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
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-tiny font-bold ${statusTone(decision.status)}`}
                >
                  {decision.status.replace(/_/g, ' ')}
                </span>
                <span className="shrink-0 text-tiny text-ink-500">
                  {decision.accountStatus}
                  {decision.adminEmail ? ` · by ${decision.adminEmail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, hint, icon: Icon, tone = 'calm' }) {
  const tones = {
    calm: 'border-border bg-card text-ink-700',
    act: 'border-brand-200 bg-brand-50 text-brand-700',
    bad: 'border-danger/25 bg-danger-bg text-danger',
    success: 'border-border bg-card text-success',
  };

  return (
    <article className={`rounded-lg border p-4 shadow-xs sm:p-5 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-tiny font-semibold text-ink-500">{label}</p>
          <p
            className="mt-1 text-[1.75rem] leading-none font-extrabold text-ink-900 tabular"
            data-money
          >
            {value}
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-md bg-white/70 ring-1 ring-current/10">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 hidden text-[0.68rem] leading-4 text-ink-500 sm:block">{hint}</p>
    </article>
  );
}

function statusTone(status) {
  if (status === 'approved') return 'bg-brand-50 text-brand-700';
  if (status === 'rejected') return 'bg-danger-bg text-danger';
  if (status === 'more_info_needed') return 'bg-amber-100 text-amber-800';
  return 'bg-ink-100 text-ink-600';
}
