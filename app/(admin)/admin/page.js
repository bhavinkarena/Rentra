import Link from 'next/link';
import { AlertTriangle, Clock, MousePointerClick } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import {
  getApplicationQueue, getQueueStats, getRecentDecisions, SLA_HOURS,
} from '@/lib/db/admin-queries';

export const metadata = {
  title: 'Review queue',
  robots: { index: false, follow: false, nocache: true },
};

const DECIDED_MESSAGE = {
  approved: 'Approved. They can add properties now — each one still needs Gate 2.',
  more_info: 'Sent back with questions. Not counted as a strike.',
  rejected: 'Rejected. They can correct it and resubmit.',
  blocked: 'Rejected and blocked — third strike. Only a manual appeal reopens it.',
  suspended: 'Client suspended. Confirmed bookings are still honoured.',
};

export default async function AdminQueuePage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams; // Next 16: searchParams is a Promise

  const [queue, stats, recent] = await Promise.all([
    getApplicationQueue(),
    getQueueStats(),
    getRecentDecisions(8),
  ]);

  return (
    <div className="mx-auto max-w-(--container-page) px-6 py-8">
      {params?.decided && DECIDED_MESSAGE[params.decided] ? (
        <p className="mb-6 rounded-md border-l-4 border-brand-600 bg-success-bg p-3 text-meta text-brand-900">
          {DECIDED_MESSAGE[params.decided]}
        </p>
      ) : null}

      <h1 className="text-h1">Review queue</h1>

      {/* Gap 24: queue age is published and measured, because at MVP scale
          verification throughput is what actually caps growth. */}
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Waiting" value={stats.submitted ?? 0} tone={stats.submitted ? 'act' : 'calm'} />
        <Stat label={`Past ${SLA_HOURS}h SLA`} value={stats.overdue ?? 0} tone={stats.overdue ? 'bad' : 'calm'} />
        <Stat label="Sent back" value={stats.moreInfo ?? 0} />
        <Stat label="Approved" value={stats.approved ?? 0} />
      </div>

      {queue.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card p-8 text-center text-meta text-ink-500">
          Nothing waiting. {stats.drafts ? `${stats.drafts} application${stats.drafts === 1 ? '' : 's'} still in draft.` : ''}
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {queue.map((a) => (
            <li key={a.id}>
              <Link
                href={`/admin/applications/${a.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 hover:bg-ink-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-meta font-semibold text-ink-900">
                    {a.legalName || a.email}
                  </span>
                  <span className="block truncate text-tiny text-ink-500">
                    {a.email}
                    {a.phone ? ` · +91 ${a.phone}` : ' · no phone'}
                    {a.clientType === 'authorised_agent' ? ' · agent' : ''}
                    {a.preferredLocale !== 'en' ? ` · ${a.preferredLocale}` : ''}
                  </span>
                </span>

                {a.blocker ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-danger-bg px-2.5 py-1 text-tiny font-bold text-danger">
                    <AlertTriangle className="size-3" aria-hidden="true" />
                    {a.blocker}
                  </span>
                ) : null}

                {a.strikeCount > 0 ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-tiny font-bold text-amber-700">
                    strike {a.strikeCount}/3
                  </span>
                ) : null}

                {/* Gap 12: repeated locked-CTA clicks = a property ready and
                    waiting on us. Worth jumping the queue for. */}
                {a.ctaClicks >= 2 ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-tiny font-bold text-brand-700"
                    title="Clicked the locked “Add place” button repeatedly — they have a property ready"
                  >
                    <MousePointerClick className="size-3" aria-hidden="true" />
                    {a.ctaClicks} tries
                  </span>
                ) : null}

                <span
                  className={`inline-flex shrink-0 items-center gap-1 text-tiny font-bold tabular ${
                    a.overdue ? 'text-danger' : 'text-ink-500'
                  }`}
                >
                  <Clock className="size-3" aria-hidden="true" />
                  {a.ageHours}h
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-h3">Recently decided</h2>
          <p className="mt-1 text-meta text-ink-600">
            Every decision is reversible. If one of these was a mistake, open it and suspend.
          </p>
          <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {recent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-meta">
                <Link href={`/admin/applications/${r.id}`} className="min-w-0 flex-1 truncate font-medium text-brand-700 hover:underline">
                  {r.email}
                </Link>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-tiny font-bold ${statusTone(r.status)}`}>
                  {r.status.replace(/_/g, ' ')}
                </span>
                <span className="shrink-0 text-tiny text-ink-500">
                  {r.accountStatus}
                  {r.adminEmail ? ` · by ${r.adminEmail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, tone = 'calm' }) {
  const tones = {
    calm: 'border-border bg-card text-ink-900',
    act: 'border-brand-200 bg-brand-50 text-brand-800',
    bad: 'border-danger/30 bg-danger-bg text-danger',
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <p className="text-h2 font-extrabold tabular" data-money>{value}</p>
      <p className="mt-0.5 text-tiny font-semibold tracking-wide uppercase opacity-80">{label}</p>
    </div>
  );
}

function statusTone(status) {
  if (status === 'approved') return 'bg-brand-50 text-brand-700';
  if (status === 'rejected') return 'bg-danger-bg text-danger';
  if (status === 'more_info_needed') return 'bg-amber-100 text-amber-700';
  return 'bg-ink-100 text-ink-600';
}
