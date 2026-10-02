/** One status vocabulary for every owner surface (PROP-01, DS-02). */
const STATUS_META = {
  live: {
    label: 'Live',
    hint: 'Visible to guests',
    className: 'bg-success-bg text-success ring-success/15',
    dot: 'bg-success',
  },
  pending_review: {
    label: 'In review',
    hint: 'With the Rentra team',
    className: 'bg-warning-bg text-warning ring-warning/15',
    dot: 'bg-warning',
  },
  pending_verification: {
    label: 'Verification scheduled',
    hint: 'A call or visit is being arranged',
    className: 'bg-warning-bg text-warning ring-warning/15',
    dot: 'bg-warning',
  },
  rejected: {
    label: 'Not approved',
    hint: 'Read why, fix it and resubmit',
    className: 'bg-danger-bg text-danger ring-danger/15',
    dot: 'bg-danger',
  },
  paused: {
    label: 'Paused by you',
    hint: 'Not taking new bookings',
    className: 'bg-info-bg text-info ring-info/15',
    dot: 'bg-info',
  },
  hidden: {
    label: 'Hidden by Rentra',
    hint: 'Only Rentra can restore it',
    className: 'bg-ink-100 text-ink-700 ring-ink-700/10',
    dot: 'bg-ink-500',
  },
  changes_requested: {
    label: 'Needs changes',
    hint: 'Sent back by Rentra',
    className: 'bg-warning-bg text-warning ring-warning/15',
    dot: 'bg-warning',
  },
  draft: {
    label: 'Draft',
    hint: 'Not submitted yet',
    className: 'bg-ink-100 text-ink-700 ring-ink-700/10',
    dot: 'bg-ink-500',
  },
};

/** A draft Rentra sent back is "Needs changes", not a plain draft. */
export function listingStatusMeta(status, reviewOutcome = null) {
  const key =
    status === 'draft' && reviewOutcome === 'changes_requested' ? 'changes_requested' : status;
  return (
    STATUS_META[key] ?? {
      label: status?.replace(/_/g, ' ') || 'Unknown',
      hint: 'Status unavailable',
      className: 'bg-ink-100 text-ink-700 ring-ink-700/10',
      dot: 'bg-ink-500',
    }
  );
}

export default function ListingStatusBadge({ status, reviewOutcome = null, showHint = false }) {
  const meta = listingStatusMeta(status, reviewOutcome);

  if (showHint) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className={`size-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span>
          <span className="block text-tiny font-semibold text-ink-800">{meta.label}</span>
          <span className="block text-tiny text-ink-500">{meta.hint}</span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-1 text-tiny font-bold ring-1 ring-inset ${meta.className}`}
    >
      <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
      {meta.label}
    </span>
  );
}
