import { ISSUE_LABELS, REMEDY_LABELS } from '@/lib/domain/stay-issue';

const when = (value) =>
  new Date(value).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });

/** Story 4.1: the read-only structured part of a stay issue, for the guest and admins. */
export function StayIssueSummary({ issue }) {
  if (!issue) return null;
  return (
    <section className="space-y-1 rounded-lg border border-border bg-card p-4 text-meta text-ink-700 sm:p-5">
      <h2 className="mb-2 flex flex-wrap items-center gap-2 font-semibold text-ink-900">
        Reported problem: {ISSUE_LABELS[issue.issueType] || issue.issueType}
        {issue.late && <LateBadge />}
      </h2>
      <p>Found {when(issue.discoveredAt)} India time</p>
      <p>
        Affected:{' '}
        {(issue.affected || [])
          .map((a) => `${a.visitReference} (${a.date})${a.roomName ? ` · ${a.roomName}` : ''}`)
          .join('; ')}
      </p>
      <p>
        Requested fix: {REMEDY_LABELS[issue.remedy] || issue.remedy}
        {issue.remedyText ? ` — ${issue.remedyText}` : ''}
      </p>
      {issue.late && <p>Reason for reporting late: {issue.lateReason}</p>}
    </section>
  );
}
export const LateBadge = () => (
  <span className="rounded-full bg-warning-bg px-2 py-0.5 text-tiny font-semibold text-warning">
    Late — needs review
  </span>
);
